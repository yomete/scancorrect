// Single source of truth for all types that cross the IPC boundary
// (preload → renderer and main → renderer).
// Types only — no runtime imports allowed here.

export interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
  defaults?: ProfileDefaults
}

export interface ProfileDefaults {
  iso?: number
  aperture?: number
  shutterSpeed?: number
  focalLength?: number
  filmFormat?: string
  exposureComp?: number
  filmStock?: string
  location?: LocationValue
}

export interface LocationValue {
  name: string
  latitude: number
  longitude: number
}

// EXIF metadata that can be read from or written to files.
// Authoritative definition — renderer and electron both import from here.
// A field is absent when the user has not touched it, and null when they have
// asked for the tag to be removed from the file. The two are different: absent
// leaves whatever is on the file alone, null deletes it.
export interface ExifData {
  make?: string | null
  model?: string | null
  lens?: string | null
  iso?: number | null
  aperture?: number | null
  shutterSpeed?: number | null
  focalLength?: number | null
  exposureComp?: number | null
  filmStock?: string | null
  location?: LocationValue | null
  dateOriginal?: string | null // YYYY-MM-DD format
  dateTimeOriginal?: string | null // Full ISO timestamp for GPX matching
}

// Batch EXIF read result: keyed by file path
export type ExifBatchResult = Record<string, { data: ExifData; isScanner: boolean } | { error: string }>

// What a drop turned out to contain once the filesystem was consulted.
export interface CollectedPaths {
  files: string[]
  /** How many folders were dropped. Their contents are in `files`. */
  folders: number
  /** Visible files that are not a JPEG or TIFF, or could not be read at all. */
  unsupported: number
}

export interface CustomValues {
  isoValues: number[]
  apertureValues: number[]
  shutterSpeeds: number[]
  focalLengths: number[]
}

export interface ProcessingLogEntry {
  id: string
  timestamp: string | Date
  filePath: string
  filename: string
  profileUsed?: string
  changesApplied: Partial<ExifData>
  success: boolean
  error?: string
  warning?: string
  backupPath?: string
  /** Set when the user restored this write from its backup. */
  restoredAt?: string
}

export interface FinderMetadataSnapshot {
  make?: string
  model?: string
  contentCreationDate?: string
  latitude?: string
  longitude?: string
  error?: string
}

export interface FolderMetadataVerificationFile {
  filePath: string
  filename: string
  embedded: {
    data?: ExifData
    error?: string
  }
  finder: FinderMetadataSnapshot
  embeddedPresent: boolean
  finderVisible: boolean
}

export interface FolderMetadataVerificationResult {
  folderPath: string
  total: number
  embeddedPresent: number
  embeddedMissing: number
  finderVisible: number
  finderMissing: number
  logPath: string
  files: FolderMetadataVerificationFile[]
}

export interface GeocodingResult {
  displayName: string
  latitude: number
  longitude: number
  type: string
}

export interface SavedLocation extends LocationValue {
  id: string
  createdAt: string
  usageCount: number
  lastUsedAt?: string
  isFavorite: boolean
}

export interface LocationHistoryEntry {
  id: string
  location: LocationValue
  timestamp: string
  source: 'search' | 'map' | 'gpx' | 'manual'
}

export interface GPXTrackPoint {
  latitude: number
  longitude: number
  timestamp: string
  elevation?: number
}

export interface GPXTrack {
  id: string
  name: string
  importedAt: string
  points: GPXTrackPoint[]
}

export interface GPXMatchResult {
  imagePath: string
  imageTimestamp: string
  matchedPoint?: GPXTrackPoint
  matchedLocation?: LocationValue
  timeDifferenceSeconds?: number
  confidence: 'exact' | 'close' | 'far' | 'no_match'
  manualOverride?: LocationValue
}
