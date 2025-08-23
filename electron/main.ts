import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { spawn } from 'child_process'
import * as path from 'path'
import Store from 'electron-store'

const store = new Store()

interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
}

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Enable live reload for Electron in development
if (isDev) {
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

  if (isDev) {
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

// IPC Handlers
ipcMain.handle('get-profiles', (): CameraProfile[] => {
  return store.get('profiles', []) as CameraProfile[]
})

ipcMain.handle('save-profile', (_, profile: CameraProfile): void => {
  const profiles = store.get('profiles', []) as CameraProfile[]
  const existingIndex = profiles.findIndex(p => p.id === profile.id)
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = profile
  } else {
    profiles.push(profile)
  }
  
  store.set('profiles', profiles)
})

ipcMain.handle('delete-profile', (_, profileId: string): void => {
  const profiles = store.get('profiles', []) as CameraProfile[]
  const filteredProfiles = profiles.filter(p => p.id !== profileId)
  store.set('profiles', filteredProfiles)
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

function editExifData(filePath: string, profile: CameraProfile): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-overwrite_original',
      `-Make=${profile.make}`,
      `-Model=${profile.model}`
    ]
    
    if (profile.lens) {
      args.push(`-LensModel=${profile.lens}`)
    }
    
    args.push(filePath)
    
    const exiftool = spawn('exiftool', args)
    
    let stderr = ''
    
    exiftool.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    exiftool.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ExifTool failed: ${stderr || `Exit code ${code}`}`))
      }
    })
    
    exiftool.on('error', (error) => {
      reject(new Error(`Failed to start ExifTool: ${error.message}`))
    })
  })
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