import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readExifData, writeExifData, restoreFromBackup, cleanupBackup, cleanupBackups, ExifData } from '../exif'
import type { ExifTool, Tags } from 'exiftool-vendored'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn()
}))

import * as fs from 'fs/promises'

describe('exif', () => {
  let mockExifTool: ExifTool

  beforeEach(() => {
    vi.clearAllMocks()
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

  describe('writeExifData', () => {
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
          GPSLongitude: 122.4194,
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
          GPSLatitude: 33.8688,
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

      const result = await writeExifData(mockExifTool, '/test.jpg', { make: 'Canon' })

      expect(result.backupPath).toBe('/test.jpg_original')
      expect(mockExifTool.write).toHaveBeenCalledWith(
        '/test.jpg',
        expect.any(Object),
        [] // No -overwrite_original flag
      )
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
  })

  describe('restoreFromBackup', () => {
    it('should restore file from backup', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)
      vi.mocked(fs.rename).mockResolvedValue(undefined)

      const result = await restoreFromBackup('/test.jpg')

      expect(result).toBe(true)
      expect(fs.access).toHaveBeenCalledWith('/test.jpg_original')
      expect(fs.unlink).toHaveBeenCalledWith('/test.jpg')
      expect(fs.rename).toHaveBeenCalledWith('/test.jpg_original', '/test.jpg')
    })

    it('should use explicit backup path if provided', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)
      vi.mocked(fs.rename).mockResolvedValue(undefined)

      await restoreFromBackup('/test.jpg', '/backup/test.jpg')

      expect(fs.access).toHaveBeenCalledWith('/backup/test.jpg')
      expect(fs.rename).toHaveBeenCalledWith('/backup/test.jpg', '/test.jpg')
    })

    it('should return false if backup does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const result = await restoreFromBackup('/test.jpg')

      expect(result).toBe(false)
    })

    it('should return false if delete fails', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockRejectedValue(new Error('Permission denied'))

      const result = await restoreFromBackup('/test.jpg')

      expect(result).toBe(false)
    })
  })

  describe('cleanupBackup', () => {
    it('should delete backup file', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      await cleanupBackup('/test.jpg_original')

      expect(fs.access).toHaveBeenCalledWith('/test.jpg_original')
      expect(fs.unlink).toHaveBeenCalledWith('/test.jpg_original')
    })

    it('should silently ignore if backup does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      await expect(cleanupBackup('/nonexistent')).resolves.not.toThrow()
    })
  })

  describe('cleanupBackups', () => {
    it('should delete multiple backup files', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      await cleanupBackups(['/test1.jpg_original', '/test2.jpg_original'])

      expect(fs.unlink).toHaveBeenCalledTimes(2)
    })

    it('should handle empty array', async () => {
      await expect(cleanupBackups([])).resolves.not.toThrow()
    })
  })
})
