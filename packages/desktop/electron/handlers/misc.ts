import type { IpcMain, Dialog, BrowserWindow } from 'electron'
import type Store from 'electron-store' with { 'resolution-mode': 'import' }
import type { StoreSchema } from '../store'
import * as fs from 'fs'
import * as path from 'path'
import type { CollectedPaths } from '../ipc-types'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.tif', '.tiff'])
import { autoUpdater } from 'electron-updater'
import { isUpdateDownloaded } from '../updater'

interface MiscHandlerDeps {
  ipcMain: IpcMain
  getStore: () => Store<StoreSchema>
  getMainWindow: () => BrowserWindow | null
  getForceCloseWindow: () => boolean
  setForceCloseWindow: (v: boolean) => void
  dialog: Dialog
}

export function registerMiscHandlers({
  ipcMain,
  getStore,
  getMainWindow,
  getForceCloseWindow: _getForceCloseWindow,
  setForceCloseWindow,
  dialog,
}: MiscHandlerDeps): void {
  ipcMain.handle('show-open-dialog', async (): Promise<string[] | undefined> => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return undefined

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Image files', extensions: ['jpg', 'jpeg', 'tiff', 'tif'] }
      ]
    })

    return result.canceled ? undefined : result.filePaths
  })

  // A drop can contain folders, hidden junk and files the app cannot read.
  // The renderer cannot tell them apart — it only has names — so work it out
  // here, where the filesystem is, and report what was left behind.
  ipcMain.handle('collect-image-paths', async (_, paths: string[]): Promise<CollectedPaths> => {
    const files: string[] = []
    let folders = 0
    let unsupported = 0

    const take = (candidate: string): void => {
      if (IMAGE_EXTENSIONS.has(path.extname(candidate).toLowerCase())) {
        files.push(candidate)
      } else if (!path.basename(candidate).startsWith('.')) {
        // hidden files are dropped in silently; nobody means to add .DS_Store
        unsupported++
      }
    }

    for (const candidate of paths) {
      let stat: import('fs').Stats
      try {
        stat = await fs.promises.stat(candidate)
      } catch {
        unsupported++
        continue
      }
      if (stat.isDirectory()) {
        folders++
        try {
          const entries = await fs.promises.readdir(candidate, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.isFile()) take(path.join(candidate, entry.name))
          }
        } catch {
          // an unreadable folder counts as one skipped folder, nothing more
        }
      } else {
        take(candidate)
      }
    }

    return { files, folders, unsupported }
  })

  ipcMain.handle('force-close-window', () => {
    setForceCloseWindow(true)
    getMainWindow()?.close()
  })

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

  ipcMain.handle('get-last-used-profile', (): string | null => {
    return getStore().get('lastUsedProfile') ?? null
  })

  ipcMain.handle('set-last-used-profile', (_, profileId: string | null): void => {
    if (profileId === null) {
      getStore().delete('lastUsedProfile')
    } else {
      getStore().set('lastUsedProfile', profileId)
    }
  })

  ipcMain.handle('install-update-now', (): void => {
    if (!isUpdateDownloaded()) return
    autoUpdater.quitAndInstall()
  })
}
