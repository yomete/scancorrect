import { CameraProfile } from './types'

export function generateProfileId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function formatProfileName(profile: CameraProfile): string {
  const parts = [profile.make, profile.model]
  if (profile.lens) {
    parts.push(`(${profile.lens})`)
  }
  return parts.join(' ')
}

export function validateProfile(profile: Partial<CameraProfile>): profile is CameraProfile {
  return !!(
    profile.id &&
    profile.name &&
    profile.make &&
    profile.model
  )
}

export function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.tiff', '.tif']
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return imageExtensions.includes(ext)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}