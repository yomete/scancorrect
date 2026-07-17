import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assertAbsolutePath } from '../handlers/guard'

// Module-level mocks (hoisted by vitest)
vi.mock('../exif', () => ({
  readExifData: vi.fn(),
  writeExifData: vi.fn(),
  restoreFromBackup: vi.fn(),
  initBackupDir: vi.fn(),
  getBackupPath: vi.fn(),
}))

vi.mock('../spotlight', async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>
  return {
    ...original,
    scheduleSpotlightFollowUp: vi.fn(),
    appendMetadataWriteLog: vi.fn(),
    getFileSnapshot: vi.fn().mockResolvedValue({ size: 100, modifiedAt: '2024-01-01T00:00:00.000Z' }),
    getFinderMetadataSnapshot: vi.fn().mockResolvedValue({}),
    hasFinderMetadata: vi.fn().mockReturnValue(false),
  }
})

vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>
  return {
    ...original,
    promises: {
      ...(original.promises as Record<string, unknown>),
      readdir: vi.fn(),
    },
  }
})

import * as fs from 'fs'
import * as exifModule from '../exif'
import { registerExifHandlers } from '../handlers/exif-handlers'
import type { ExifSnapshot } from '../spotlight'

// Helper: fake ipcMain that records handlers
function makeFakeIpc() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  const ipcMain = {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => {
      handlers.set(channel, fn)
    }
  }
  const invoke = (channel: string, ...args: unknown[]) => {
    const fn = handlers.get(channel)
    if (!fn) throw new Error(`No handler for ${channel}`)
    return fn({} as Electron.IpcMainInvokeEvent, ...args)
  }
  return { ipcMain, invoke }
}

function makeBaseDeps(ipc: ReturnType<typeof makeFakeIpc>, overrides: Partial<Parameters<typeof registerExifHandlers>[0]> = {}) {
  return {
    ipcMain: ipc.ipcMain as any,
    exiftool: {} as any,
    getStore: () => ({} as any),
    getMetadataWriteLogPath: () => '/tmp/log',
    shouldWriteMetadataDiagnostics: () => false,
    getExifSnapshot: vi.fn().mockResolvedValue({ data: { make: 'Leica' } } as ExifSnapshot),
    hasEmbeddedMetadata: vi.fn().mockReturnValue(true),
    getAppVersion: () => '0.0.0',
    getMainWindow: () => null,
    dialog: {} as any,
    ...overrides,
  }
}

describe('assertAbsolutePath', () => {
  it('accepts absolute paths', () => {
    expect(() => assertAbsolutePath('/absolute/path.jpg')).not.toThrow()
  })

  it('rejects relative paths', () => {
    expect(() => assertAbsolutePath('relative/path.jpg')).toThrow('Invalid file path')
  })

  it('rejects paths with null bytes', () => {
    expect(() => assertAbsolutePath('/absolute/path\0.jpg')).toThrow('Invalid file path')
  })
})

