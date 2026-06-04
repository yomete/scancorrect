import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as crypto from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type Store from 'electron-store'
import { ExifTool } from 'exiftool-vendored'
import { geocodeLocation, GeocodingResult } from './geocoding'
import { readExifData, writeExifData, restoreFromBackup, initBackupDir, ExifData } from './exif'
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
  timestamp: string | Date
  filePath: string
  filename: string
  profileUsed?: string
  changesApplied: Partial<ExifData>
  success: boolean
  error?: string
  warning?: string
  backupPath?: string
}

interface FileSnapshot {
  size: number
  modifiedAt: string
}

interface ExifSnapshot {
  data?: ExifData
  error?: string
}

interface SpotlightReimportResult {
  attempted: boolean
  durationMs: number
  finder: FinderMetadataSnapshot
  finderVisible: boolean
  error?: string
}

interface MetadataWriteLogEntry {
  schemaVersion: 1
  event: 'metadata.write'
  timestamp: string
  appVersion: string
  filePath: string
  filename: string
  keepBackup: boolean
  requestedChanges: ExifData
  before: ExifSnapshot
  after?: ExifSnapshot
  fileBefore?: FileSnapshot
  fileAfter?: FileSnapshot
  spotlight?: SpotlightReimportResult
  durationMs: number
  result: {
    success: boolean
    backupPath?: string
    error?: string
    warning?: string
  }
}

interface FinderMetadataSnapshot {
  make?: string
  model?: string
  contentCreationDate?: string
  latitude?: string
  longitude?: string
  error?: string
}

interface FolderMetadataVerificationFile {
  filePath: string
  filename: string
  embedded: ExifSnapshot
  finder: FinderMetadataSnapshot
  embeddedPresent: boolean
  finderVisible: boolean
}

interface FolderMetadataVerificationResult {
  folderPath: string
  total: number
  embeddedPresent: number
  embeddedMissing: number
  finderVisible: number
  finderMissing: number
  logPath: string
  files: FolderMetadataVerificationFile[]
}

interface MetadataVerifyFolderLogEntry extends FolderMetadataVerificationResult {
  schemaVersion: 1
  event: 'metadata.verifyFolder'
  timestamp: string
  appVersion: string
  durationMs: number
}

interface MetadataSpotlightFollowUpLogEntry {
  schemaVersion: 1
  event: 'metadata.spotlightFollowUp'
  timestamp: string
  appVersion: string
  filePath: string
  filename: string
  delayMs: number
  spotlight: SpotlightReimportResult
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
        mapboxAccessToken: undefined
      }
    })
  }
  return storeInstance!
}

// Thumbnail cache directory
const THUMBNAIL_CACHE_DIR = path.join(os.tmpdir(), 'scancorrect-thumbs')
const execFileAsync = promisify(execFile)
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.tif', '.tiff'])

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

function getMetadataWriteLogPath(): string {
  return path.join(app.getPath('userData'), 'logs', 'metadata-writes.jsonl')
}

function shouldWriteMetadataDiagnostics(): boolean {
  return process.env.SCANCORRECT_METADATA_DIAGNOSTICS === '1' || isDev()
}

async function appendMetadataWriteLog(
  entry: MetadataWriteLogEntry | MetadataVerifyFolderLogEntry | MetadataSpotlightFollowUpLogEntry
): Promise<void> {
  const logPath = getMetadataWriteLogPath()
  await fs.promises.mkdir(path.dirname(logPath), { recursive: true })
  await fs.promises.appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8')
}

async function getFileSnapshot(filePath: string): Promise<FileSnapshot | undefined> {
  try {
    const stat = await fs.promises.stat(filePath)
    return {
      size: stat.size,
      modifiedAt: stat.mtime.toISOString()
    }
  } catch {
    return undefined
  }
}

