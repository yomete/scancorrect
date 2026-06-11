import { app, BrowserWindow, ipcMain, dialog, shell, Menu, screen } from 'electron'
import { validateWindowBounds, MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from './window-state'
import type { WindowBounds } from './window-state'
import * as path from 'path'
import { ExifTool } from 'exiftool-vendored'
import { readExifData, initBackupDir } from './exif'
import { getStore, initStore } from './store'
import { type ExifSnapshot } from './spotlight'
import { registerProfileHandlers } from './handlers/profiles'
import { registerExifHandlers } from './handlers/exif-handlers'
import { registerLocationHandlers } from './handlers/locations'
import { registerGpxHandlers } from './handlers/gpx-handlers'
import { registerThumbnailHandlers } from './handlers/thumbnail-handlers'
import { removeLegacyCacheFiles, evictCacheIfNeeded } from './thumbnails'
import { registerMiscHandlers } from './handlers/misc'
import { initAutoUpdater } from './updater'

// Initialize ExifTool with proper configuration
const exiftool = new ExifTool({
  taskTimeoutMillis: 10000,
  maxProcs: 10
})

let mainWindow: BrowserWindow | null = null
let forceCloseWindow = false

// Function to check dev mode - only call after app is ready
function isDev(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return false
  }
  return process.env.NODE_ENV === 'development' || !app.isPackaged
}

function getMetadataWriteLogPath(): string {
  return path.join(app.getPath('userData'), 'logs', 'metadata-writes.jsonl')
}

function shouldWriteMetadataDiagnostics(): boolean {
  return process.env.SCANCORRECT_METADATA_DIAGNOSTICS === '1' || isDev()
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

// Enable live reload for Electron in development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    })
  } catch (_e) {
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

  const storedBounds = getStore().get('windowBounds') as WindowBounds | undefined
  const savedBounds = storedBounds
    ? validateWindowBounds(storedBounds, screen.getAllDisplays())
    : null
  const windowSize = savedBounds ?? { width: 800, height: 600 }

  mainWindow = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
    ...(windowSize.x !== undefined && windowSize.y !== undefined
      ? { x: windowSize.x, y: windowSize.y }
      : {}),
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
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

  if (savedBounds?.isMaximized) {
    mainWindow.maximize()
  }

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

  // Persist window bounds before the window is destroyed
  mainWindow.on('close', () => {
    if (mainWindow) {
      const isMaximized = mainWindow.isMaximized()
      const bounds = mainWindow.getNormalBounds()
      getStore().set('windowBounds', {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized
      })
    }
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
    let parsedUrl: URL
    try {
      parsedUrl = new URL(navigationUrl)
    } catch {
      event.preventDefault()
      return
    }
    const isInternal =
      parsedUrl.origin === 'http://localhost:5173' || parsedUrl.protocol === 'file:'
    if (isInternal) return
    event.preventDefault()
    if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') {
      shell.openExternal(navigationUrl)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol } = new URL(url)
      if (protocol === 'https:' || protocol === 'http:') {
        shell.openExternal(url)
      }
    } catch {
      // malformed URL — drop it
    }
    return { action: 'deny' }
  })
}

function registerAllHandlers(): void {
  const getMainWindow = () => mainWindow

  registerProfileHandlers({ ipcMain, getStore })

  registerExifHandlers({
    ipcMain,
    exiftool,
    getStore,
    getMetadataWriteLogPath,
    shouldWriteMetadataDiagnostics,
    getExifSnapshot,
    hasEmbeddedMetadata,
    getAppVersion: () => app.getVersion(),
    getMainWindow,
    dialog,
  })

  registerLocationHandlers({ ipcMain, getStore })

  registerGpxHandlers({ ipcMain, getStore, getMainWindow, dialog })

  registerThumbnailHandlers({ ipcMain, exiftool, getStore })

  registerMiscHandlers({
    ipcMain,
    getStore,
    getMainWindow,
    getForceCloseWindow: () => forceCloseWindow,
    setForceCloseWindow: (v) => { forceCloseWindow = v },
    dialog,
  })
}

app.whenReady().then(async () => {
  await initStore()
  initBackupDir(path.join(app.getPath('userData'), 'backups'))
  removeLegacyCacheFiles()
  evictCacheIfNeeded()
  registerAllHandlers()
  createWindow()
  initAutoUpdater(() => mainWindow)

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
