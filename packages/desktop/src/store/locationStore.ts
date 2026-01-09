import { create } from 'zustand'
import {
  SavedLocation,
  LocationHistoryEntry,
  GPXTrack,
  LocationValue,
} from '../types'

interface LocationState {
  // Saved locations
  savedLocations: SavedLocation[]
  loadSavedLocations: () => Promise<void>
  saveLocation: (
    location: Omit<SavedLocation, 'id' | 'createdAt' | 'usageCount' | 'lastUsedAt'>
  ) => Promise<void>
  updateSavedLocation: (location: SavedLocation) => Promise<void>
  deleteSavedLocation: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  useLocation: (id: string) => Promise<void>

  // Location history
  locationHistory: LocationHistoryEntry[]
  loadLocationHistory: () => Promise<void>
  addToHistory: (
    location: LocationValue,
    source: LocationHistoryEntry['source']
  ) => Promise<void>
  clearHistory: () => Promise<void>

  // GPX tracks
  gpxTracks: GPXTrack[]
  loadGPXTracks: () => Promise<void>
  deleteGPXTrack: (id: string) => Promise<void>
}

export const useLocationStore = create<LocationState>((set, get) => ({
  savedLocations: [],
  locationHistory: [],
  gpxTracks: [],

  // Saved Locations
  loadSavedLocations: async () => {
    const locations = await window.electronAPI.getSavedLocations()
    set({ savedLocations: locations })
  },

  saveLocation: async (locationData) => {
    const location: SavedLocation = {
      ...locationData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      usageCount: 0,
    }
    await window.electronAPI.saveLocation(location)
    await get().loadSavedLocations()
  },

  updateSavedLocation: async (location) => {
    await window.electronAPI.saveLocation(location)
    await get().loadSavedLocations()
  },

  deleteSavedLocation: async (id) => {
    await window.electronAPI.deleteSavedLocation(id)
    await get().loadSavedLocations()
  },

  toggleFavorite: async (id) => {
    const locations = get().savedLocations
    const location = locations.find((l) => l.id === id)
    if (location) {
      await window.electronAPI.saveLocation({
        ...location,
        isFavorite: !location.isFavorite,
      })
      await get().loadSavedLocations()
    }
  },

  useLocation: async (id) => {
    await window.electronAPI.incrementLocationUsage(id)
    await get().loadSavedLocations()
  },

  // Location History
  loadLocationHistory: async () => {
    const history = await window.electronAPI.getLocationHistory()
    set({ locationHistory: history })
  },

  addToHistory: async (location, source) => {
    const entry: LocationHistoryEntry = {
      id: crypto.randomUUID(),
      location,
      timestamp: new Date().toISOString(),
      source,
    }
    await window.electronAPI.addToLocationHistory(entry)
    await get().loadLocationHistory()
  },

  clearHistory: async () => {
    await window.electronAPI.clearLocationHistory()
    set({ locationHistory: [] })
  },

  // GPX Tracks
  loadGPXTracks: async () => {
    const tracks = await window.electronAPI.getGPXTracks()
    set({ gpxTracks: tracks })
  },

  deleteGPXTrack: async (id) => {
    await window.electronAPI.deleteGPXTrack(id)
    await get().loadGPXTracks()
  },
}))
