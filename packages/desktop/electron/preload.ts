import { contextBridge, ipcRenderer } from 'electron'

interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
}

interface ProcessResult {
  file: string
  success: boolean
  error?: string
}

interface GeocodingResult {
  displayName: string
  latitude: number
  longitude: number
  type: string
}

interface ExifData {
  make?: string
  model?: string
  lens?: string
  iso?: number
  aperture?: number
  shutterSpeed?: number
  focalLength?: number
  exposureComp?: number
  filmStock?: string
  location?: {
    name: string
    latitude: number
    longitude: number
  }
  dateOriginal?: string
}

interface CustomValues {
  isoValues: number[]
  apertureValues: number[]
  shutterSpeeds: number[]
  focalLengths: number[]
}

interface ProcessingLogEntry {
  id: string
  timestamp: string
  filePath: string
  filename: string
  profileUsed?: string
  changesApplied: Partial<ExifData>
  success: boolean
  error?: string
  backupPath?: string
}

interface SavedLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  createdAt: string
  usageCount: number
  lastUsedAt?: string
  isFavorite: boolean
}

interface LocationHistoryEntry {
  id: string
  location: {
    name: string
    latitude: number
    longitude: number
  }
  timestamp: string
  source: 'search' | 'map' | 'gpx' | 'manual'
}

interface GPXTrack {
  id: string
  name: string
  importedAt: string
  points: Array<{
    latitude: number
    longitude: number
    timestamp: string
    elevation?: number
  }>
}

interface LicenseStatus {
  key: string
  valid: boolean
  activationId?: string
  machineName?: string
  activatedAt?: string
  lastValidatedAt?: string
  offlineGracePeriodEnd?: string
}

export interface ElectronAPI {
  // Existing profile methods
  getProfiles: () => Promise<CameraProfile[]>
  saveProfile: (profile: CameraProfile) => Promise<void>
  deleteProfile: (profileId: string) => Promise<void>
  editExif: (filePaths: string[], profile: CameraProfile) => Promise<ProcessResult[]>
  showOpenDialog: () => Promise<string[] | undefined>

  // Geocoding
  geocodeLocation: (query: string) => Promise<GeocodingResult[]>

  // EXIF reading and writing
  readExif: (filePath: string) => Promise<{ data: ExifData; isScanner: boolean } | { error: string }>
  writeExif: (filePath: string, data: ExifData, keepBackup?: boolean) => Promise<{ success: boolean; backupPath?: string; error?: string; quotaExceeded?: boolean }>

  // Backup management
  restoreBackup: (filePath: string, backupPath: string) => Promise<{ success: boolean; error?: string }>
  cleanupBackups: (backupPaths: string[]) => Promise<{ success: boolean; errors: string[] }>

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
  getCachedThumbnail: (filePath: string) => Promise<string | null>
  cacheThumbnail: (filePath: string, dataUrl: string) => Promise<boolean>

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
    toleranceSeconds: number
  ) => Promise<Array<{
    imagePath: string
    imageTimestamp: string
    matchedPoint?: { latitude: number; longitude: number; timestamp: string; elevation?: number }
    matchedLocation?: { name: string; latitude: number; longitude: number }
    timeDifferenceSeconds?: number
    confidence: 'exact' | 'close' | 'far' | 'no_match'
  }>>

  // User Tier
  getUserTier: () => Promise<'free' | 'paid'>
  setUserTier: (tier: 'free' | 'paid') => Promise<void>

  // Monthly Quota
  getQuotaStatus: () => Promise<{
    used: number
    limit: number
    remaining: number
    canProcess: boolean
    resetsAt: string
  }>
  checkCanProcess: (imageCount: number) => Promise<{
    canProcess: boolean
    remaining: number
    wouldExceed: boolean
  }>

  // Mapbox Configuration
  getMapboxToken: () => Promise<string | undefined>
  setMapboxToken: (token: string | undefined) => Promise<void>

  // License Management
  activateLicense: (licenseKey: string) => Promise<{ success: boolean; error?: string }>
  getLicenseStatus: () => Promise<LicenseStatus | null>
  deactivateLicense: () => Promise<{ success: boolean; error?: string }>
  validateLicenseOnline: () => Promise<{ valid: boolean; error?: string }>

  // Dev Testing (only works in dev mode)
  devResetLicense: () => Promise<void>
  devExhaustQuota: () => Promise<void>
  devSetPaid: () => Promise<void>
}

const electronAPI: ElectronAPI = {
  // Existing profile methods
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfile: (profile: CameraProfile) => ipcRenderer.invoke('save-profile', profile),
  deleteProfile: (profileId: string) => ipcRenderer.invoke('delete-profile', profileId),
  editExif: (filePaths: string[], profile: CameraProfile) =>
    ipcRenderer.invoke('edit-exif', filePaths, profile),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),

  // Geocoding
  geocodeLocation: (query: string) => ipcRenderer.invoke('geocode-location', query),

  // EXIF reading and writing
  readExif: (filePath: string) => ipcRenderer.invoke('read-exif', filePath),
  writeExif: (filePath: string, data: ExifData, keepBackup: boolean = true) =>
    ipcRenderer.invoke('write-exif', filePath, data, keepBackup),

  // Backup management
  restoreBackup: (filePath: string, backupPath: string) =>
    ipcRenderer.invoke('restore-backup', filePath, backupPath),
  cleanupBackups: (backupPaths: string[]) =>
    ipcRenderer.invoke('cleanup-backups', backupPaths),

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
  getCachedThumbnail: (filePath: string) => ipcRenderer.invoke('get-cached-thumbnail', filePath),
  cacheThumbnail: (filePath: string, dataUrl: string) => ipcRenderer.invoke('cache-thumbnail', filePath, dataUrl),

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
    toleranceSeconds: number
  ) => ipcRenderer.invoke('match-photos-to-gpx', track, images, toleranceSeconds),

  // User Tier
  getUserTier: () => ipcRenderer.invoke('get-user-tier'),
  setUserTier: (tier: 'free' | 'paid') => ipcRenderer.invoke('set-user-tier', tier),

  // Monthly Quota
  getQuotaStatus: () => ipcRenderer.invoke('get-quota-status'),
  checkCanProcess: (imageCount: number) => ipcRenderer.invoke('check-can-process', imageCount),

  // Mapbox Configuration
  getMapboxToken: () => ipcRenderer.invoke('get-mapbox-token'),
  setMapboxToken: (token: string | undefined) => ipcRenderer.invoke('set-mapbox-token', token),

  // License Management
  activateLicense: (licenseKey: string) => ipcRenderer.invoke('activate-license', licenseKey),
  getLicenseStatus: () => ipcRenderer.invoke('get-license-status'),
  deactivateLicense: () => ipcRenderer.invoke('deactivate-license'),
  validateLicenseOnline: () => ipcRenderer.invoke('validate-license-online'),

  // Dev Testing (only works in dev mode)
  devResetLicense: () => ipcRenderer.invoke('dev-reset-license'),
  devExhaustQuota: () => ipcRenderer.invoke('dev-exhaust-quota'),
  devSetPaid: () => ipcRenderer.invoke('dev-set-paid'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}