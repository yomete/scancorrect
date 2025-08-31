import { contextBridge, ipcRenderer } from 'electron'

interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
}

interface ProcessResult {
  file: string
  success: boolean
  error?: string
}

export interface ElectronAPI {
  getProfiles: () => Promise<CameraProfile[]>
  saveProfile: (profile: CameraProfile) => Promise<void>
  deleteProfile: (profileId: string) => Promise<void>
  editExif: (filePaths: string[], profile: CameraProfile) => Promise<ProcessResult[]>
  showOpenDialog: () => Promise<string[] | undefined>
}

const electronAPI: ElectronAPI = {
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  saveProfile: (profile: CameraProfile) => ipcRenderer.invoke('save-profile', profile),
  deleteProfile: (profileId: string) => ipcRenderer.invoke('delete-profile', profileId),
  editExif: (filePaths: string[], profile: CameraProfile) => 
    ipcRenderer.invoke('edit-exif', filePaths, profile),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}