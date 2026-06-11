import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock window.electronAPI for renderer tests
vi.stubGlobal('electronAPI', {
  getProfiles: vi.fn().mockResolvedValue([]),
  saveProfile: vi.fn().mockResolvedValue(undefined),
  deleteProfile: vi.fn().mockResolvedValue(undefined),
  readExif: vi.fn().mockResolvedValue({}),
  readExifBatch: vi.fn().mockResolvedValue({}),
  writeExif: vi.fn().mockResolvedValue({ success: true }),
  verifyFolderMetadata: vi.fn().mockResolvedValue({ error: 'Verification canceled' }),
  restoreBackup: vi.fn().mockResolvedValue(true),
  getCustomValues: vi.fn().mockResolvedValue({
    isoValues: [],
    apertureValues: [],
    shutterSpeeds: [],
    focalLengths: []
  }),
  saveCustomValue: vi.fn().mockResolvedValue(undefined),
  getProcessingLog: vi.fn().mockResolvedValue([]),
  addLogEntry: vi.fn().mockResolvedValue(undefined),
  clearProcessingLog: vi.fn().mockResolvedValue(undefined),
  extractThumbnail: vi.fn().mockResolvedValue(null),
  getCacheSetting: vi.fn().mockResolvedValue(true),
  setCacheSetting: vi.fn().mockResolvedValue(undefined),
  getCachedThumbnail: vi.fn().mockResolvedValue(null),
  cacheThumbnail: vi.fn().mockResolvedValue(undefined),
  getSavedLocations: vi.fn().mockResolvedValue([]),
  saveLocation: vi.fn().mockResolvedValue(undefined),
  deleteSavedLocation: vi.fn().mockResolvedValue(undefined),
  incrementLocationUsage: vi.fn().mockResolvedValue(undefined),
  getLocationHistory: vi.fn().mockResolvedValue([]),
  addToLocationHistory: vi.fn().mockResolvedValue(undefined),
  clearLocationHistory: vi.fn().mockResolvedValue(undefined),
  getGpxTracks: vi.fn().mockResolvedValue([]),
  saveGpxTrack: vi.fn().mockResolvedValue(undefined),
  deleteGpxTrack: vi.fn().mockResolvedValue(undefined),
  // Uppercase aliases used by locationStore
  getGPXTracks: vi.fn().mockResolvedValue([]),
  saveGPXTrack: vi.fn().mockResolvedValue(undefined),
  deleteGPXTrack: vi.fn().mockResolvedValue(undefined),
  showOpenGpxDialog: vi.fn().mockResolvedValue(null),
  parseGpx: vi.fn().mockResolvedValue(null),
  matchPhotosToGpx: vi.fn().mockResolvedValue([]),
  getMapboxToken: vi.fn().mockResolvedValue(null),
  setMapboxToken: vi.fn().mockResolvedValue(undefined),
  getLastUsedProfile: vi.fn().mockResolvedValue(null),
  setLastUsedProfile: vi.fn().mockResolvedValue(undefined),
  geocodeLocation: vi.fn().mockResolvedValue([]),
  reverseGeocode: vi.fn().mockResolvedValue(null),
  onSaveBeforeClose: vi.fn(),
  offSaveBeforeClose: vi.fn()
})

// Mock window.matchMedia for component tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})