describe('registerExifHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('read-exif', () => {
    it('returns data and isScanner=false for non-scanner camera', async () => {
      const ipc = makeFakeIpc()
      vi.mocked(exifModule.readExifData).mockResolvedValue({ make: 'Leica', model: 'FM2' })
      registerExifHandlers(makeBaseDeps(ipc))

      const result = await ipc.invoke('read-exif', '/absolute/test.jpg') as any
      expect(result.data.make).toBe('Leica')
      expect(result.isScanner).toBe(false)
    })

    it('returns isScanner=true for scanner metadata', async () => {
      const ipc = makeFakeIpc()
      vi.mocked(exifModule.readExifData).mockResolvedValue({ make: 'EPSON', model: 'Perfection V850' })
      registerExifHandlers(makeBaseDeps(ipc))

      const result = await ipc.invoke('read-exif', '/absolute/test.jpg') as any
      expect(result.isScanner).toBe(true)
    })

    it('returns error shape on failure', async () => {
      const ipc = makeFakeIpc()
      vi.mocked(exifModule.readExifData).mockRejectedValue(new Error('File not found'))
      registerExifHandlers(makeBaseDeps(ipc))

      const result = await ipc.invoke('read-exif', '/absolute/test.jpg') as any
      expect(result.error).toBe('File not found')
    })

    it('rejects relative path', async () => {
      const ipc = makeFakeIpc()
      registerExifHandlers(makeBaseDeps(ipc))

      await expect(ipc.invoke('read-exif', 'relative/path.jpg')).rejects.toThrow('Invalid file path')
    })
  })

  describe('read-exif-batch', () => {
    it('returns per-file errors without rejecting the batch', async () => {
      const ipc = makeFakeIpc()
      vi.mocked(exifModule.readExifData).mockResolvedValue({ make: 'Leica', model: 'M6' })
      registerExifHandlers(makeBaseDeps(ipc))

      const result = await ipc.invoke('read-exif-batch', ['relative.jpg', '/absolute/good.jpg']) as any

      expect(result['relative.jpg'].error).toContain('Invalid file path')
      expect(result['/absolute/good.jpg'].data).toEqual({ make: 'Leica', model: 'M6' })
    })
  })

  describe('write-exif', () => {
    it('returns success on successful write', async () => {
      const ipc = makeFakeIpc()
      vi.mocked(exifModule.writeExifData).mockResolvedValue({ success: true, backupPath: '/tmp/backup.jpg' })
      registerExifHandlers(makeBaseDeps(ipc))

      const result = await ipc.invoke('write-exif', '/absolute/test.jpg', { make: 'Leica' }) as any
      expect(result.success).toBe(true)
    })

    it('returns failure shape on write error', async () => {
      const ipc = makeFakeIpc()
      vi.mocked(exifModule.writeExifData).mockRejectedValue(new Error('Write failed'))
      registerExifHandlers(makeBaseDeps(ipc))

      const result = await ipc.invoke('write-exif', '/absolute/test.jpg', { make: 'Leica' }) as any
      expect(result.success).toBe(false)
      expect(result.error).toBe('Write failed')
    })

    it('rejects relative path', async () => {
      const ipc = makeFakeIpc()
      registerExifHandlers(makeBaseDeps(ipc))

      await expect(ipc.invoke('write-exif', 'relative/path.jpg', {})).rejects.toThrow('Invalid file path')
    })
  })

  describe('verify-folder-metadata', () => {
    it('returns error when no window', async () => {
      const ipc = makeFakeIpc()
      registerExifHandlers(makeBaseDeps(ipc, { getMainWindow: () => null }))

      const result = await ipc.invoke('verify-folder-metadata') as any
      expect(result.error).toBe('No app window available')
    })

    it('returns error when dialog is canceled', async () => {
      const ipc = makeFakeIpc()
      const mockDialog = {
        showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
      }
      registerExifHandlers(makeBaseDeps(ipc, {
        getMainWindow: () => ({} as any),
        dialog: mockDialog as any,
      }))

      const result = await ipc.invoke('verify-folder-metadata') as any
      expect(result.error).toBe('Verification canceled')
    })

    it('returns folder verification result for non-empty folder', async () => {
      const ipc = makeFakeIpc()
      const mockDialog = {
        showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/tmp/photos'] }),
      }

      // Mock fs.promises.readdir to return two image entries
      const mockEntries = [
        { isFile: () => true, name: 'scan001.jpg' },
        { isFile: () => true, name: 'scan002.jpg' },
        { isFile: () => false, name: 'folder' },
      ]
      vi.mocked(fs.promises.readdir as any).mockResolvedValue(mockEntries)

      const mockGetExifSnapshot = vi.fn().mockResolvedValue({ data: { make: 'Leica' } } as ExifSnapshot)
      const mockHasEmbeddedMetadata = vi.fn().mockReturnValue(true)

      registerExifHandlers(makeBaseDeps(ipc, {
        getMainWindow: () => ({} as any),
        dialog: mockDialog as any,
        getExifSnapshot: mockGetExifSnapshot,
        hasEmbeddedMetadata: mockHasEmbeddedMetadata,
      }))

      const result = await ipc.invoke('verify-folder-metadata') as any
      expect(result.total).toBe(2)
      expect(result.embeddedPresent).toBe(2)
    })
  })

  describe('restore-backup', () => {
    it('returns success on successful restore', async () => {
      const ipc = makeFakeIpc()
      vi.mocked(exifModule.restoreFromBackup).mockResolvedValue(true)
      registerExifHandlers(makeBaseDeps(ipc))

      const result = await ipc.invoke('restore-backup', '/absolute/test.jpg', '/absolute/backup.jpg') as any
      expect(result.success).toBe(true)
    })

    it('returns error on failed restore', async () => {
      const ipc = makeFakeIpc()
      vi.mocked(exifModule.restoreFromBackup).mockRejectedValue(new Error('Restore failed'))
      registerExifHandlers(makeBaseDeps(ipc))

      const result = await ipc.invoke('restore-backup', '/absolute/test.jpg', '/absolute/backup.jpg') as any
      expect(result.success).toBe(false)
      expect(result.error).toBe('Restore failed')
    })

    it('returns failure when restoreFromBackup resolves false', async () => {
      const ipc = makeFakeIpc()
      vi.mocked(exifModule.restoreFromBackup).mockResolvedValue(false)
      registerExifHandlers(makeBaseDeps(ipc))

      const result = await ipc.invoke('restore-backup', '/absolute/test.jpg', '/absolute/backup.jpg') as any
      expect(result.success).toBe(false)
      expect(result.error).toContain('backup file may be missing or unreadable')
    })

    it('rejects relative filePath', async () => {
      const ipc = makeFakeIpc()
      registerExifHandlers(makeBaseDeps(ipc))

      await expect(ipc.invoke('restore-backup', 'relative.jpg', '/absolute/backup.jpg')).rejects.toThrow('Invalid file path')
    })

    it('rejects relative backupPath', async () => {
      const ipc = makeFakeIpc()
      registerExifHandlers(makeBaseDeps(ipc))

      await expect(ipc.invoke('restore-backup', '/absolute/test.jpg', 'relative.jpg')).rejects.toThrow('Invalid file path')
    })
  })
})
