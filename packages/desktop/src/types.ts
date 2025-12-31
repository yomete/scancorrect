// Camera Profile with extended default metadata fields
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
  aperture?: number // Store as raw number (2.8, not "f/2.8")
  shutterSpeed?: number // Store as decimal seconds (0.008 for 1/125)
  focalLength?: number // Actual focal length in mm
  filmFormat?: string // For 35mm equivalent calculation
  exposureComp?: number // EV value (-2, -1, 0, +1, +2, etc.)
  filmStock?: string // Written to ImageDescription
  location?: LocationValue
}

export interface LocationValue {
  name: string // Display name
  latitude: number
  longitude: number
}

// Image file state for tracking files in the app
export interface ImageFile {
  path: string
  filename: string
  existingExif?: ExifData // Read from file
  pendingChanges?: ExifData // User modifications
  mergeDecisions?: MergeDecision[] // User choices for conflicts
  selected: boolean
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
}

// EXIF metadata that can be read from or written to files
export interface ExifData {
  make?: string
  model?: string
  lens?: string
  iso?: number
  aperture?: number
  shutterSpeed?: number
  focalLength?: number
  exposureComp?: number
  filmStock?: string
  location?: LocationValue
  dateOriginal?: string // YYYY-MM-DD format
}

// User's decision for merge conflicts between existing and new values
export interface MergeDecision {
  field: keyof ExifData
  choice: 'keep' | 'overwrite'
}

// Processing log entry for tracking all edits
export interface ProcessingLogEntry {
  id: string
  timestamp: Date
  filePath: string
  filename: string
  profileUsed?: string
  changesApplied: Partial<ExifData>
  success: boolean
  error?: string
  backupPath?: string // For undo functionality
}

// User-added custom values for dropdowns
export interface CustomValues {
  isoValues: number[] // User-added ISO values
  apertureValues: number[] // User-added aperture values
  shutterSpeeds: number[] // User-added shutter speeds (as decimals)
  focalLengths: number[] // User-added focal lengths
}

// Result from geocoding service
export interface GeocodingResult {
  displayName: string
  latitude: number
  longitude: number
  type: string
}

// Processing result (legacy interface for backwards compatibility)
export interface ProcessResult {
  file: string
  success: boolean
  error?: string
}
