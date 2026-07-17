import * as path from 'path'
import * as fs from 'fs'
import type { IpcMain, Dialog, BrowserWindow } from 'electron'
import type { ExifTool } from 'exiftool-vendored'
import type Store from 'electron-store' with { 'resolution-mode': 'import' }
import { readExifData, writeExifData, restoreFromBackup } from '../exif'
import { isLikelyScannerMetadata } from '../scanner-detection'
import {
  scheduleSpotlightFollowUp,
  appendMetadataWriteLog,
  getFileSnapshot,
  getFinderMetadataSnapshot,
  hasFinderMetadata,
  type ExifSnapshot,
} from '../spotlight'
import type { ExifData, ExifBatchResult, FolderMetadataVerificationFile, FolderMetadataVerificationResult } from '../ipc-types'
import type { StoreSchema } from '../store'
import { assertAbsolutePath } from './guard'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.tif', '.tiff'])

interface ExifHandlerDeps {
  ipcMain: IpcMain
  exiftool: ExifTool
  getStore: () => Store<StoreSchema>
  getMetadataWriteLogPath: () => string
  shouldWriteMetadataDiagnostics: () => boolean
  getExifSnapshot: (filePath: string) => Promise<ExifSnapshot>
  hasEmbeddedMetadata: (snapshot: ExifSnapshot) => boolean
  getAppVersion: () => string
  getMainWindow: () => BrowserWindow | null
  dialog: Dialog
}

export function registerExifHandlers(deps: ExifHandlerDeps): void {
  const {
    ipcMain,
    exiftool,
    getMetadataWriteLogPath,
    shouldWriteMetadataDiagnostics,
    getExifSnapshot,
    hasEmbeddedMetadata,
    getAppVersion,
    getMainWindow,
    dialog,
  } = deps

  ipcMain.handle('read-exif', async (_, filePath: string): Promise<{ data: ExifData; isScanner: boolean } | { error: string }> => {
    assertAbsolutePath(filePath)
    try {
      const data = await readExifData(exiftool, filePath)
      const isScanner = isLikelyScannerMetadata(data.make, data.model)
      return { data, isScanner }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error reading EXIF data' }
    }
  })

  ipcMain.handle('read-exif-batch', async (_, filePaths: string[]): Promise<ExifBatchResult> => {
    const entries = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          assertAbsolutePath(filePath)
          const data = await readExifData(exiftool, filePath)
          const isScanner = isLikelyScannerMetadata(data.make, data.model)
          return [filePath, { data, isScanner }] as const
        } catch (error) {
          return [filePath, { error: error instanceof Error ? error.message : 'Unknown error reading EXIF data' }] as const
        }
      })
    )
    return Object.fromEntries(entries)
  })

  ipcMain.handle('write-exif', async (_, filePath: string, data: ExifData): Promise<{ success: boolean; backupPath?: string; error?: string; warning?: string }> => {
    assertAbsolutePath(filePath)
    const startedAt = Date.now()
    const keepBackup = true
    const writeDiagnostics = shouldWriteMetadataDiagnostics()
    const logPath = getMetadataWriteLogPath()
    const before = writeDiagnostics ? await getExifSnapshot(filePath) : undefined
    const fileBefore = writeDiagnostics ? await getFileSnapshot(filePath) : undefined
    let result: { success: boolean; backupPath?: string; error?: string; warning?: string }
    let after: ExifSnapshot | undefined
    let fileAfter: import('../spotlight').FileSnapshot | undefined

    try {
      result = await writeExifData(exiftool, filePath, data, keepBackup)
    } catch (error) {
      result = { success: false, error: error instanceof Error ? error.message : 'Unknown error writing EXIF data' }
    }

    if (writeDiagnostics) {
      after = await getExifSnapshot(filePath)
      fileAfter = await getFileSnapshot(filePath)
    }

    if (result.success) {
      scheduleSpotlightFollowUp(filePath, 0, writeDiagnostics, logPath, getAppVersion())
      scheduleSpotlightFollowUp(filePath, 30000, writeDiagnostics, logPath, getAppVersion())
    }

    if (writeDiagnostics && before) {
      try {
        await appendMetadataWriteLog({
          schemaVersion: 1,
          event: 'metadata.write',
          timestamp: new Date().toISOString(),
          appVersion: getAppVersion(),
          filePath,
          filename: path.basename(filePath),
          keepBackup,
          requestedChanges: data,
          before,
          after,
          fileBefore,
          fileAfter,
          durationMs: Date.now() - startedAt,
          result
        }, logPath)
      } catch (error) {
        console.warn('Failed to append metadata write log:', error)
      }
    }

    return result
  })

  ipcMain.handle('verify-folder-metadata', async (): Promise<FolderMetadataVerificationResult | { error: string }> => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return { error: 'No app window available' }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Verify folder metadata'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { error: 'Verification canceled' }
    }

    const startedAt = Date.now()
    const folderPath = result.filePaths[0]
    const logPath = getMetadataWriteLogPath()

    try {
      const verification = await verifyFolderMetadata(folderPath, getExifSnapshot, hasEmbeddedMetadata, logPath)

      try {
        await appendMetadataWriteLog({
          schemaVersion: 1,
          event: 'metadata.verifyFolder',
          timestamp: new Date().toISOString(),
          appVersion: getAppVersion(),
          durationMs: Date.now() - startedAt,
          ...verification
        }, logPath)
      } catch (error) {
        console.warn('Failed to append metadata verification log:', error)
      }

      return verification
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error verifying folder metadata' }
    }
  })

  ipcMain.handle('restore-backup', async (_, filePath: string, backupPath: string): Promise<{ success: boolean; error?: string }> => {
    assertAbsolutePath(filePath)
    assertAbsolutePath(backupPath)
    try {
      const ok = await restoreFromBackup(filePath, backupPath)
      return ok
        ? { success: true }
        : { success: false, error: 'Restore failed — the backup file may be missing or unreadable' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error restoring backup' }
    }
  })
}

async function verifyFolderMetadata(
  folderPath: string,
  getExifSnapshot: (filePath: string) => Promise<ExifSnapshot>,
  hasEmbeddedMetadata: (snapshot: ExifSnapshot) => boolean,
  logPath: string
): Promise<FolderMetadataVerificationResult> {
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
  const files = entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(folderPath, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)))

  const results: FolderMetadataVerificationFile[] = []

  for (const filePath of files) {
    const embedded = await getExifSnapshot(filePath)
    const finder = await getFinderMetadataSnapshot(filePath)
    const embeddedPresent = hasEmbeddedMetadata(embedded)
    const finderVisible = hasFinderMetadata(finder)

    results.push({
      filePath,
      filename: path.basename(filePath),
      embedded,
      finder,
      embeddedPresent,
      finderVisible
    })
  }

  const embeddedPresent = results.filter((file) => file.embeddedPresent).length
  const finderVisible = results.filter((file) => file.finderVisible).length

  return {
    folderPath,
    total: results.length,
    embeddedPresent,
    embeddedMissing: results.length - embeddedPresent,
    finderVisible,
    finderMissing: results.length - finderVisible,
    logPath,
    files: results
  }
}
