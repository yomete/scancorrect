import * as path from 'path'
import * as fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { ExifData, FinderMetadataSnapshot, FolderMetadataVerificationResult } from './ipc-types'

const execFileAsync = promisify(execFile)

export interface FileSnapshot {
  size: number
  modifiedAt: string
}

export interface ExifSnapshot {
  data?: ExifData
  error?: string
}

export interface SpotlightReimportResult {
  attempted: boolean
  durationMs: number
  finder: FinderMetadataSnapshot
  finderVisible: boolean
  error?: string
}

export interface MetadataWriteLogEntry {
  schemaVersion: 1
  event: 'metadata.write'
  timestamp: string
  appVersion: string
  filePath: string
  filename: string
  keepBackup: boolean
  requestedChanges: ExifData
  before: ExifSnapshot
  after?: ExifSnapshot
  fileBefore?: FileSnapshot
  fileAfter?: FileSnapshot
  spotlight?: SpotlightReimportResult
  durationMs: number
  result: {
    success: boolean
    backupPath?: string
    error?: string
    warning?: string
  }
}

export interface MetadataVerifyFolderLogEntry extends FolderMetadataVerificationResult {
  schemaVersion: 1
  event: 'metadata.verifyFolder'
  timestamp: string
  appVersion: string
  durationMs: number
}

export interface MetadataSpotlightFollowUpLogEntry {
  schemaVersion: 1
  event: 'metadata.spotlightFollowUp'
  timestamp: string
  appVersion: string
  filePath: string
  filename: string
  delayMs: number
  spotlight: SpotlightReimportResult
}

export type MetadataLogEntry =
  | MetadataWriteLogEntry
  | MetadataVerifyFolderLogEntry
  | MetadataSpotlightFollowUpLogEntry

export async function appendMetadataWriteLog(entry: MetadataLogEntry, logPath: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(logPath), { recursive: true })
  await fs.promises.appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8')
}

export async function getFileSnapshot(filePath: string): Promise<FileSnapshot | undefined> {
  try {
    const stat = await fs.promises.stat(filePath)
    return {
      size: stat.size,
      modifiedAt: stat.mtime.toISOString()
    }
  } catch {
    return undefined
  }
}

function parseMdlsValue(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '(null)') return undefined
  return trimmed.replace(/^"|"$/g, '')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getFinderMetadataSnapshot(filePath: string): Promise<FinderMetadataSnapshot> {
  if (process.platform !== 'darwin') return {}

  const keys = [
    'kMDItemAcquisitionMake',
    'kMDItemAcquisitionModel',
    'kMDItemContentCreationDate',
    'kMDItemLatitude',
    'kMDItemLongitude'
  ]

  try {
    const { stdout } = await execFileAsync('/usr/bin/mdls', [
      '-raw',
      ...keys.flatMap((key) => ['-name', key]),
      filePath
    ])
    const values = stdout.split(/\0|\r?\n/).filter((value) => value.length > 0)

    return {
      make: parseMdlsValue(values[0] || ''),
      model: parseMdlsValue(values[1] || ''),
      contentCreationDate: parseMdlsValue(values[2] || ''),
      latitude: parseMdlsValue(values[3] || ''),
      longitude: parseMdlsValue(values[4] || '')
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error reading Finder metadata' }
  }
}

export function hasFinderMetadata(snapshot: FinderMetadataSnapshot): boolean {
  return Boolean(
    snapshot.make ||
    snapshot.model ||
    snapshot.contentCreationDate ||
    snapshot.latitude ||
    snapshot.longitude
  )
}

export async function reimportSpotlightMetadata(filePath: string): Promise<SpotlightReimportResult> {
  const startedAt = Date.now()

  if (process.platform !== 'darwin') {
    return {
      attempted: false,
      durationMs: 0,
      finder: {},
      finderVisible: false
    }
  }

  try {
    await execFileAsync('/usr/bin/mdimport', ['-i', filePath], { timeout: 5000 })
    await sleep(500)
    const finder = await getFinderMetadataSnapshot(filePath)

    return {
      attempted: true,
      durationMs: Date.now() - startedAt,
      finder,
      finderVisible: hasFinderMetadata(finder)
    }
  } catch (error) {
    const finder = await getFinderMetadataSnapshot(filePath)

    return {
      attempted: true,
      durationMs: Date.now() - startedAt,
      finder,
      finderVisible: hasFinderMetadata(finder),
      error: error instanceof Error ? error.message : 'Unknown error reimporting Spotlight metadata'
    }
  }
}

export async function triggerSpotlightImport(filePath: string): Promise<void> {
  if (process.platform !== 'darwin') return

  try {
    await execFileAsync('/usr/bin/mdimport', ['-i', filePath], { timeout: 5000 })
  } catch (error) {
    console.warn('Failed to trigger Spotlight import:', error)
  }
}

let spotlightTaskActive = false
const spotlightTasks: Array<() => Promise<void>> = []

function runNextSpotlightTask(): void {
  if (spotlightTaskActive) return

  const task = spotlightTasks.shift()
  if (!task) return

  spotlightTaskActive = true
  void task().finally(() => {
    spotlightTaskActive = false
    runNextSpotlightTask()
  })
}

function enqueueSpotlightTask(task: () => Promise<void>): void {
  spotlightTasks.push(task)
  runNextSpotlightTask()
}

export function scheduleSpotlightFollowUp(
  filePath: string,
  delayMs: number,
  writeDiagnostics: boolean,
  logPath: string,
  appVersion: string
): void {
  const timeout = setTimeout(() => {
    enqueueSpotlightTask(async () => {
      try {
        if (writeDiagnostics) {
          const spotlight = await reimportSpotlightMetadata(filePath)
          await appendMetadataWriteLog({
            schemaVersion: 1,
            event: 'metadata.spotlightFollowUp',
            timestamp: new Date().toISOString(),
            appVersion,
            filePath,
            filename: path.basename(filePath),
            delayMs,
            spotlight
          }, logPath)
        } else {
          await triggerSpotlightImport(filePath)
        }
      } catch (error) {
        console.warn('Failed to run Spotlight follow-up:', error)
      }
    })
  }, delayMs)

  timeout.unref?.()
}
