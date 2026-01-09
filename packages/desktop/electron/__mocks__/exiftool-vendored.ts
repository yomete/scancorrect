import { vi } from 'vitest'

// Mock Tags interface matching exiftool-vendored
export interface MockTags {
  Make?: string
  Model?: string
  LensModel?: string
  ISO?: number
  FNumber?: number
  ExposureTime?: number
  FocalLength?: number | string
  ExposureBiasValue?: number
  ImageDescription?: string
  GPSLatitude?: number
  GPSLongitude?: number
  GPSLatitudeRef?: string
  GPSLongitudeRef?: string
  DateTimeOriginal?: string | {
    year: number
    month: number
    day: number
    hour?: number
    minute?: number
    second?: number
  }
  [key: string]: unknown
}

export interface MockWriteResult {
  success?: boolean
  error?: string
}

// Create a mock ExifTool class
export class MockExifTool {
  read = vi.fn<[string], Promise<MockTags>>().mockResolvedValue({})
  write = vi.fn<[string, Record<string, unknown>, string[]?], Promise<void>>().mockResolvedValue(undefined)
  end = vi.fn<[], Promise<void>>().mockResolvedValue(undefined)

  // Helper methods for tests
  mockReadResult(tags: MockTags): void {
    this.read.mockResolvedValueOnce(tags)
  }

  mockReadError(error: Error): void {
    this.read.mockRejectedValueOnce(error)
  }

  mockWriteError(error: Error): void {
    this.write.mockRejectedValueOnce(error)
  }

  reset(): void {
    this.read.mockReset().mockResolvedValue({})
    this.write.mockReset().mockResolvedValue(undefined)
    this.end.mockReset().mockResolvedValue(undefined)
  }
}

// Export a singleton mock instance
export const exiftool = new MockExifTool()

// Factory function for creating new mock instances
export const createMockExifTool = () => new MockExifTool()

// Common test data helpers
export const mockCameraExif: MockTags = {
  Make: 'Canon',
  Model: 'EOS 5D Mark IV',
  LensModel: 'EF 50mm f/1.4 USM',
  ISO: 400,
  FNumber: 2.8,
  ExposureTime: 0.004,
  FocalLength: 50
}

export const mockFilmCameraExif: MockTags = {
  Make: 'Nikon',
  Model: 'FM2',
  LensModel: 'Nikkor 50mm f/1.4',
  ISO: 400,
  ImageDescription: 'Kodak Portra 400'
}

export const mockScannerExif: MockTags = {
  Make: 'EPSON',
  Model: 'Perfection V850 Pro'
}

export const mockGpsExif: MockTags = {
  GPSLatitude: 37.7749,
  GPSLongitude: 122.4194,
  GPSLatitudeRef: 'N',
  GPSLongitudeRef: 'W'
}

export const mockDateExif: MockTags = {
  DateTimeOriginal: {
    year: 2024,
    month: 1,
    day: 15,
    hour: 10,
    minute: 30,
    second: 45
  }
}

export const mockStringDateExif: MockTags = {
  DateTimeOriginal: '2024:01:15 10:30:45'
}
