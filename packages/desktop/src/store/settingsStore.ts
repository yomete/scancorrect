import { create } from 'zustand'

interface SettingsState {
  thumbnailCacheEnabled: boolean
  setThumbnailCacheEnabled: (enabled: boolean) => void
  loadSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  thumbnailCacheEnabled: true,

  setThumbnailCacheEnabled: async (enabled) => {
    set({ thumbnailCacheEnabled: enabled })
    try {
      await window.electronAPI.setCacheSetting(enabled)
    } catch (error) {
      console.error('Failed to save cache setting:', error)
    }
  },

  loadSettings: async () => {
    try {
      const enabled = await window.electronAPI.getCacheSetting()
      set({ thumbnailCacheEnabled: enabled })
    } catch (error) {
      console.error('Failed to load cache setting:', error)
    }
  }
}))
