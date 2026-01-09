import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as crypto from 'crypto'
import type Store from 'electron-store'
import { ExifTool } from 'exiftool-vendored'
import { geocodeLocation, GeocodingResult } from './geocoding'
import { readExifData, writeExifData, restoreFromBackup, ExifData } from './exif'
import { isLikelyScannerMetadata } from './scanner-detection'
import { parseGPX, matchPhotosToGPX, GPXMatchResult } from './gpx'

interface CustomValues {
  isoValues: number[]
  apertureValues: number[]
  shutterSpeeds: number[]
  focalLengths: number[]
}

interface ProcessingLogEntry {
  id: string
  timestamp: string
  filePath: string
  filename: string
  profileUsed?: string
  changesApplied: Partial<ExifData>
  success: boolean
  error?: string
  backupPath?: string
}

interface SavedLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  createdAt: string
  usageCount: number
  lastUsedAt?: string
  isFavorite: boolean
}

interface LocationHistoryEntry {
  id: string
  location: {
    name: string
    latitude: number
    longitude: number
  }
  timestamp: string
  source: 'search' | 'map' | 'gpx' | 'manual'
}

interface GPXTrack {
  id: string
  name: string
  importedAt: string
  points: Array<{
    latitude: number
    longitude: number
    timestamp: string
    elevation?: number
  }>
}

interface StoreSchema {
  profiles: CameraProfile[]
  customValues: CustomValues
  processingLog: ProcessingLogEntry[]
  thumbnailCacheEnabled: boolean
  savedLocations: SavedLocation[]
  locationHistory: LocationHistoryEntry[]
  gpxTracks: GPXTrack[]
  userTier: 'free' | 'paid'
  mapboxAccessToken?: string
}

// Lazy-load electron-store to avoid module-level electron initialization
let storeInstance: Store<StoreSchema> | null = null
function getStore(): Store<StoreSchema> {
  if (!storeInstance) {
    // Dynamic require to avoid module-level electron initialization
    const StoreClass = require('electron-store').default
    storeInstance = new StoreClass({
      defaults: {
        profiles: [],
        customValues: {
          isoValues: [],
          apertureValues: [],
          shutterSpeeds: [],
          focalLengths: []
        },
        processingLog: [],
        thumbnailCacheEnabled: true,
        savedLocations: [],
        locationHistory: [],
        gpxTracks: [],
        userTier: 'free',
        mapboxAccessToken: undefined
      }
    })
  }
  return storeInstance!
}

// Thumbnail cache directory
const THUMBNAIL_CACHE_DIR = path.join(os.tmpdir(), 'scancorrect-thumbs')

// Ensure thumbnail cache directory exists
function ensureThumbnailCacheDir(): void {
  if (!fs.existsSync(THUMBNAIL_CACHE_DIR)) {
    fs.mkdirSync(THUMBNAIL_CACHE_DIR, { recursive: true })
  }
}

// Generate a hash for a file path to use as cache filename
function getFilePathHash(filePath: string): string {
  return crypto.createHash('sha256').update(filePath).digest('hex')
}

// Initialize ExifTool with proper configuration
const exiftool = new ExifTool({
  taskTimeoutMillis: 10000,
  maxProcs: 10
})

interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
}

let mainWindow: BrowserWindow | null = null
let forceCloseWindow = false

// Function to check dev mode - only call after app is ready
function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged
}

