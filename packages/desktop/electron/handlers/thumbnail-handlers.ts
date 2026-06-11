import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as os from 'os'
import { nativeImage } from 'electron'
import type { IpcMain } from 'electron'
import type { ExifTool } from 'exiftool-vendored'
import type Store from 'electron-store' with { 'resolution-mode': 'import' }
import type { StoreSchema } from '../store'
import { assertAbsolutePath } from './guard'

const THUMBNAIL_CACHE_DIR = path.join(os.tmpdir(), 'scancorrect-thumbs')

function ensureThumbnailCacheDir(): void {
  if (!fs.existsSync(THUMBNAIL_CACHE_DIR)) {
    fs.mkdirSync(THUMBNAIL_CACHE_DIR, { recursive: true })
  }
}

function getFilePathHash(filePath: string): string {
  return crypto.createHash('sha256').update(filePath).digest('hex')
}

interface ThumbnailHandlerDeps {
  ipcMain: IpcMain
  exiftool: ExifTool
  getStore: () => Store<StoreSchema>
}

export function registerThumbnailHandlers({ ipcMain, exiftool, getStore }: ThumbnailHandlerDeps): void {
  ipcMain.handle('extract-thumbnail', async (_, filePath: string): Promise<string | null> => {
    assertAbsolutePath(filePath)
    try {
      // 1. Embedded EXIF thumbnail/preview — present in most scanner/camera files.
      //    exiftool-vendored returns these tags as BinaryField references, so the
      //    actual bytes have to be pulled with extractBinaryTagToBuffer.
      for (const tag of ['ThumbnailImage', 'PreviewImage']) {
        try {
          const buf = await exiftool.extractBinaryTagToBuffer(tag, filePath)
          if (buf && buf.length > 0) {
            return `data:image/jpeg;base64,${buf.toString('base64')}`
          }
        } catch {
          // tag not present in this file — try the next one
        }
      }

      // 2. No embedded thumbnail: render a downscaled preview from the full image
      //    so the file still shows its actual contents instead of a generic icon.
      try {
        // OS thumbnail service — handles TIFF/HEIC/etc., but macOS + Windows only.
        const osThumb = await nativeImage.createThumbnailFromPath(filePath, { width: 320, height: 320 })
        if (!osThumb.isEmpty()) {
          return `data:image/jpeg;base64,${osThumb.toJPEG(80).toString('base64')}`
        }
      } catch {
        // createThumbnailFromPath is unsupported on Linux — fall through.
      }
      // Chromium decoder — cross-platform for JPEG/PNG.
      const img = nativeImage.createFromPath(filePath)
      if (!img.isEmpty()) {
        return `data:image/jpeg;base64,${img.resize({ height: 320 }).toJPEG(80).toString('base64')}`
      }

      return null
    } catch (error) {
      console.error('Error extracting thumbnail:', error)
      return null
    }
  })

  ipcMain.handle('get-cache-setting', (): boolean => {
    return getStore().get('thumbnailCacheEnabled', true)
  })

  ipcMain.handle('set-cache-setting', (_, enabled: boolean): void => {
    getStore().set('thumbnailCacheEnabled', enabled)
  })

  ipcMain.handle('get-cached-thumbnail', async (_, filePath: string): Promise<string | null> => {
    assertAbsolutePath(filePath)
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

  ipcMain.handle('cache-thumbnail', async (_, filePath: string, dataUrl: string): Promise<boolean> => {
    assertAbsolutePath(filePath)
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
}