async function getExifSnapshot(filePath: string): Promise<ExifSnapshot> {
  try {
    return { data: await readExifData(exiftool, filePath) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error reading EXIF data' }
  }
}

function hasEmbeddedMetadata(snapshot: ExifSnapshot): boolean {
  const data = snapshot.data
  if (!data) return false

  return Boolean(
    data.make ||
    data.model ||
    data.lens ||
    data.iso !== undefined ||
    data.aperture !== undefined ||
    data.shutterSpeed !== undefined ||
    data.focalLength !== undefined ||
    data.exposureComp !== undefined ||
    data.filmStock ||
    data.location ||
    data.dateOriginal ||
    data.dateTimeOriginal
  )
}

function parseMdlsValue(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '(null)') return undefined
  return trimmed.replace(/^"|"$/g, '')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getFinderMetadataSnapshot(filePath: string): Promise<FinderMetadataSnapshot> {
  if (process.platform !== 'darwin') return {}

  const keys = [
    'kMDItemAcquisitionMake',
    'kMDItemAcquisitionModel',
    'kMDItemContentCreationDate',
    'kMDItemLatitude',
    'kMDItemLongitude'
  ]

  try {
    const { stdout } = await execFileAsync('/usr/bin/mdls', [
      '-raw',
      ...keys.flatMap((key) => ['-name', key]),
      filePath
    ])
    const values = stdout.split(/\0|\r?\n/).filter((value) => value.length > 0)

    return {
      make: parseMdlsValue(values[0] || ''),
      model: parseMdlsValue(values[1] || ''),
      contentCreationDate: parseMdlsValue(values[2] || ''),
      latitude: parseMdlsValue(values[3] || ''),
      longitude: parseMdlsValue(values[4] || '')
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error reading Finder metadata' }
  }
}

function hasFinderMetadata(snapshot: FinderMetadataSnapshot): boolean {
  return Boolean(
    snapshot.make ||
    snapshot.model ||
    snapshot.contentCreationDate ||
    snapshot.latitude ||
    snapshot.longitude
  )
}

async function reimportSpotlightMetadata(filePath: string): Promise<SpotlightReimportResult> {
  const startedAt = Date.now()

  if (process.platform !== 'darwin') {
    return {
      attempted: false,
      durationMs: 0,
      finder: {},
      finderVisible: false
    }
  }

  try {
    await execFileAsync('/usr/bin/mdimport', ['-i', filePath], { timeout: 5000 })
    await sleep(500)
    const finder = await getFinderMetadataSnapshot(filePath)

    return {
      attempted: true,
      durationMs: Date.now() - startedAt,
      finder,
      finderVisible: hasFinderMetadata(finder)
    }
  } catch (error) {
    const finder = await getFinderMetadataSnapshot(filePath)

    return {
      attempted: true,
      durationMs: Date.now() - startedAt,
      finder,
      finderVisible: hasFinderMetadata(finder),
      error: error instanceof Error ? error.message : 'Unknown error reimporting Spotlight metadata'
    }
  }
}

async function triggerSpotlightImport(filePath: string): Promise<void> {
  if (process.platform !== 'darwin') return

  try {
    await execFileAsync('/usr/bin/mdimport', ['-i', filePath], { timeout: 5000 })
  } catch (error) {
    console.warn('Failed to trigger Spotlight import:', error)
  }
}

let spotlightTaskActive = false
const spotlightTasks: Array<() => Promise<void>> = []

function runNextSpotlightTask(): void {
  if (spotlightTaskActive) return

  const task = spotlightTasks.shift()
  if (!task) return

  spotlightTaskActive = true
  void task().finally(() => {
    spotlightTaskActive = false
    runNextSpotlightTask()
  })
}

function enqueueSpotlightTask(task: () => Promise<void>): void {
  spotlightTasks.push(task)
  runNextSpotlightTask()
}

function scheduleSpotlightFollowUp(filePath: string, delayMs: number, writeDiagnostics: boolean): void {
  const timeout = setTimeout(() => {
    enqueueSpotlightTask(async () => {
      try {
        if (writeDiagnostics) {
          const spotlight = await reimportSpotlightMetadata(filePath)
          await appendMetadataWriteLog({
            schemaVersion: 1,
            event: 'metadata.spotlightFollowUp',
            timestamp: new Date().toISOString(),
            appVersion: app.getVersion(),
            filePath,
            filename: path.basename(filePath),
            delayMs,
            spotlight
          })
        } else {
          await triggerSpotlightImport(filePath)
        }
      } catch (error) {
        console.warn('Failed to run Spotlight follow-up:', error)
      }
    })
  }, delayMs)

  timeout.unref?.()
}

async function verifyFolderMetadata(folderPath: string): Promise<FolderMetadataVerificationResult> {
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
  const files = entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(folderPath, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)))

  const results: FolderMetadataVerificationFile[] = []

  for (const filePath of files) {
    const embedded = await getExifSnapshot(filePath)
    const finder = await getFinderMetadataSnapshot(filePath)
    const embeddedPresent = hasEmbeddedMetadata(embedded)
    const finderVisible = hasFinderMetadata(finder)

    results.push({
      filePath,
      filename: path.basename(filePath),
      embedded,
      finder,
      embeddedPresent,
      finderVisible
    })
  }

  const embeddedPresent = results.filter((file) => file.embeddedPresent).length
  const finderVisible = results.filter((file) => file.finderVisible).length

  return {
    folderPath,
    total: results.length,
    embeddedPresent,
    embeddedMissing: results.length - embeddedPresent,
    finderVisible,
    finderMissing: results.length - finderVisible,
    logPath: getMetadataWriteLogPath(),
    files: results
  }
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
  if (process.env.NODE_ENV === 'test') {
    return false
  }
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
  // Drop the default application menu on Windows/Linux so the packaged build
  // doesn't expose View > Reload / Toggle Developer Tools to end users. macOS
  // keeps its standard app menu (needed for the Cmd+C/V edit roles).
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  }

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    // On Linux the window/taskbar icon must be set explicitly (win/mac take it
    // from the packaged executable). build/icon.png is bundled via the "files"
    // glob in package.json.
    ...(process.platform === 'linux'
      ? { icon: path.join(__dirname, '../build/icon.png') }
      : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  })

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5173')
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools()
    }
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
  initBackupDir(path.join(app.getPath('userData'), 'backups'))
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
ipcMain.handle('write-exif', async (_, filePath: string, data: ExifData): Promise<{ success: boolean; backupPath?: string; error?: string; warning?: string }> => {
  const startedAt = Date.now()
  const keepBackup = true
  const writeDiagnostics = shouldWriteMetadataDiagnostics()
  const before = writeDiagnostics ? await getExifSnapshot(filePath) : undefined
  const fileBefore = writeDiagnostics ? await getFileSnapshot(filePath) : undefined
  let result: { success: boolean; backupPath?: string; error?: string; warning?: string }
  let after: ExifSnapshot | undefined
  let fileAfter: FileSnapshot | undefined

  try {
    result = await writeExifData(exiftool, filePath, data, keepBackup)
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : 'Unknown error writing EXIF data' }
  }

  if (writeDiagnostics) {
    after = await getExifSnapshot(filePath)
    fileAfter = await getFileSnapshot(filePath)
  }

  if (result.success) {
    scheduleSpotlightFollowUp(filePath, 0, writeDiagnostics)
    scheduleSpotlightFollowUp(filePath, 30000, writeDiagnostics)
  }

  if (writeDiagnostics && before) {
    try {
      await appendMetadataWriteLog({
        schemaVersion: 1,
        event: 'metadata.write',
        timestamp: new Date().toISOString(),
        appVersion: app.getVersion(),
        filePath,
        filename: path.basename(filePath),
        keepBackup,
        requestedChanges: data,
        before,
        after,
        fileBefore,
        fileAfter,
        durationMs: Date.now() - startedAt,
        result
      })
    } catch (error) {
      console.warn('Failed to append metadata write log:', error)
    }
  }

  return result
})

ipcMain.handle('verify-folder-metadata', async (): Promise<FolderMetadataVerificationResult | { error: string }> => {
  if (!mainWindow) return { error: 'No app window available' }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Verify folder metadata'
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { error: 'Verification canceled' }
  }

  const startedAt = Date.now()
  const folderPath = result.filePaths[0]

  try {
    const verification = await verifyFolderMetadata(folderPath)

    try {
      await appendMetadataWriteLog({
        schemaVersion: 1,
        event: 'metadata.verifyFolder',
        timestamp: new Date().toISOString(),
        appVersion: app.getVersion(),
        durationMs: Date.now() - startedAt,
        ...verification
      })
    } catch (error) {
      console.warn('Failed to append metadata verification log:', error)
    }

    return verification
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error verifying folder metadata' }
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