// Enable live reload for Electron in development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    })
  } catch (e) {
    console.log('Electron reload not available')
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  })

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle close with unsaved changes warning
  mainWindow.on('close', async (e) => {
    if (forceCloseWindow) {
      forceCloseWindow = false
      return
    }

    // Ask renderer if there are unsaved changes
    const hasUnsavedChanges = await mainWindow?.webContents.executeJavaScript(
      'window.__hasUnsavedChanges ? window.__hasUnsavedChanges() : false'
    ).catch(() => false)

    if (hasUnsavedChanges) {
      e.preventDefault()
      const { response } = await dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        buttons: ['Save & Close', 'Discard & Close', 'Cancel'],
        defaultId: 2,
        cancelId: 2,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes.',
        detail: 'Do you want to save your changes before closing?'
      })

      if (response === 0) {
        // Save & Close - trigger save, then close
        mainWindow?.webContents.send('save-before-close')
      } else if (response === 1) {
        // Discard & Close
        forceCloseWindow = true
        mainWindow?.close()
      }
      // response === 2: Cancel - do nothing
    }
  })

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
      event.preventDefault()
      shell.openExternal(navigationUrl)
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await exiftool.end()
})

// IPC Handlers
ipcMain.handle('get-profiles', (): CameraProfile[] => {
  return getStore().get('profiles', []) as CameraProfile[]
})

ipcMain.handle('save-profile', (_, profile: CameraProfile): void => {
  const profiles = getStore().get('profiles', []) as CameraProfile[]
  const existingIndex = profiles.findIndex(p => p.id === profile.id)

  if (existingIndex >= 0) {
    profiles[existingIndex] = profile
  } else {
    profiles.push(profile)
  }

  getStore().set('profiles', profiles)
})

ipcMain.handle('delete-profile', (_, profileId: string): void => {
  const profiles = getStore().get('profiles', []) as CameraProfile[]
  const filteredProfiles = profiles.filter(p => p.id !== profileId)
  getStore().set('profiles', filteredProfiles)
})

