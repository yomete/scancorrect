import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLocationStore } from './locationStore'
import { SavedLocation } from '../types'

function makeLocation(overrides: Partial<SavedLocation> = {}): SavedLocation {
  return {
    id: 'loc-1',
    name: 'Paris',
    latitude: 48.8566,
    longitude: 2.3522,
    createdAt: '2026-01-01T00:00:00.000Z',
    usageCount: 0,
    isFavorite: false,
    ...overrides,
  }
}

beforeEach(() => {
  useLocationStore.setState({ savedLocations: [], locationHistory: [], gpxTracks: [] })
  vi.clearAllMocks()
})

describe('loadSavedLocations', () => {
  it('puts IPC result into state', async () => {
    const locations = [makeLocation()]
    vi.mocked(window.electronAPI.getSavedLocations).mockResolvedValue(locations)
    await useLocationStore.getState().loadSavedLocations()
    expect(useLocationStore.getState().savedLocations).toEqual(locations)
  })
})

describe('saveLocation', () => {
  it('calls electronAPI.saveLocation with generated id, createdAt, usageCount 0, then reloads', async () => {
    vi.mocked(window.electronAPI.getSavedLocations).mockResolvedValue([])
    await useLocationStore.getState().saveLocation({
      name: 'Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      isFavorite: false,
    })
    expect(window.electronAPI.saveLocation).toHaveBeenCalledOnce()
    const arg = vi.mocked(window.electronAPI.saveLocation).mock.calls[0][0] as SavedLocation
    expect(arg.id).toBeTruthy()
    expect(arg.usageCount).toBe(0)
    expect(arg.createdAt).toBeTruthy()
    expect(window.electronAPI.getSavedLocations).toHaveBeenCalled()
  })
})

describe('toggleFavorite', () => {
  it('flips isFavorite on the matching location', async () => {
    const loc = makeLocation({ id: 'loc-1', isFavorite: false })
    useLocationStore.setState({ savedLocations: [loc] })
    vi.mocked(window.electronAPI.getSavedLocations).mockResolvedValue([{ ...loc, isFavorite: true }])
    await useLocationStore.getState().toggleFavorite('loc-1')
    const savedArg = vi.mocked(window.electronAPI.saveLocation).mock.calls[0][0] as SavedLocation
    expect(savedArg.isFavorite).toBe(true)
    expect(useLocationStore.getState().savedLocations[0].isFavorite).toBe(true)
  })

  it('is a no-op for unknown ids', async () => {
    useLocationStore.setState({ savedLocations: [] })
    await useLocationStore.getState().toggleFavorite('unknown-id')
    expect(window.electronAPI.saveLocation).not.toHaveBeenCalled()
  })
})

describe('deleteSavedLocation', () => {
  it('calls electronAPI.deleteSavedLocation and reloads', async () => {
    vi.mocked(window.electronAPI.getSavedLocations).mockResolvedValue([])
    await useLocationStore.getState().deleteSavedLocation('loc-1')
    expect(window.electronAPI.deleteSavedLocation).toHaveBeenCalledWith('loc-1')
    expect(window.electronAPI.getSavedLocations).toHaveBeenCalled()
  })
})

describe('useLocation', () => {
  it('calls incrementLocationUsage and reloads', async () => {
    vi.mocked(window.electronAPI.getSavedLocations).mockResolvedValue([])
    await useLocationStore.getState().useLocation('loc-1')
    expect(window.electronAPI.incrementLocationUsage).toHaveBeenCalledWith('loc-1')
    expect(window.electronAPI.getSavedLocations).toHaveBeenCalled()
  })
})

describe('addToHistory', () => {
  it('creates entry with id, timestamp, source and calls IPC', async () => {
    vi.mocked(window.electronAPI.getLocationHistory).mockResolvedValue([])
    await useLocationStore.getState().addToHistory(
      { name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
      'search'
    )
    expect(window.electronAPI.addToLocationHistory).toHaveBeenCalledOnce()
    const entry = vi.mocked(window.electronAPI.addToLocationHistory).mock.calls[0][0]
    expect(entry.id).toBeTruthy()
    expect(entry.timestamp).toBeTruthy()
    expect(entry.source).toBe('search')
  })
})

describe('clearHistory', () => {
  it('calls IPC and clears state', async () => {
    useLocationStore.setState({ locationHistory: [{ id: 'h1', location: { name: 'Paris', latitude: 0, longitude: 0 }, timestamp: '', source: 'search' }] })
    await useLocationStore.getState().clearHistory()
    expect(window.electronAPI.clearLocationHistory).toHaveBeenCalled()
    expect(useLocationStore.getState().locationHistory).toHaveLength(0)
  })
})

describe('loadGPXTracks', () => {
  it('puts IPC result into gpxTracks state', async () => {
    const tracks = [{ id: 'track-1', name: 'Morning run', importedAt: '2026-01-01T00:00:00.000Z', points: [] }]
    vi.mocked(window.electronAPI.getGPXTracks).mockResolvedValue(tracks)
    await useLocationStore.getState().loadGPXTracks()
    expect(useLocationStore.getState().gpxTracks).toEqual(tracks)
  })
})

describe('deleteGPXTrack', () => {
  it('calls electronAPI.deleteGPXTrack and reloads', async () => {
    vi.mocked(window.electronAPI.getGPXTracks).mockResolvedValue([])
    await useLocationStore.getState().deleteGPXTrack('track-1')
    expect(window.electronAPI.deleteGPXTrack).toHaveBeenCalledWith('track-1')
    expect(window.electronAPI.getGPXTracks).toHaveBeenCalled()
  })
})
