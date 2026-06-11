import type { IpcMain, Dialog, BrowserWindow } from 'electron'
import type Store from 'electron-store'
import type { StoreSchema } from '../store'

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
}
