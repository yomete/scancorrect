import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  CameraProfile,
  ExifData,
  ExifBatchResult,
  CustomValues,
  ProcessingLogEntry,
  FolderMetadataVerificationResult,
  GeocodingResult,
  SavedLocation,
  LocationHistoryEntry,
  GPXTrack,
  GPXMatchResult,
} from './ipc-types'

export interface ElectronAPI {
  // Existing profile methods
  getProfiles: () => Promise<CameraProfile[]>
  saveProfile: (profile: CameraProfile) => Promise<void>
  deleteProfile: (profileId: string) => Promise<void>
  showOpenDialog: () => Promise<string[] | undefined>

  // Platform info + dropped-file path resolution
  platform: string
  getPathForFile: (file: File) => string

  // Geocoding
  geocodeLocation: (query: string) => Promise<GeocodingResult[] | { error: 'rate-limited' | 'offline' | 'failed' }>

  // EXIF reading and writing
  readExif: (filePath: string) => Promise<{ data: ExifData; isScanner: boolean } | { error: string }>
  readExifBatch: (filePaths: string[]) => Promise<ExifBatchResult>
  writeExif: (filePath: string, data: ExifData) => Promise<{ success: boolean; backupPath?: string; error?: string; warning?: string }>
  verifyFolderMetadata: () => Promise<FolderMetadataVerificationResult | { error: string }>

  // Backup management
  restoreBackup: (filePath: string, backupPath: string) => Promise<{ success: boolean; error?: string }>

  // Custom values management
  getCustomValues: () => Promise<CustomValues>
  saveCustomValue: (field: keyof CustomValues, value: number) => Promise<void>

  // Processing log
  getProcessingLog: () => Promise<ProcessingLogEntry[]>
  addLogEntry: (entry: ProcessingLogEntry) => Promise<void>
  clearProcessingLog: () => Promise<void>

  // Thumbnail extraction and caching
  extractThumbnail: (filePath: string) => Promise<string | null>
  getCacheSetting: () => Promise<boolean>
  setCacheSetting: (enabled: boolean) => Promise<void>

  // Window management
  forceCloseWindow: () => Promise<void>
  onSaveBeforeClose: (callback: () => void) => () => void

  // Saved Locations
  getSavedLocations: () => Promise<SavedLocation[]>
  saveLocation: (location: SavedLocation) => Promise<void>
  deleteSavedLocation: (locationId: string) => Promise<void>
  incrementLocationUsage: (locationId: string) => Promise<void>

  // Location History
  getLocationHistory: () => Promise<LocationHistoryEntry[]>
  addToLocationHistory: (entry: LocationHistoryEntry) => Promise<void>
  clearLocationHistory: () => Promise<void>

  // GPX Tracks
  getGPXTracks: () => Promise<GPXTrack[]>
  saveGPXTrack: (track: GPXTrack) => Promise<void>
  deleteGPXTrack: (trackId: string) => Promise<void>
  showOpenGPXDialog: () => Promise<{ filePath: string; content: string } | null>
  parseGPX: (content: string) => Promise<GPXTrack>
  matchPhotosToGPX: (
    track: GPXTrack,
    images: Array<{ path: string; timestamp: string }>,
    toleranceSeconds?: number,
    cameraUtcOffsetMinutes?: number | null
  ) => Promise<GPXMatchResult[]>

  // Mapbox Configuration
  getMapboxToken: () => Promise<string | undefined>
  setMapboxToken: (token: string | undefined) => Promise<void>

  // Last-used profile
  getLastUsedProfile: () => Promise<string | null>
  setLastUsedProfile: (profileId: string | null) => Promise<void>

  // Auto-update
  onUpdateReady: (callback: (version: string) => void) => () => void
  installUpdateNow: () => Promise<void>

}

