import type { IpcMain } from 'electron'
import type Store from 'electron-store' with { 'resolution-mode': 'import' }
import type { GeocodingResponse } from '../geocoding'
import { geocodeLocation } from '../geocoding'
import type { SavedLocation, LocationHistoryEntry } from '../ipc-types'
import type { StoreSchema } from '../store'

interface LocationHandlerDeps {
  ipcMain: IpcMain
  getStore: () => Store<StoreSchema>
}

export function registerLocationHandlers({ ipcMain, getStore }: LocationHandlerDeps): void {
  ipcMain.handle('geocode-location', async (_, query: string): Promise<GeocodingResponse> => {
    return geocodeLocation(query)
  })

  ipcMain.handle('get-saved-locations', (): SavedLocation[] => {
    return getStore().get('savedLocations', [])
  })

  ipcMain.handle('save-location', (_, location: SavedLocation): void => {
    const locations = getStore().get('savedLocations', [])
    const existingIndex = locations.findIndex(l => l.id === location.id)

    if (existingIndex >= 0) {
      locations[existingIndex] = location
    } else {
      locations.push(location)
    }

    getStore().set('savedLocations', locations)
  })

  ipcMain.handle('delete-saved-location', (_, locationId: string): void => {
    const locations = getStore().get('savedLocations', [])
    getStore().set('savedLocations', locations.filter(l => l.id !== locationId))
  })

  ipcMain.handle('increment-location-usage', (_, locationId: string): void => {
    const locations = getStore().get('savedLocations', [])
    const location = locations.find(l => l.id === locationId)
    if (location) {
      location.usageCount++
      location.lastUsedAt = new Date().toISOString()
      getStore().set('savedLocations', locations)
    }
  })

  ipcMain.handle('get-location-history', (): LocationHistoryEntry[] => {
    return getStore().get('locationHistory', [])
  })

  ipcMain.handle('add-to-location-history', (_, entry: LocationHistoryEntry): void => {
    const history = getStore().get('locationHistory', [])
    history.unshift(entry)

    // Keep only last 50 entries
    if (history.length > 50) {
      history.splice(50)
    }

    getStore().set('locationHistory', history)
  })

  ipcMain.handle('clear-location-history', (): void => {
    getStore().set('locationHistory', [])
  })
}
