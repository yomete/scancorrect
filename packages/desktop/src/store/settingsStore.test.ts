import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSettingsStore } from './settingsStore'

beforeEach(() => {
  useSettingsStore.setState({ thumbnailCacheEnabled: true })
  vi.clearAllMocks()
})

describe('defaults', () => {
  it('thumbnailCacheEnabled defaults to true', () => {
    expect(useSettingsStore.getState().thumbnailCacheEnabled).toBe(true)
  })
})

describe('setThumbnailCacheEnabled', () => {
  it('updates state', async () => {
    await useSettingsStore.getState().setThumbnailCacheEnabled(false)
    expect(useSettingsStore.getState().thumbnailCacheEnabled).toBe(false)
  })

  it('calls setCacheSetting with the new value', async () => {
    await useSettingsStore.getState().setThumbnailCacheEnabled(false)
    expect(window.electronAPI.setCacheSetting).toHaveBeenCalledWith(false)
  })

  it('state still updates even if persistence fails', async () => {
    vi.mocked(window.electronAPI.setCacheSetting).mockRejectedValueOnce(new Error('disk error'))
    await useSettingsStore.getState().setThumbnailCacheEnabled(false)
    expect(useSettingsStore.getState().thumbnailCacheEnabled).toBe(false)
  })
})

describe('loadSettings', () => {
  it('reads getCacheSetting and updates state', async () => {
    vi.mocked(window.electronAPI.getCacheSetting).mockResolvedValueOnce(false)
    await useSettingsStore.getState().loadSettings()
    expect(useSettingsStore.getState().thumbnailCacheEnabled).toBe(false)
  })

  it('leaves prior state if getCacheSetting fails', async () => {
    vi.mocked(window.electronAPI.getCacheSetting).mockRejectedValueOnce(new Error('ipc error'))
    useSettingsStore.setState({ thumbnailCacheEnabled: true })
    await useSettingsStore.getState().loadSettings()
    expect(useSettingsStore.getState().thumbnailCacheEnabled).toBe(true)
  })
})
