export interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
}

export interface ProcessResult {
  file: string
  success: boolean
  error?: string
}

export interface ElectronAPI {
  getProfiles(): Promise<CameraProfile[]>
  saveProfile(profile: CameraProfile): Promise<void>
  deleteProfile(profileId: string): Promise<void>
  editExif(filePaths: string[], profile: CameraProfile): Promise<ProcessResult[]>
  showOpenDialog(): Promise<string[] | undefined>
}

export type Theme = 'light' | 'dark' | 'system'

export interface AppConfig {
  theme: Theme
  lastUsedProfile?: string
  windowBounds?: {
    width: number
    height: number
    x?: number
    y?: number
  }
}