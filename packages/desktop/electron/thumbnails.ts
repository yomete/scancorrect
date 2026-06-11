import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as crypto from 'crypto'
import { nativeImage } from 'electron'
import type { ExifTool } from 'exiftool-vendored'

export const THUMBNAIL_CACHE_DIR = path.join(os.tmpdir(), 'scancorrect-thumbs')

export function ensureThumbnailCacheDir(): void {
  if (!fs.existsSync(THUMBNAIL_CACHE_DIR)) {
    fs.mkdirSync(THUMBNAIL_CACHE_DIR, { recursive: true })
  }
}

export function getFilePathHash(filePath: string): string {
  return crypto.createHash('sha256').update(filePath).digest('hex')
}

export async function extractThumbnail(filePath: string, exiftool: ExifTool): Promise<string | null> {
  try {
    // 1. Embedded EXIF thumbnail/preview — present in most scanner/camera files.
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
}

export function getCachedThumbnail(filePath: string): string | null {
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
}

export function cacheThumbnail(filePath: string, dataUrl: string): boolean {
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
}
