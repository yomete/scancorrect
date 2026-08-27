import { ExifTool, Tags } from 'exiftool-vendored'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import type { ExifData } from './ipc-types'

let backupDir = ''

export function initBackupDir(dir: string): void {
  backupDir = dir
}

// How many backups to keep per file: the original the frame arrived as, plus
// this many of the most recent writes. The original is never pruned — it is
// the one a user is most likely to want back, and it is the only one that
// predates anything this app did.
export const RECENT_BACKUPS_KEPT = 4

function backupHash(originalFilePath: string): string {
  return crypto.createHash('sha256').update(originalFilePath).digest('hex')
}

/** The untouched original: the backup taken the first time this file was written. */
export function getBackupPath(originalFilePath: string): string {
  const ext = path.extname(originalFilePath)
  return path.join(backupDir, `${backupHash(originalFilePath)}${ext}`)
}

/** A backup of the file as it stood before this particular write. */
export function getDatedBackupPath(originalFilePath: string, at = new Date()): string {
  const ext = path.extname(originalFilePath)
  const stamp = at.toISOString().replace(/[:.]/g, '-')
  return path.join(backupDir, `${backupHash(originalFilePath)}--${stamp}${ext}`)
}

/**
 * Keep the original plus the most recent RECENT_BACKUPS_KEPT dated backups for
 * this file, and delete the rest. Without this a per-write backup grows without
 * limit — a roll of TIFFs saved a few times over would fill a disk quietly.
 */
export async function pruneBackups(originalFilePath: string): Promise<void> {
  const prefix = `${backupHash(originalFilePath)}--`
  try {
    const entries = await fs.readdir(backupDir)
    const dated = entries.filter((name) => name.startsWith(prefix)).sort()
    const doomed = dated.slice(0, Math.max(0, dated.length - RECENT_BACKUPS_KEPT))
    for (const name of doomed) {
      try {
        await fs.unlink(path.join(backupDir, name))
      } catch {
        // best-effort; a backup we could not remove is not worth failing a write
      }
    }
  } catch {
    // the directory may not exist yet on the very first write
  }
}

async function ensureBackupDir(): Promise<void> {
  await fs.mkdir(backupDir, { recursive: true })
}

async function moveFile(src: string, dest: string): Promise<void> {
  try {
    await fs.rename(src, dest)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
      await fs.copyFile(src, dest)
      await fs.unlink(src)
    } else {
      throw err
    }
  }
}

export type { ExifData } from './ipc-types'

export interface WriteResult {
  success: boolean
  backupPath?: string
  error?: string
  warning?: string
}

// Extended Tags interface for properties not in exiftool-vendored's TypeScript definitions
// These tags are supported by ExifTool but not typed in the library
interface ExtendedTags extends Tags {
  ExposureBiasValue?: number
  Error?: string
  MIMEType?: string
}

/**
 * Reads EXIF data from an image file and returns it in our structured format
 */
