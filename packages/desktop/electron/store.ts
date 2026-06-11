import type Store from 'electron-store'
import type {
  CameraProfile,
  CustomValues,
  ProcessingLogEntry,
  SavedLocation,
  LocationHistoryEntry,
  GPXTrack,
} from './ipc-types'
import type { WindowBounds } from './window-state'

export interface StoreSchema {
  profiles: CameraProfile[]
  customValues: CustomValues
  processingLog: ProcessingLogEntry[]
  thumbnailCacheEnabled: boolean
  savedLocations: SavedLocation[]
  locationHistory: LocationHistoryEntry[]
  gpxTracks: GPXTrack[]
  mapboxAccessToken?: string
  windowBounds?: WindowBounds
  lastUsedProfile?: string
}

let storeInstance: Store<StoreSchema> | null = null

// Call once during app startup (before createWindow) to load the ESM module
export async function initStore(): Promise<void> {
  if (storeInstance) return
  const { default: StoreClass } = await import('electron-store')
  storeInstance = new StoreClass<StoreSchema>({
    defaults: {
      profiles: [],
      customValues: {
        isoValues: [],
        apertureValues: [],
        shutterSpeeds: [],
        focalLengths: []
      },
      processingLog: [],
      thumbnailCacheEnabled: true,
      savedLocations: [],
      locationHistory: [],
      gpxTracks: [],
      mapboxAccessToken: undefined
    }
  })
}

export function getStore(): Store<StoreSchema> {
  if (!storeInstance) {
    throw new Error('Store not initialized — call initStore() before getStore()')
  }
  return storeInstance
}
