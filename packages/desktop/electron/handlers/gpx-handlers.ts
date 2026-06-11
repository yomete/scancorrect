import * as fs from 'fs'
import type { IpcMain, Dialog, BrowserWindow } from 'electron'
import type Store from 'electron-store'
import { parseGPX, matchPhotosToGPX } from '../gpx'
import type { GPXTrack, GPXMatchResult } from '../ipc-types'
import type { StoreSchema } from '../store'

interface GpxHandlerDeps {
  ipcMain: IpcMain
  getStore: () => Store<StoreSchema>
  getMainWindow: () => BrowserWindow | null
  dialog: Dialog
}

export function registerGpxHandlers({ ipcMain, getStore, getMainWindow, dialog }: GpxHandlerDeps): void {
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
    const mainWindow = getMainWindow()
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
}
