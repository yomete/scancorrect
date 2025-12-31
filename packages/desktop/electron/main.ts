import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import type Store from 'electron-store'
import { ExifTool } from 'exiftool-vendored'
import { geocodeLocation, GeocodingResult } from './geocoding'
import { readExifData, writeExifData, restoreFromBackup, ExifData } from './exif'
import { isLikelyScannerMetadata } from './scanner-detection'

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

interface StoreSchema {
  profiles: CameraProfile[]
  customValues: CustomValues
  processingLog: ProcessingLogEntry[]
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
        processingLog: []
      }
    })
  }
  return storeInstance!
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