import type { IpcMain } from 'electron'
import type { ExifTool } from 'exiftool-vendored'
import type Store from 'electron-store' with { 'resolution-mode': 'import' }
import type { StoreSchema } from '../store'
import { getThumbnail } from '../thumbnails'
import { assertAbsolutePath } from './guard'

interface ThumbnailHandlerDeps {
  ipcMain: IpcMain
  exiftool: ExifTool
  getStore: () => Store<StoreSchema>
}

export function registerThumbnailHandlers({ ipcMain, exiftool, getStore }: ThumbnailHandlerDeps): void {
  ipcMain.handle('extract-thumbnail', async (_, filePath: string): Promise<string | null> => {
    assertAbsolutePath(filePath)
    const cacheEnabled = getStore().get('thumbnailCacheEnabled', true)
    return getThumbnail(filePath, exiftool, { cacheEnabled })
  })

  ipcMain.handle('get-cache-setting', (): boolean => {
    return getStore().get('thumbnailCacheEnabled', true)
  })

  ipcMain.handle('set-cache-setting', (_, enabled: boolean): void => {
    getStore().set('thumbnailCacheEnabled', enabled)
  })
}
