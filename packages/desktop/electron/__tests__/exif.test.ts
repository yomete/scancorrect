import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readExifData, writeExifData, restoreFromBackup, initBackupDir, getBackupPath, ExifData } from '../exif'
import type { ExifTool, Tags } from 'exiftool-vendored'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn(),
  copyFile: vi.fn(),
  mkdir: vi.fn()
}))

import * as fs from 'fs/promises'

describe('exif', () => {
  let mockExifTool: ExifTool

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    initBackupDir('/tmp/test-backups')
    mockExifTool = {
      read: vi.fn(),
      write: vi.fn()
    } as unknown as ExifTool
  })

  describe('readExifData', () => {
    it('should read camera make and model', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        Make: 'Canon',
        Model: 'EOS 5D Mark IV'
      } as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.make).toBe('Canon')
      expect(result.model).toBe('EOS 5D Mark IV')
    })

    it('should read lens model', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        LensModel: 'EF 50mm f/1.4 USM'
      } as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.lens).toBe('EF 50mm f/1.4 USM')
    })

    it('should read exposure settings', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        ISO: 400,
        FNumber: 2.8,
        ExposureTime: 0.004, // 1/250
        FocalLength: 50
      } as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.iso).toBe(400)
      expect(result.aperture).toBe(2.8)
      expect(result.shutterSpeed).toBe(0.004)
      expect(result.focalLength).toBe(50)
    })

    it('should parse focal length from string format', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        FocalLength: '50 mm'
      } as unknown as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.focalLength).toBe(50)
    })

    it('should read exposure compensation', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        ExposureBiasValue: -0.7
      } as unknown as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.exposureComp).toBe(-0.7)
    })

    it('should read film stock from ImageDescription', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        ImageDescription: 'Kodak Portra 400'
      } as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.filmStock).toBe('Kodak Portra 400')
    })

    it('should read GPS coordinates with reference directions', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        GPSLatitude: 37.7749,
        GPSLongitude: 122.4194,
        GPSLatitudeRef: 'N',
        GPSLongitudeRef: 'W'
      } as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.location).toBeDefined()
      expect(result.location?.latitude).toBe(37.7749)
      expect(result.location?.longitude).toBe(-122.4194) // West is negative
    })

    it('should handle South latitude', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        GPSLatitude: 33.8688,
        GPSLongitude: 151.2093,
        GPSLatitudeRef: 'S',
        GPSLongitudeRef: 'E'
      } as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.location?.latitude).toBe(-33.8688)
      expect(result.location?.longitude).toBe(151.2093)
    })

    it('should handle South/West spelled out', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        GPSLatitude: 33.8688,
        GPSLongitude: 151.2093,
        GPSLatitudeRef: 'South',
        GPSLongitudeRef: 'West'
      } as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.location?.latitude).toBe(-33.8688)
      expect(result.location?.longitude).toBe(-151.2093)
    })

    it('should parse DateTimeOriginal from ExifDateTime object', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        DateTimeOriginal: {
          year: 2024,
          month: 1,
          day: 15,
          hour: 10,
          minute: 30,
          second: 45
        }
      } as unknown as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.dateOriginal).toBe('2024-01-15')
      expect(result.dateTimeOriginal).toBe('2024-01-15T10:30:45')
    })

    it('should parse DateTimeOriginal from string format', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({
        DateTimeOriginal: '2024:01:15 10:30:45'
      } as unknown as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result.dateOriginal).toBe('2024-01-15')
      expect(result.dateTimeOriginal).toBe('2024-01-15T10:30:45')
    })

    it('should return empty object for file with no EXIF', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({} as Tags)

      const result = await readExifData(mockExifTool, '/test.jpg')

      expect(result).toEqual({})
    })
  })

  describe('readExifData — unreadable files', () => {
    it('throws when exiftool reports an Error tag', async () => {
      // exiftool resolves for an empty file, with the failure in a tag
      vi.mocked(mockExifTool.read).mockResolvedValue({ Error: 'File is empty' } as never)

      await expect(readExifData(mockExifTool, '/empty.jpg')).rejects.toThrow('File is empty')
    })

    it('still reads a file that only carries a Warning', async () => {
      vi.mocked(mockExifTool.read).mockResolvedValue({ Warning: 'Odd padding', Make: 'Nikon' } as never)

      const data = await readExifData(mockExifTool, '/odd.jpg')
      expect(data.make).toBe('Nikon')
    })
  })

  describe('writeExifData', () => {
    it('should not write a field left blank in the sidebar', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)

      // What an added-but-untouched field looks like by the time it gets here
      const data = { make: 'Nikon', lens: '', iso: '' } as unknown as ExifData

      const result = await writeExifData(mockExifTool, '/test.jpg', data)

      expect(result.success).toBe(true)
      const written = vi.mocked(mockExifTool.write).mock.calls[0][1] as Record<string, unknown>
      expect(written).toHaveProperty('Make', 'Nikon')
      expect(written).not.toHaveProperty('LensModel')
      expect(written).not.toHaveProperty('ISO')
    })

    it('should write camera info', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)

      const data: ExifData = {
        make: 'Nikon',
        model: 'FM2',
        lens: 'Nikkor 50mm f/1.4'
      }

      const result = await writeExifData(mockExifTool, '/test.jpg', data)

      expect(result.success).toBe(true)
      expect(mockExifTool.write).toHaveBeenCalledWith(
        '/test.jpg',
        expect.objectContaining({
          Make: 'Nikon',
          Model: 'FM2',
          LensModel: 'Nikkor 50mm f/1.4'
        }),
        expect.any(Array)
      )
    })

    it('should write exposure settings', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)

      const data: ExifData = {
        iso: 400,
        aperture: 2.8,
        shutterSpeed: 0.004,
        focalLength: 50,
        exposureComp: -0.3
      }

      await writeExifData(mockExifTool, '/test.jpg', data)

      expect(mockExifTool.write).toHaveBeenCalledWith(
        '/test.jpg',
        expect.objectContaining({
          ISO: 400,
          FNumber: 2.8,
          ExposureTime: 0.004,
          FocalLength: 50,
          ExposureBiasValue: -0.3
        }),
        expect.any(Array)
      )
    })

    it('should write film stock to ImageDescription', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)

      const data: ExifData = {
        filmStock: 'Fuji Superia 400'
      }

      await writeExifData(mockExifTool, '/test.jpg', data)

      expect(mockExifTool.write).toHaveBeenCalledWith(
        '/test.jpg',
        expect.objectContaining({
          ImageDescription: 'Fuji Superia 400'
        }),
        expect.any(Array)
      )
    })

    it('should write GPS coordinates with reference tags', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)

      const data: ExifData = {
        location: {
          name: 'San Francisco',
          latitude: 37.7749,
          longitude: -122.4194
        }
      }

      await writeExifData(mockExifTool, '/test.jpg', data)

      expect(mockExifTool.write).toHaveBeenCalledWith(
        '/test.jpg',
        expect.objectContaining({
          GPSLatitude: 37.7749,
          GPSLongitude: -122.4194,
          GPSLatitudeRef: 'N',
          GPSLongitudeRef: 'W'
        }),
        expect.any(Array)
      )
    })

    it('should write South latitude correctly', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)

      const data: ExifData = {
        location: {
          name: 'Sydney',
          latitude: -33.8688,
          longitude: 151.2093
        }
      }

      await writeExifData(mockExifTool, '/test.jpg', data)

      expect(mockExifTool.write).toHaveBeenCalledWith(
        '/test.jpg',
        expect.objectContaining({
          GPSLatitude: -33.8688,
          GPSLongitude: 151.2093,
          GPSLatitudeRef: 'S',
          GPSLongitudeRef: 'E'
        }),
        expect.any(Array)
      )
    })

    it('should convert date to EXIF format', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)

      const data: ExifData = {
        dateOriginal: '2024-01-15'
      }

      await writeExifData(mockExifTool, '/test.jpg', data)

      expect(mockExifTool.write).toHaveBeenCalledWith(
        '/test.jpg',
        expect.objectContaining({
          DateTimeOriginal: '2024:01:15 12:00:00'
        }),
        expect.any(Array)
      )
    })

    it('should keep backup by default', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.rename).mockResolvedValue(undefined)

      const result = await writeExifData(mockExifTool, '/test.jpg', { make: 'Canon' })

      expect(result.backupPath).toBe(getBackupPath('/test.jpg'))
      expect(result.backupPath).toMatch(/^\/tmp\/test-backups\/.*\.jpg$/)
      expect(mockExifTool.write).toHaveBeenCalledWith(
        '/test.jpg',
        expect.any(Object),
        [] // No -overwrite_original flag
      )
      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/test-backups', { recursive: true })
      expect(fs.rename).toHaveBeenCalledWith('/test.jpg_original', result.backupPath)
    })

    it('should preserve the original contents of an existing backup', async () => {
      const files = new Map<string, string>()
      const filePath = '/test.jpg'
      const backupPath = getBackupPath(filePath)
      files.set(filePath, 'MODIFIED')
      files.set(backupPath, 'ORIGINAL')
      vi.mocked(mockExifTool.write).mockImplementation(async () => {
        files.set(`${filePath}_original`, files.get(filePath)!)
      })
      vi.mocked(fs.access).mockImplementation(async (target) => {
        if (!files.has(String(target))) throw new Error('ENOENT')
      })
      vi.mocked(fs.unlink).mockImplementation(async (target) => {
        files.delete(String(target))
      })

      const result = await writeExifData(mockExifTool, filePath, { make: 'Canon' })

      expect(result.backupPath).toBe(backupPath)
      expect(files.get(backupPath)).toBe('ORIGINAL')
    })

    it('should remove the fresh ExifTool backup when an authoritative backup exists', async () => {
      const files = new Map<string, string>()
      const filePath = '/test.jpg'
      const backupPath = getBackupPath(filePath)
      files.set(filePath, 'MODIFIED')
      files.set(backupPath, 'ORIGINAL')
      vi.mocked(mockExifTool.write).mockImplementation(async () => {
        files.set(`${filePath}_original`, files.get(filePath)!)
      })
      vi.mocked(fs.access).mockImplementation(async (target) => {
        if (!files.has(String(target))) throw new Error('ENOENT')
      })
      vi.mocked(fs.unlink).mockImplementation(async (target) => {
        files.delete(String(target))
      })

      await writeExifData(mockExifTool, filePath, { make: 'Canon' })

      expect(files.has(`${filePath}_original`)).toBe(false)
    })

    it('should not keep backup when keepBackup is false', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)

      const result = await writeExifData(mockExifTool, '/test.jpg', { make: 'Canon' }, false)

      expect(result.backupPath).toBeUndefined()
      expect(mockExifTool.write).toHaveBeenCalledWith(
        '/test.jpg',
        expect.any(Object),
        ['-overwrite_original']
      )
    })

    it('should handle write errors', async () => {
      vi.mocked(mockExifTool.write).mockRejectedValue(new Error('Write failed'))

      const result = await writeExifData(mockExifTool, '/test.jpg', { make: 'Canon' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Write failed')
    })

    it('should handle unknown errors', async () => {
      vi.mocked(mockExifTool.write).mockRejectedValue('Unknown error')

      const result = await writeExifData(mockExifTool, '/test.jpg', { make: 'Canon' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error writing EXIF data')
    })

    it('should keep the ExifTool backup path if moving it to app data fails', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.rename).mockRejectedValue(new Error('Permission denied'))
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined)

      const result = await writeExifData(mockExifTool, '/test.jpg', { make: 'Canon' })

      expect(result.success).toBe(true)
      expect(result.backupPath).toBe('/test.jpg_original')
      expect(result.warning).toContain('backup could not be moved')
    })

    it('should fail loudly if a write completes but no backup can be verified', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.rename).mockRejectedValue(new Error('Permission denied'))
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const result = await writeExifData(mockExifTool, '/test.jpg', { make: 'Canon' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('no backup could be verified')
    })
  })

  describe('restoreFromBackup', () => {
    it('should restore file from backup', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.copyFile).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)
      vi.mocked(fs.rename).mockResolvedValue(undefined)

      const expectedBackupPath = getBackupPath('/test.jpg')
      const result = await restoreFromBackup('/test.jpg')

      expect(result).toBe(true)
      expect(fs.access).toHaveBeenCalledWith(expectedBackupPath)
      expect(fs.copyFile).toHaveBeenCalledWith(
        expectedBackupPath,
        expect.stringMatching(/^\/test\.jpg\.scancorrect-restore-/)
      )
      expect(fs.rename).toHaveBeenCalledWith(
        '/test.jpg',
        expect.stringMatching(/^\/test\.jpg\.scancorrect-current-/)
      )
      expect(fs.rename).toHaveBeenCalledWith(
        expect.stringMatching(/^\/test\.jpg\.scancorrect-restore-/),
        '/test.jpg'
      )
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringMatching(/^\/test\.jpg\.scancorrect-current-/)
      )
    })

    it('should use explicit backup path if provided', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.copyFile).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)
      vi.mocked(fs.rename).mockResolvedValue(undefined)

      await restoreFromBackup('/test.jpg', '/backup/test.jpg')

      expect(fs.access).toHaveBeenCalledWith('/backup/test.jpg')
      expect(fs.copyFile).toHaveBeenCalledWith(
        '/backup/test.jpg',
        expect.stringMatching(/^\/test\.jpg\.scancorrect-restore-/)
      )
      expect(fs.rename).toHaveBeenCalledWith(
        expect.stringMatching(/^\/test\.jpg\.scancorrect-restore-/),
        '/test.jpg'
      )
    })

    it('should return false if backup does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const result = await restoreFromBackup('/test.jpg')

      expect(result).toBe(false)
    })

    it('should return false if current file cannot be moved aside', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.copyFile).mockResolvedValue(undefined)
      vi.mocked(fs.rename).mockRejectedValue(new Error('Permission denied'))

      const result = await restoreFromBackup('/test.jpg')

      expect(result).toBe(false)
      expect(fs.copyFile).toHaveBeenCalledWith(
        getBackupPath('/test.jpg'),
        expect.stringMatching(/^\/test\.jpg\.scancorrect-restore-/)
      )
      expect(fs.rename).toHaveBeenCalledWith(
        '/test.jpg',
        expect.stringMatching(/^\/test\.jpg\.scancorrect-current-/)
      )
    })

    it('should roll the current file back if the restored backup cannot move into place', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.copyFile).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)
      vi.mocked(fs.rename)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Restore rename failed'))
        .mockResolvedValueOnce(undefined)

      const result = await restoreFromBackup('/test.jpg')

      expect(result).toBe(false)
      const currentBackupPath = vi.mocked(fs.rename).mock.calls[0][1]
      expect(fs.rename).toHaveBeenCalledWith(currentBackupPath, '/test.jpg')
    })
  })

  describe('getBackupPath', () => {
    it('should return deterministic paths', () => {
      const path1 = getBackupPath('/photos/scan001.jpg')
      const path2 = getBackupPath('/photos/scan001.jpg')
      expect(path1).toBe(path2)
    })

    it('should return different paths for different files', () => {
      const path1 = getBackupPath('/photos/scan001.jpg')
      const path2 = getBackupPath('/photos/scan002.jpg')
      expect(path1).not.toBe(path2)
    })

    it('should preserve file extension', () => {
      expect(getBackupPath('/photo.jpg')).toMatch(/\.jpg$/)
      expect(getBackupPath('/photo.tiff')).toMatch(/\.tiff$/)
    })

    it('should use the configured backup directory', () => {
      const result = getBackupPath('/test.jpg')
      expect(result).toMatch(/^\/tmp\/test-backups\//)
    })
  })

  describe('cross-volume move (EXDEV fallback)', () => {
    it('should fall back to copy+delete when rename fails with EXDEV', async () => {
      vi.mocked(mockExifTool.write).mockResolvedValue(undefined)
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.copyFile).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      const exdevError = Object.assign(new Error('EXDEV'), { code: 'EXDEV' })
      vi.mocked(fs.rename).mockRejectedValue(exdevError)

      const result = await writeExifData(mockExifTool, '/test.jpg', { make: 'Canon' })

      expect(result.success).toBe(true)
      expect(fs.copyFile).toHaveBeenCalledWith('/test.jpg_original', result.backupPath)
      expect(fs.unlink).toHaveBeenCalledWith('/test.jpg_original')
    })
  })
})