const electronAPI: ElectronAPI = {
  // Existing profile methods
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfile: (profile: CameraProfile) => ipcRenderer.invoke('save-profile', profile),
  deleteProfile: (profileId: string) => ipcRenderer.invoke('delete-profile', profileId),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),

  // Platform info + dropped-file path resolution (webUtils replaces the
  // deprecated File.path, which was removed in Electron 32)
  platform: process.platform,
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // Geocoding
  geocodeLocation: (query: string) => ipcRenderer.invoke('geocode-location', query),

  // EXIF reading and writing
  readExif: (filePath: string) => ipcRenderer.invoke('read-exif', filePath),
  readExifBatch: (filePaths: string[]) => ipcRenderer.invoke('read-exif-batch', filePaths),
  writeExif: (filePath: string, data: ExifData) =>
    ipcRenderer.invoke('write-exif', filePath, data),
  verifyFolderMetadata: () => ipcRenderer.invoke('verify-folder-metadata'),

  // Backup management
  restoreBackup: (filePath: string, backupPath: string) =>
    ipcRenderer.invoke('restore-backup', filePath, backupPath),

  // Custom values management
  getCustomValues: () => ipcRenderer.invoke('get-custom-values'),
  saveCustomValue: (field: keyof CustomValues, value: number) =>
    ipcRenderer.invoke('save-custom-value', field, value),

  // Processing log
  getProcessingLog: () => ipcRenderer.invoke('get-processing-log'),
  addLogEntry: (entry: ProcessingLogEntry) => ipcRenderer.invoke('add-log-entry', entry),
  clearProcessingLog: () => ipcRenderer.invoke('clear-processing-log'),

  // Thumbnail extraction and caching
  extractThumbnail: (filePath: string) => ipcRenderer.invoke('extract-thumbnail', filePath),
  getCacheSetting: () => ipcRenderer.invoke('get-cache-setting'),
  setCacheSetting: (enabled: boolean) => ipcRenderer.invoke('set-cache-setting', enabled),

  // Window management
  forceCloseWindow: () => ipcRenderer.invoke('force-close-window'),
  onSaveBeforeClose: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('save-before-close', listener)
    return () => ipcRenderer.removeListener('save-before-close', listener)
  },

  // Saved Locations
  getSavedLocations: () => ipcRenderer.invoke('get-saved-locations'),
  saveLocation: (location: SavedLocation) => ipcRenderer.invoke('save-location', location),
  deleteSavedLocation: (locationId: string) => ipcRenderer.invoke('delete-saved-location', locationId),
  incrementLocationUsage: (locationId: string) => ipcRenderer.invoke('increment-location-usage', locationId),

  // Location History
  getLocationHistory: () => ipcRenderer.invoke('get-location-history'),
  addToLocationHistory: (entry: LocationHistoryEntry) => ipcRenderer.invoke('add-to-location-history', entry),
  clearLocationHistory: () => ipcRenderer.invoke('clear-location-history'),

  // GPX Tracks
  getGPXTracks: () => ipcRenderer.invoke('get-gpx-tracks'),
  saveGPXTrack: (track: GPXTrack) => ipcRenderer.invoke('save-gpx-track', track),
  deleteGPXTrack: (trackId: string) => ipcRenderer.invoke('delete-gpx-track', trackId),
  showOpenGPXDialog: () => ipcRenderer.invoke('show-open-gpx-dialog'),
  parseGPX: (content: string) => ipcRenderer.invoke('parse-gpx', content),
  matchPhotosToGPX: (
    track: GPXTrack,
    images: Array<{ path: string; timestamp: string }>,
    toleranceSeconds?: number,
    cameraUtcOffsetMinutes?: number | null
  ) => ipcRenderer.invoke(
    'match-photos-to-gpx',
    track,
    images,
    toleranceSeconds,
    cameraUtcOffsetMinutes
  ),

  // Mapbox Configuration
  getMapboxToken: () => ipcRenderer.invoke('get-mapbox-token'),
  setMapboxToken: (token: string | undefined) => ipcRenderer.invoke('set-mapbox-token', token),

  // Last-used profile
  getLastUsedProfile: () => ipcRenderer.invoke('get-last-used-profile'),
  setLastUsedProfile: (profileId: string | null) => ipcRenderer.invoke('set-last-used-profile', profileId),

  // Auto-update
  onUpdateReady: (callback: (version: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, version: string) => callback(version)
    ipcRenderer.on('update-ready', listener)
    return () => ipcRenderer.removeListener('update-ready', listener)
  },
  installUpdateNow: () => ipcRenderer.invoke('install-update-now'),

}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