export async function readExifData(
  exiftool: ExifTool,
  filePath: string
): Promise<ExifData> {
  const tags = await exiftool.read(filePath) as ExtendedTags

  const exifData: ExifData = {}

  // Camera info
  if (tags.Make) {
    exifData.make = String(tags.Make)
  }
  if (tags.Model) {
    exifData.model = String(tags.Model)
  }
  if (tags.LensModel) {
    exifData.lens = String(tags.LensModel)
  }

  // Exposure settings
  if (tags.ISO !== undefined) {
    exifData.iso = Number(tags.ISO)
  }
  if (tags.FNumber !== undefined) {
    exifData.aperture = Number(tags.FNumber)
  }
  if (tags.ExposureTime !== undefined) {
    exifData.shutterSpeed = Number(tags.ExposureTime)
  }
  if (tags.FocalLength !== undefined) {
    // FocalLength can be a string like "50 mm" or a number
    const focalLength = tags.FocalLength
    if (typeof focalLength === 'string') {
      const match = focalLength.match(/^([\d.]+)/)
      if (match) {
        exifData.focalLength = parseFloat(match[1])
      }
    } else {
      exifData.focalLength = Number(focalLength)
    }
  }
  if (tags.ExposureBiasValue !== undefined) {
    exifData.exposureComp = Number(tags.ExposureBiasValue)
  }

  // Film stock (stored in ImageDescription)
  if (tags.ImageDescription) {
    exifData.filmStock = String(tags.ImageDescription)
  }

  // GPS coordinates
  if (tags.GPSLatitude !== undefined && tags.GPSLongitude !== undefined) {
    let latitude = Number(tags.GPSLatitude)
    let longitude = Number(tags.GPSLongitude)

    // Apply reference directions
    if (tags.GPSLatitudeRef === 'S' || tags.GPSLatitudeRef === 'South') {
      latitude = Math.abs(latitude) * -1
    }
    if (tags.GPSLongitudeRef === 'W' || tags.GPSLongitudeRef === 'West') {
      longitude = Math.abs(longitude) * -1
    }

    exifData.location = {
      name: '', // Location name is not stored in EXIF, would need reverse geocoding
      latitude,
      longitude
    }
  }

  // Date original
  if (tags.DateTimeOriginal) {
    const dateTime = tags.DateTimeOriginal
    // Handle ExifDateTime object from exiftool-vendored
    if (typeof dateTime === 'object' && 'year' in dateTime) {
      const dt = dateTime as { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }
      const year = dt.year
      const month = String(dt.month).padStart(2, '0')
      const day = String(dt.day).padStart(2, '0')
      exifData.dateOriginal = `${year}-${month}-${day}`

      // Also capture full timestamp for GPX matching
      const hour = String(dt.hour ?? 12).padStart(2, '0')
      const minute = String(dt.minute ?? 0).padStart(2, '0')
      const second = String(dt.second ?? 0).padStart(2, '0')
      exifData.dateTimeOriginal = `${year}-${month}-${day}T${hour}:${minute}:${second}`
    } else if (typeof dateTime === 'string') {
      // Handle string format "YYYY:MM:DD HH:MM:SS"
      const match = dateTime.match(/^(\d{4}):(\d{2}):(\d{2})/)
      if (match) {
        exifData.dateOriginal = `${match[1]}-${match[2]}-${match[3]}`
      }
      // Also capture full timestamp
      const fullMatch = dateTime.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/)
      if (fullMatch) {
        exifData.dateTimeOriginal = `${fullMatch[1]}-${fullMatch[2]}-${fullMatch[3]}T${fullMatch[4]}:${fullMatch[5]}:${fullMatch[6]}`
      }
    }
  }

  // exiftool identifies the file whatever its name says, so a text file
  // renamed .jpg comes back as text/plain. Without this it would load looking
  // exactly like a real scan — the extension check at the drop only sees the
  // name, and a preview is no help because the OS thumbnail service renders
  // something for almost any file.
  if (tags.MIMEType && !String(tags.MIMEType).startsWith('image/')) {
    throw new Error(`Not an image: this file is ${tags.MIMEType}`)
  }

  // exiftool resolves rather than rejecting for a file it cannot make sense of
  // — an empty or unreadable frame comes back as a tag set carrying an Error.
  // Nothing downstream looked at that, so such a file loaded as if it were
  // fine. Only treat it as a failure when nothing usable came back: a frame
  // that is damaged but still yields metadata stays loadable and editable,
  // which is the more useful behaviour for a scan the user cannot re-make.
  if (tags.Error && Object.keys(exifData).length === 0) {
    throw new Error(String(tags.Error))
  }

  return exifData
}

/**
 * Writes EXIF data to an image file
 * @param exiftool - ExifTool instance
 * @param filePath - Path to the image file
 * @param data - EXIF data to write
 * @param keepBackup - If true, keeps a backup of the original file (default: true)
 * @returns WriteResult with success status and optional backup path
 */
