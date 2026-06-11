// Note: this CameraProfile is for shared utilities only (formatProfileName etc.)
// The canonical IPC-boundary CameraProfile lives in packages/desktop/electron/ipc-types.ts
export interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
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