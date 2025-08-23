export interface CameraProfile {
  id: string
  name: string
  make: string
  model: string
  lens?: string
}

export interface ProcessResult {
  file: string
  success: boolean
  error?: string
}