ipcMain.handle('edit-exif', async (_, filePaths: string[], profile: CameraProfile): Promise<Array<{file: string, success: boolean, error?: string}>> => {
  const results: Array<{file: string, success: boolean, error?: string}> = []
  
  for (const filePath of filePaths) {
    try {
      await editExifData(filePath, profile)
      results.push({ file: path.basename(filePath), success: true })
    } catch (error) {
      results.push({ 
        file: path.basename(filePath), 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return results
})

async function editExifData(filePath: string, profile: CameraProfile): Promise<void> {
  try {
    const tags: { [key: string]: string } = {
      Make: profile.make,
      Model: profile.model
    }

    if (profile.lens) {
      tags.LensModel = profile.lens
    }

    await exiftool.write(filePath, tags, ['-overwrite_original'])
  } catch (error) {
    console.error('ExifTool error:', error)
    throw new Error(`Failed to edit EXIF data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}


ipcMain.handle('show-open-dialog', async (): Promise<string[] | undefined> => {
  if (!mainWindow) return undefined

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Image files', extensions: ['jpg', 'jpeg', 'tiff', 'tif'] }
    ]
  })

  return result.canceled ? undefined : result.filePaths
})

// Force close window (called after save completes)
ipcMain.handle('force-close-window', () => {
  forceCloseWindow = true
  mainWindow?.close()
})

// Geocoding handler
ipcMain.handle('geocode-location', async (_, query: string): Promise<GeocodingResult[]> => {
  return geocodeLocation(query)
})

// Read EXIF data from file
ipcMain.handle('read-exif', async (_, filePath: string): Promise<{ data: ExifData; isScanner: boolean } | { error: string }> => {
  try {
    const data = await readExifData(exiftool, filePath)
    const isScanner = isLikelyScannerMetadata(data.make, data.model)
    return { data, isScanner }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error reading EXIF data' }
  }
})

// Write EXIF data to file
ipcMain.handle('write-exif', async (_, filePath: string, data: ExifData, keepBackup: boolean = true): Promise<{ success: boolean; backupPath?: string; error?: string }> => {
  try {
    return await writeExifData(exiftool, filePath, data, keepBackup)
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error writing EXIF data' }
  }
})

// Restore from backup
ipcMain.handle('restore-backup', async (_, filePath: string, backupPath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await restoreFromBackup(filePath, backupPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error restoring backup' }
  }
})

// Cleanup multiple backup files
ipcMain.handle('cleanup-backups', async (_, backupPaths: string[]): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = []

  for (const backupPath of backupPaths) {
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath)
      }
    } catch (error) {
      errors.push(`Failed to delete ${backupPath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return { success: errors.length === 0, errors }
})

// Get custom dropdown values
ipcMain.handle('get-custom-values', (): CustomValues => {
  return getStore().get('customValues', {
    isoValues: [],
    apertureValues: [],
    shutterSpeeds: [],
    focalLengths: []
  })
})

// Save a custom value to a specific field
ipcMain.handle('save-custom-value', (_, field: keyof CustomValues, value: number): void => {
  const customValues = getStore().get('customValues', {
    isoValues: [],
    apertureValues: [],
    shutterSpeeds: [],
    focalLengths: []
  })

  if (!customValues[field].includes(value)) {
    customValues[field].push(value)
    customValues[field].sort((a, b) => a - b)
    getStore().set('customValues', customValues)
  }
})

// Get processing log
ipcMain.handle('get-processing-log', (): ProcessingLogEntry[] => {
  return getStore().get('processingLog', [])
})

// Add entry to processing log
ipcMain.handle('add-log-entry', (_, entry: ProcessingLogEntry): void => {
  const log = getStore().get('processingLog', [])
  log.unshift(entry)

  // Keep only last 1000 entries to prevent unbounded growth
  if (log.length > 1000) {
    log.splice(1000)
  }

  getStore().set('processingLog', log)
})

// Clear processing log
ipcMain.handle('clear-processing-log', (): void => {
  getStore().set('processingLog', [])
})

// Thumbnail extraction and caching handlers

// Extract thumbnail from image EXIF data
ipcMain.handle('extract-thumbnail', async (_, filePath: string): Promise<string | null> => {
  try {
    const tags = await exiftool.read(filePath)
    const thumbnailData = (tags as Record<string, unknown>).ThumbnailImage || (tags as Record<string, unknown>).PreviewImage

    if (!thumbnailData) {
      return null
    }

    let base64Data: string
    const mimeType = 'image/jpeg'

    if (Buffer.isBuffer(thumbnailData)) {
      base64Data = thumbnailData.toString('base64')
    } else if (typeof thumbnailData === 'string') {
      base64Data = thumbnailData
    } else {
      return null
    }

    return `data:${mimeType};base64,${base64Data}`
  } catch (error) {
    console.error('Error extracting thumbnail:', error)
    return null
  }
})

// Get thumbnail cache enabled setting
ipcMain.handle('get-cache-setting', (): boolean => {
  return getStore().get('thumbnailCacheEnabled', true)
})

// Set thumbnail cache enabled setting
ipcMain.handle('set-cache-setting', (_, enabled: boolean): void => {
  getStore().set('thumbnailCacheEnabled', enabled)
})

// Get cached thumbnail from temp directory
ipcMain.handle('get-cached-thumbnail', async (_, filePath: string): Promise<string | null> => {
  try {
    const hash = getFilePathHash(filePath)
    const cachePath = path.join(THUMBNAIL_CACHE_DIR, `${hash}.txt`)

    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath, 'utf-8')
    }

    return null
  } catch (error) {
    console.error('Error reading cached thumbnail:', error)
    return null
  }
})

// Cache thumbnail to temp directory
ipcMain.handle('cache-thumbnail', async (_, filePath: string, dataUrl: string): Promise<boolean> => {
  try {
    ensureThumbnailCacheDir()
    const hash = getFilePathHash(filePath)
    const cachePath = path.join(THUMBNAIL_CACHE_DIR, `${hash}.txt`)
    fs.writeFileSync(cachePath, dataUrl, 'utf-8')
    return true
  } catch (error) {
    console.error('Error caching thumbnail:', error)
    return false
  }
})

// ============================================
// Saved Locations IPC Handlers
// ============================================

ipcMain.handle('get-saved-locations', (): SavedLocation[] => {
  return getStore().get('savedLocations', [])
})

ipcMain.handle('save-location', (_, location: SavedLocation): void => {
  const locations = getStore().get('savedLocations', [])
  const existingIndex = locations.findIndex(l => l.id === location.id)

  if (existingIndex >= 0) {
    locations[existingIndex] = location
  } else {
    locations.push(location)
  }

  getStore().set('savedLocations', locations)
})

ipcMain.handle('delete-saved-location', (_, locationId: string): void => {
  const locations = getStore().get('savedLocations', [])
  getStore().set('savedLocations', locations.filter(l => l.id !== locationId))
})

ipcMain.handle('increment-location-usage', (_, locationId: string): void => {
  const locations = getStore().get('savedLocations', [])
  const location = locations.find(l => l.id === locationId)
  if (location) {
    location.usageCount++
    location.lastUsedAt = new Date().toISOString()
    getStore().set('savedLocations', locations)
  }
})

// ============================================
// Location History IPC Handlers
// ============================================

ipcMain.handle('get-location-history', (): LocationHistoryEntry[] => {
  return getStore().get('locationHistory', [])
})

ipcMain.handle('add-to-location-history', (_, entry: LocationHistoryEntry): void => {
  const history = getStore().get('locationHistory', [])
  history.unshift(entry)

  // Keep only last 50 entries
  if (history.length > 50) {
    history.splice(50)
  }

  getStore().set('locationHistory', history)
})

ipcMain.handle('clear-location-history', (): void => {
  getStore().set('locationHistory', [])
})

// ============================================
// GPX Track IPC Handlers
// ============================================

ipcMain.handle('get-gpx-tracks', (): GPXTrack[] => {
  return getStore().get('gpxTracks', [])
})

ipcMain.handle('save-gpx-track', (_, track: GPXTrack): void => {
  const tracks = getStore().get('gpxTracks', [])
  tracks.push(track)
  getStore().set('gpxTracks', tracks)
})

ipcMain.handle('delete-gpx-track', (_, trackId: string): void => {
  const tracks = getStore().get('gpxTracks', [])
  getStore().set('gpxTracks', tracks.filter(t => t.id !== trackId))
})

ipcMain.handle('show-open-gpx-dialog', async (): Promise<{ filePath: string; content: string } | null> => {
  if (!mainWindow) return null

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'GPX Files', extensions: ['gpx'] }]
  })

  if (result.canceled || !result.filePaths[0]) return null

  const content = fs.readFileSync(result.filePaths[0], 'utf-8')
  return { filePath: result.filePaths[0], content }
})

ipcMain.handle('parse-gpx', async (_, content: string): Promise<GPXTrack> => {
  return parseGPX(content)
})

ipcMain.handle('match-photos-to-gpx', async (
  _,
  track: GPXTrack,
  images: Array<{ path: string; timestamp: string }>,
  toleranceSeconds: number
): Promise<GPXMatchResult[]> => {
  return matchPhotosToGPX(track, images, toleranceSeconds)
})

// ============================================
// User Tier IPC Handlers
// ============================================

ipcMain.handle('get-user-tier', (): 'free' | 'paid' => {
  return getStore().get('userTier', 'free')
})

ipcMain.handle('set-user-tier', (_, tier: 'free' | 'paid'): void => {
  getStore().set('userTier', tier)
})

// ============================================
// Mapbox Configuration IPC Handlers
// ============================================

ipcMain.handle('get-mapbox-token', (): string | undefined => {
  return getStore().get('mapboxAccessToken')
})

ipcMain.handle('set-mapbox-token', (_, token: string | undefined): void => {
  if (token) {
    getStore().set('mapboxAccessToken', token)
  } else {
    getStore().delete('mapboxAccessToken')
  }
})