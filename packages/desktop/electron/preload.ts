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
  writeExif: (filePath: string, data: ExifData, keepBackup?: boolean) => Promise<{ success: boolean; backupPath?: string; error?: string }>

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
  clearProcessingLog: () => ipcRenderer.invoke('clear-processing-log')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}