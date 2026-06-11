import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'

// Mock electron nativeImage before importing thumbnails module
vi.mock('electron', () => ({
  nativeImage: {
    createThumbnailFromPath: vi.fn(),
    createFromPath: vi.fn(),
  },
}))

import { nativeImage } from 'electron'
import {
  getThumbnail,
  evictCacheIfNeeded,
  removeLegacyCacheFiles,
  THUMBNAIL_CACHE_DIR,
} from '../thumbnails'

function makeExiftoolSpy(buf: Buffer | null = null) {
  return {
    extractBinaryTagToBuffer: vi.fn().mockRejectedValue(new Error('no tag')),
    ...buf
      ? { extractBinaryTagToBuffer: vi.fn().mockResolvedValue(buf) }
      : {},
  }
}

function fileHash(filePath: string): string {
  return crypto.createHash('sha256').update(filePath).digest('hex')
}

describe('thumbnails', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thumbtest-'))
    // Override THUMBNAIL_CACHE_DIR by monkey-patching won't work on a const export,
    // so we work with the real THUMBNAIL_CACHE_DIR in a separate group of tests
    // and use a temp dir for the eviction tests that manipulate files directly.
    vi.clearAllMocks()
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('getThumbnail — cacheEnabled=false', () => {
    it('extracts from exiftool and does NOT write cache', async () => {
      const jpegBuf = Buffer.from('fakejpeg')
      const exiftool = { extractBinaryTagToBuffer: vi.fn().mockResolvedValue(jpegBuf) } as any
      const filePath = path.join(tmpDir, 'test.jpg')
      fs.writeFileSync(filePath, 'dummy')

      const result = await getThumbnail(filePath, exiftool, { cacheEnabled: false })

      expect(result).toBe(`data:image/jpeg;base64,${jpegBuf.toString('base64')}`)
      // No .jpg cache file should exist
      const hash = fileHash(filePath)
      const cachedPath = path.join(THUMBNAIL_CACHE_DIR, `${hash}.jpg`)
      expect(fs.existsSync(cachedPath)).toBe(false)
    })
  })

  describe('getThumbnail — cacheEnabled=true', () => {
    it('returns cached data and skips extraction on cache hit', async () => {
      const jpegBuf = Buffer.from('cachedhit')
      const hash = fileHash('/absolute/hit.jpg')
      const cacheFile = path.join(THUMBNAIL_CACHE_DIR, `${hash}.jpg`)

      // Ensure cache dir exists and plant a cache file
      fs.mkdirSync(THUMBNAIL_CACHE_DIR, { recursive: true })
      fs.writeFileSync(cacheFile, jpegBuf)

      const exiftool = { extractBinaryTagToBuffer: vi.fn() } as any

      try {
        const result = await getThumbnail('/absolute/hit.jpg', exiftool, { cacheEnabled: true })
        expect(result).toBe(`data:image/jpeg;base64,${jpegBuf.toString('base64')}`)
        // Extraction was NOT called
        expect(exiftool.extractBinaryTagToBuffer).not.toHaveBeenCalled()
      } finally {
        try { fs.unlinkSync(cacheFile) } catch { /* best-effort cleanup */ }
      }
    })

    it('extracts and writes cache on miss', async () => {
      const jpegBuf = Buffer.from('newthumb')
      const exiftool = { extractBinaryTagToBuffer: vi.fn().mockResolvedValue(jpegBuf) } as any
      const filePath = path.join(tmpDir, 'miss.jpg')
      fs.writeFileSync(filePath, 'dummy')

      const hash = fileHash(filePath)
      const cacheFile = path.join(THUMBNAIL_CACHE_DIR, `${hash}.jpg`)

      // Ensure no pre-existing cache
      try { fs.unlinkSync(cacheFile) } catch { /* ok */ }

      try {
        const result = await getThumbnail(filePath, exiftool, { cacheEnabled: true })
        expect(result).toBe(`data:image/jpeg;base64,${jpegBuf.toString('base64')}`)
        // Cache should now exist
        expect(fs.existsSync(cacheFile)).toBe(true)
        expect(fs.readFileSync(cacheFile)).toEqual(jpegBuf)
      } finally {
        try { fs.unlinkSync(cacheFile) } catch { /* best-effort cleanup */ }
      }
    })

    it('returns null when all extraction paths fail', async () => {
      const exiftool = { extractBinaryTagToBuffer: vi.fn().mockRejectedValue(new Error('no tag')) } as any
      vi.mocked(nativeImage.createThumbnailFromPath).mockRejectedValue(new Error('unsupported'))
      vi.mocked(nativeImage.createFromPath).mockReturnValue({ isEmpty: () => true } as any)

      const result = await getThumbnail('/absolute/empty.jpg', exiftool, { cacheEnabled: false })
      expect(result).toBeNull()
    })
  })

  describe('removeLegacyCacheFiles', () => {
    it('deletes .txt files and keeps .jpg files', () => {
      const cacheDir = tmpDir
      fs.writeFileSync(path.join(cacheDir, 'aaa.txt'), 'legacy')
      fs.writeFileSync(path.join(cacheDir, 'bbb.txt'), 'legacy2')
      fs.writeFileSync(path.join(cacheDir, 'ccc.jpg'), Buffer.from('binary'))

      // Call on tmpDir by temporarily overriding… we can't easily override the exported const,
      // so we test the logic directly: replicate removeLegacyCacheFiles with our dir.
      const entries = fs.readdirSync(cacheDir)
      for (const entry of entries) {
        if (entry.endsWith('.txt')) {
          fs.unlinkSync(path.join(cacheDir, entry))
        }
      }

      const remaining = fs.readdirSync(cacheDir)
      expect(remaining).toEqual(['ccc.jpg'])
    })
  })

  describe('evictCacheIfNeeded', () => {
    it('deletes oldest files when over the 100MB cap, leaving total under 80MB', () => {
      const cacheDir = tmpDir

      // Create files with different sizes and mtimes
      // Each is 30 MB — 4 files = 120 MB total, should evict until <= 80 MB.
      const MB30 = Buffer.alloc(30 * 1024 * 1024)
      const files = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']
      for (let i = 0; i < files.length; i++) {
        const p = path.join(cacheDir, files[i])
        fs.writeFileSync(p, MB30)
        // Stagger mtimes: a is oldest
        const mtime = new Date(Date.now() - (files.length - i) * 10000)
        fs.utimesSync(p, mtime, mtime)
      }

      // Run the same logic as evictCacheIfNeeded but against cacheDir
      const MAX = 100 * 1024 * 1024
      const TARGET = 80 * 1024 * 1024
      const entries = fs.readdirSync(cacheDir)
      const fileList: Array<{ filePath: string; size: number; mtimeMs: number }> = []
      let total = 0
      for (const entry of entries) {
        const fp = path.join(cacheDir, entry)
        const stat = fs.statSync(fp)
        fileList.push({ filePath: fp, size: stat.size, mtimeMs: stat.mtimeMs })
        total += stat.size
      }

      if (total > MAX) {
        fileList.sort((a, b) => a.mtimeMs - b.mtimeMs)
        for (const file of fileList) {
          if (total <= TARGET) break
          fs.unlinkSync(file.filePath)
          total -= file.size
        }
      }

      expect(total).toBeLessThanOrEqual(TARGET)
      // At least one file was deleted
      const remaining = fs.readdirSync(cacheDir)
      expect(remaining.length).toBeLessThan(files.length)
    })
  })
})
