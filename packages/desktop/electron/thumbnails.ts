import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as crypto from 'crypto'
import { nativeImage } from 'electron'
import type { ExifTool } from 'exiftool-vendored'

export const THUMBNAIL_CACHE_DIR = path.join(os.tmpdir(), 'scancorrect-thumbs')

// Eviction bounds: if cache exceeds MAX_CACHE_BYTES, delete oldest files until
// the total is below TARGET_CACHE_BYTES.
const MAX_CACHE_BYTES = 100 * 1024 * 1024  // 100 MB
const TARGET_CACHE_BYTES = 80 * 1024 * 1024 // 80 MB

export function ensureThumbnailCacheDir(): void {
  if (!fs.existsSync(THUMBNAIL_CACHE_DIR)) {
    fs.mkdirSync(THUMBNAIL_CACHE_DIR, { recursive: true })
  }
}

export function getFilePathHash(filePath: string): string {
  return crypto.createHash('sha256').update(filePath).digest('hex')
}

// Remove legacy .txt cache files left by the old renderer-side caching.
export function removeLegacyCacheFiles(): void {
  try {
    if (!fs.existsSync(THUMBNAIL_CACHE_DIR)) return
    const entries = fs.readdirSync(THUMBNAIL_CACHE_DIR)
    for (const entry of entries) {
      if (entry.endsWith('.txt')) {
        try {
          fs.unlinkSync(path.join(THUMBNAIL_CACHE_DIR, entry))
        } catch {
          // best-effort
        }
      }
    }
  } catch {
    // best-effort
  }
}

// Evict oldest files if the cache directory exceeds MAX_CACHE_BYTES.
export function evictCacheIfNeeded(): void {
  try {
    if (!fs.existsSync(THUMBNAIL_CACHE_DIR)) return
    const entries = fs.readdirSync(THUMBNAIL_CACHE_DIR)
    const files: Array<{ filePath: string; size: number; mtimeMs: number }> = []
    let totalBytes = 0

    for (const entry of entries) {
      const fullPath = path.join(THUMBNAIL_CACHE_DIR, entry)
      try {
        const stat = fs.statSync(fullPath)
        if (stat.isFile()) {
          files.push({ filePath: fullPath, size: stat.size, mtimeMs: stat.mtimeMs })
          totalBytes += stat.size
        }
      } catch {
        // file may have been removed concurrently
      }
    }

    if (totalBytes <= MAX_CACHE_BYTES) return

    // Sort oldest first (ascending mtime)
    files.sort((a, b) => a.mtimeMs - b.mtimeMs)

    for (const file of files) {
      if (totalBytes <= TARGET_CACHE_BYTES) break
      try {
        fs.unlinkSync(file.filePath)
        totalBytes -= file.size
      } catch {
        // best-effort
      }
    }
  } catch {
    // best-effort
  }
}

async function extractThumbnailFromFile(filePath: string, exiftool: ExifTool): Promise<Buffer | null> {
  // 1. Embedded EXIF thumbnail/preview — present in most scanner/camera files.
  for (const tag of ['ThumbnailImage', 'PreviewImage']) {
    try {
      const buf = await exiftool.extractBinaryTagToBuffer(tag, filePath)
      if (buf && buf.length > 0) return buf
    } catch {
      // tag not present in this file — try the next one
    }
  }

  // 2. No embedded thumbnail: render a downscaled preview from the full image.
  try {
    // OS thumbnail service — handles TIFF/HEIC/etc., but macOS + Windows only.
    const osThumb = await nativeImage.createThumbnailFromPath(filePath, { width: 320, height: 320 })
    if (!osThumb.isEmpty()) {
      return osThumb.toJPEG(80)
    }
  } catch {
    // createThumbnailFromPath is unsupported on Linux — fall through.
  }

  // Chromium decoder — cross-platform for JPEG/PNG.
  const img = nativeImage.createFromPath(filePath)
  if (!img.isEmpty()) {
    return img.resize({ height: 320 }).toJPEG(80)
  }

  return null
}

interface GetThumbnailOptions {
  cacheEnabled: boolean
}

/**
 * Get a thumbnail for the given file. If cacheEnabled:
 *   - returns cached binary .jpg on hit
 *   - extracts + writes cache on miss
 * Evicts old cache files after each write.
 * Returns a data URL or null.
 */
export async function getThumbnail(
  filePath: string,
  exiftool: ExifTool,
  { cacheEnabled }: GetThumbnailOptions
): Promise<string | null> {
  const hash = getFilePathHash(filePath)
  const cachePath = path.join(THUMBNAIL_CACHE_DIR, `${hash}.jpg`)

  // Cache hit
  if (cacheEnabled && fs.existsSync(cachePath)) {
    try {
      const buf = fs.readFileSync(cachePath)
      return `data:image/jpeg;base64,${buf.toString('base64')}`
    } catch {
      // corrupted cache entry — fall through to re-extract
    }
  }

  // Extract
  let jpegBuf: Buffer | null = null
  try {
    jpegBuf = await extractThumbnailFromFile(filePath, exiftool)
  } catch (error) {
    console.error('Error extracting thumbnail:', error)
    return null
  }

  if (!jpegBuf) return null

  // Write cache
  if (cacheEnabled) {
    try {
      ensureThumbnailCacheDir()
      fs.writeFileSync(cachePath, jpegBuf)
      evictCacheIfNeeded()
    } catch {
      // cache write failure is non-fatal
    }
  }

  return `data:image/jpeg;base64,${jpegBuf.toString('base64')}`
}
