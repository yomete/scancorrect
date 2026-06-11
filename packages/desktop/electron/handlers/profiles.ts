import type { IpcMain } from 'electron'
import type Store from 'electron-store' with { 'resolution-mode': 'import' }
import type {
  CameraProfile,
  CustomValues,
  ProcessingLogEntry,
} from '../ipc-types'
import type { StoreSchema } from '../store'

interface ProfileHandlerDeps {
  ipcMain: IpcMain
  getStore: () => Store<StoreSchema>
}

export function registerProfileHandlers({ ipcMain, getStore }: ProfileHandlerDeps): void {
  ipcMain.handle('get-profiles', (): CameraProfile[] => {
    return getStore().get('profiles', []) as CameraProfile[]
  })

  ipcMain.handle('save-profile', (_, profile: CameraProfile): void => {
    const profiles = getStore().get('profiles', []) as CameraProfile[]
    const existingIndex = profiles.findIndex(p => p.id === profile.id)

    if (existingIndex >= 0) {
      profiles[existingIndex] = profile
    } else {
      profiles.push(profile)
    }

    getStore().set('profiles', profiles)
  })

  ipcMain.handle('delete-profile', (_, profileId: string): void => {
    const profiles = getStore().get('profiles', []) as CameraProfile[]
    const filteredProfiles = profiles.filter(p => p.id !== profileId)
    getStore().set('profiles', filteredProfiles)
  })

  ipcMain.handle('get-custom-values', (): CustomValues => {
    return getStore().get('customValues', {
      isoValues: [],
      apertureValues: [],
      shutterSpeeds: [],
      focalLengths: []
    })
  })

  ipcMain.handle('save-custom-value', (_, field: keyof CustomValues, value: number): void => {
    const customValues = getStore().get('customValues', {
      isoValues: [],
      apertureValues: [],
      shutterSpeeds: [],
      focalLengths: []
    })

    if (!customValues[field].includes(value)) {
      customValues[field].push(value)
      customValues[field].sort((a, b) => a - b)
      getStore().set('customValues', customValues)
    }
  })

  ipcMain.handle('get-processing-log', (): ProcessingLogEntry[] => {
    return getStore().get('processingLog', [])
  })

  ipcMain.handle('add-log-entry', (_, entry: ProcessingLogEntry): void => {
    const log = getStore().get('processingLog', [])
    log.unshift(entry)

    // Keep only last 1000 entries to prevent unbounded growth
    if (log.length > 1000) {
      log.splice(1000)
    }

    getStore().set('processingLog', log)
  })

  ipcMain.handle('clear-processing-log', (): void => {
    getStore().set('processingLog', [])
  })
}