export async function writeExifData(
  exiftool: ExifTool,
  filePath: string,
  data: ExifData,
  keepBackup: boolean = true
): Promise<WriteResult> {
  try {
    // A field added from the sidebar with nothing typed into it arrives as an
    // empty string. It is not a value the user chose, and writing it either
    // blanks a real tag or fails outright on the numeric ones, so drop it.
    // null is deliberate and survives: it is the user asking for the tag to be
    // removed, which exiftool does when a tag is set to null.
    data = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== '')
    ) as ExifData

    const tags: Record<string, unknown> = {}

    // Camera info
    if (data.make !== undefined) {
      tags.Make = data.make
    }
    if (data.model !== undefined) {
      tags.Model = data.model
    }
    if (data.lens !== undefined) {
      tags.LensModel = data.lens
    }

    // Exposure settings
    if (data.iso !== undefined) {
      tags.ISO = data.iso
    }
    if (data.aperture !== undefined) {
      tags.FNumber = data.aperture
    }
    if (data.shutterSpeed !== undefined) {
      tags.ExposureTime = data.shutterSpeed
    }
    if (data.focalLength !== undefined) {
      tags.FocalLength = data.focalLength
    }
    if (data.exposureComp !== undefined) {
      tags.ExposureBiasValue = data.exposureComp
    }

    // Film stock (stored in ImageDescription)
    if (data.filmStock !== undefined) {
      tags.ImageDescription = data.filmStock
    }

    // GPS coordinates
    if (data.location === null) {
      // Removing a location means removing all four tags, not blanking two.
      tags.GPSLatitude = null
      tags.GPSLongitude = null
      tags.GPSLatitudeRef = null
      tags.GPSLongitudeRef = null
    } else if (data.location !== undefined) {
      const { latitude, longitude } = data.location

      // Write signed values; ExifTool derives the hemisphere from the sign.
      // Passing an absolute value lets the positive sign override an explicit
      // W/S ref, silently mis-tagging Western/Southern coordinates as East/North.
      tags.GPSLatitude = latitude
      tags.GPSLongitude = longitude
      tags.GPSLatitudeRef = latitude >= 0 ? 'N' : 'S'
      tags.GPSLongitudeRef = longitude >= 0 ? 'E' : 'W'
    }

    // Date original - convert from YYYY-MM-DD to EXIF format YYYY:MM:DD HH:MM:SS
    if (data.dateOriginal === null) {
      tags.DateTimeOriginal = null
    } else if (data.dateOriginal !== undefined) {
      const exifDate = data.dateOriginal.replace(/-/g, ':') + ' 12:00:00'
      tags.DateTimeOriginal = exifDate
    }

    // Build options array
    const options: string[] = []
    if (!keepBackup) {
      options.push('-overwrite_original')
    }

    await exiftool.write(filePath, tags, options)

    if (keepBackup) {
      const exiftoolBackup = `${filePath}_original`
      const originalBackupPath = getBackupPath(filePath)
      await ensureBackupDir()
      // The first write keeps the original under its plain name; every write
      // after that gets its own dated backup, so undoing one entry in the
      // History panel returns the file to how it stood before that write.
      const haveOriginal = await fs.access(originalBackupPath).then(() => true, () => false)
      const destBackupPath = haveOriginal ? getDatedBackupPath(filePath) : originalBackupPath
      try {
        await moveFile(exiftoolBackup, destBackupPath)
        if (haveOriginal) await pruneBackups(filePath)
        return { success: true, backupPath: destBackupPath }
      } catch (backupError) {
        try {
          await fs.access(exiftoolBackup)
          return {
            success: true,
            backupPath: exiftoolBackup,
            warning: `Metadata was written, but the backup could not be moved to the app backup folder: ${backupError instanceof Error ? backupError.message : 'Unknown backup error'}`
          }
        } catch {
          return {
            success: false,
            error: `Metadata may have been written, but no backup could be verified: ${backupError instanceof Error ? backupError.message : 'Unknown backup error'}`
          }
        }
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error writing EXIF data'
    }
  }
}

/**
 * Restores a file from its backup
 * @param filePath - Path to the current file to restore
 * @param backupPath - Optional explicit backup path. If not provided, uses the app data backup directory
 */
export async function restoreFromBackup(filePath: string, backupPath?: string): Promise<boolean> {
  const resolvedBackupPath = backupPath || getBackupPath(filePath)
  const restoreId = crypto.randomUUID()
  const restoreTempPath = `${filePath}.scancorrect-restore-${restoreId}`
  const currentBackupPath = `${filePath}.scancorrect-current-${restoreId}`
  let restoreTempCreated = false
  let currentMovedAside = false

  try {
    await fs.access(resolvedBackupPath)
    await fs.copyFile(resolvedBackupPath, restoreTempPath)
    restoreTempCreated = true
    await fs.rename(filePath, currentBackupPath)
    currentMovedAside = true
    try {
      await fs.rename(restoreTempPath, filePath)
      restoreTempCreated = false
    } catch (error) {
      try {
        await fs.rename(currentBackupPath, filePath)
        currentMovedAside = false
      } catch (rollbackError) {
        console.error(`Failed to roll current file back after restore error: ${rollbackError}`)
      }
      throw error
    }

    try {
      await fs.unlink(currentBackupPath)
      currentMovedAside = false
    } catch (error) {
      console.warn(`Restored file, but could not remove temporary current-file backup: ${error}`)
    }

    return true
  } catch (error) {
    if (restoreTempCreated) {
      try {
        await fs.unlink(restoreTempPath)
      } catch {
        // Ignore cleanup errors; preserving the original file is more important.
      }
    }

    if (currentMovedAside) {
      try {
        await fs.rename(currentBackupPath, filePath)
      } catch {
        // If this fails, surface the restore failure below.
      }
    }

    console.error(`Failed to restore from backup: ${error}`)
    return false
  }
}
