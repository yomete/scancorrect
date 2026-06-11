// IPC-boundary types — single source of truth lives in electron/ipc-types.ts
export type {
  CameraProfile,
  ProfileDefaults,
  LocationValue,
  ExifData,
  CustomValues,
  ProcessingLogEntry,
  FinderMetadataSnapshot,
  FolderMetadataVerificationFile,
  FolderMetadataVerificationResult,
  GeocodingResult,
  SavedLocation,
  LocationHistoryEntry,
  GPXTrackPoint,
  GPXTrack,
  GPXMatchResult,
} from '../electron/ipc-types'

import type { ExifData } from '../electron/ipc-types'

// Renderer-only types below — these do not cross the IPC boundary.

// Image file state for tracking files in the app
export interface ImageFile {
  path: string
  filename: string
  existingExif?: ExifData
  pendingChanges?: ExifData
  mergeDecisions?: MergeDecision[]
  selected: boolean
  status: 'pending' | 'processing' | 'success' | 'error'
  error?: string
}

// User's decision for merge conflicts between existing and new values
export interface MergeDecision {
  field: keyof ExifData
  choice: 'keep' | 'overwrite'
}

// Processing result (legacy interface for backwards compatibility)
export interface ProcessResult {
  file: string
  success: boolean
  error?: string
}

// ============================================
// Mapbox Configuration
// ============================================

export interface MapboxConfig {
  accessToken: string
  style?: string // Default: 'mapbox://styles/mapbox/streets-v12'
}
