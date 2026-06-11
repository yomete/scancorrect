import type { IpcMain, Dialog, BrowserWindow } from 'electron'
import type Store from 'electron-store' with { 'resolution-mode': 'import' }
import type { StoreSchema } from '../store'
import { autoUpdater } from 'electron-updater'

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
    autoUpdater.quitAndInstall()
  })
}
