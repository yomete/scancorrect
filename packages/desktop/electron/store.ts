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

// Lazy-load electron-store to avoid module-level electron initialization
let storeInstance: Store<StoreSchema> | null = null

export function getStore(): Store<StoreSchema> {
  if (!storeInstance) {
    // Dynamic require to avoid module-level electron initialization
    const StoreClass = require('electron-store').default
    storeInstance = new StoreClass({
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
  return storeInstance!
}
