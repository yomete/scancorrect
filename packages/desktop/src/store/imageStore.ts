import { create } from 'zustand'
import { ImageFile, ExifData, CameraProfile } from '../types'

interface ImageState {
  // Images and selection
  images: ImageFile[]
  selectedImageIds: Set<string>

  // Thumbnails
  thumbnails: Map<string, string> // path -> base64 data URL
  thumbnailsLoading: Set<string>

  // Actions
  setImages: (images: ImageFile[]) => void
  addImages: (images: ImageFile[]) => void
  updateImage: (path: string, updates: Partial<ImageFile>) => void
  removeImages: (paths: string[]) => void
  clearImages: () => void

  // Selection
  selectImage: (path: string) => void
  deselectImage: (path: string) => void
  toggleImageSelection: (path: string) => void
  selectAllImages: () => void
  deselectAllImages: () => void
  setSelectedImageIds: (ids: Set<string>) => void

  // Pending changes
  updatePendingChanges: (path: string, changes: Partial<ExifData>) => void
  updateMultiplePendingChanges: (paths: string[], changes: Partial<ExifData>) => void
  discardImageChanges: (path: string) => void
  discardAllChanges: () => void
  applyProfileDefaults: (paths: string[], profile: CameraProfile) => void

  // Thumbnails
  setThumbnail: (path: string, thumbnail: string) => void
  setThumbnailLoading: (path: string, loading: boolean) => void

  // Selectors
  getSelectedImages: () => ImageFile[]
  hasUnsavedChanges: () => boolean
  getImagesWithChanges: () => ImageFile[]
}

export const useImageStore = create<ImageState>((set, get) => ({
  images: [],
  selectedImageIds: new Set(),
  thumbnails: new Map(),
  thumbnailsLoading: new Set(),

  // Image management
  setImages: (images) => set({ images, selectedImageIds: new Set() }),

  addImages: (newImages) => set((state) => ({
    images: [...state.images, ...newImages]
  })),

  updateImage: (path, updates) => set((state) => ({
    images: state.images.map((img) =>
      img.path === path ? { ...img, ...updates } : img
    )
  })),

  removeImages: (paths) => set((state) => {
    const pathSet = new Set(paths)
    return {
      images: state.images.filter((img) => !pathSet.has(img.path)),
      selectedImageIds: new Set(
        Array.from(state.selectedImageIds).filter((id) => !pathSet.has(id))
      )
    }
  }),

  clearImages: () => set({
    images: [],
    selectedImageIds: new Set(),
    thumbnails: new Map(),
    thumbnailsLoading: new Set()
  }),

  // Selection
  selectImage: (path) => set((_state) => {
    // Deselect all others, select only this one
    return { selectedImageIds: new Set([path]) }
  }),

  deselectImage: (path) => set((state) => {
    const newIds = new Set(state.selectedImageIds)
    newIds.delete(path)
    return { selectedImageIds: newIds }
  }),

  toggleImageSelection: (path) => set((state) => {
    const newIds = new Set(state.selectedImageIds)
    if (newIds.has(path)) {
      newIds.delete(path)
    } else {
      newIds.add(path)
    }
    return { selectedImageIds: newIds }
  }),

  selectAllImages: () => set((state) => ({
    selectedImageIds: new Set(state.images.map((img) => img.path))
  })),

  deselectAllImages: () => set({ selectedImageIds: new Set() }),

  setSelectedImageIds: (ids) => set({ selectedImageIds: ids }),

  // Pending changes
  updatePendingChanges: (path, changes) => set((state) => ({
    images: state.images.map((img) =>
      img.path === path
        ? {
            ...img,
            pendingChanges: { ...img.pendingChanges, ...changes }
          }
        : img
    )
  })),

  updateMultiplePendingChanges: (paths, changes) => set((state) => {
    const pathSet = new Set(paths)
    return {
      images: state.images.map((img) =>
        pathSet.has(img.path)
          ? {
              ...img,
              pendingChanges: { ...img.pendingChanges, ...changes }
            }
          : img
      )
    }
  }),

  discardImageChanges: (path) => set((state) => ({
    images: state.images.map((img) =>
      img.path === path ? { ...img, pendingChanges: undefined } : img
    )
  })),

  discardAllChanges: () => set((state) => ({
    images: state.images.map((img) => ({ ...img, pendingChanges: undefined }))
  })),

  applyProfileDefaults: (paths, profile) => set((state) => {
    const pathSet = new Set(paths)
    return {
      images: state.images.map((img) => {
        if (!pathSet.has(img.path)) return img

        const pendingChanges: ExifData = { ...img.pendingChanges }

        if (profile.make) pendingChanges.make = profile.make
        if (profile.model) pendingChanges.model = profile.model
        if (profile.lens) pendingChanges.lens = profile.lens

        if (profile.defaults) {
          if (profile.defaults.iso !== undefined) pendingChanges.iso = profile.defaults.iso
          if (profile.defaults.aperture !== undefined) pendingChanges.aperture = profile.defaults.aperture
          if (profile.defaults.shutterSpeed !== undefined) pendingChanges.shutterSpeed = profile.defaults.shutterSpeed
          if (profile.defaults.focalLength !== undefined) pendingChanges.focalLength = profile.defaults.focalLength
          if (profile.defaults.exposureComp !== undefined) pendingChanges.exposureComp = profile.defaults.exposureComp
          if (profile.defaults.filmStock) pendingChanges.filmStock = profile.defaults.filmStock
          if (profile.defaults.location) pendingChanges.location = profile.defaults.location
        }

        return { ...img, pendingChanges }
      })
    }
  }),

  // Thumbnails
  setThumbnail: (path, thumbnail) => set((state) => {
    const newThumbnails = new Map(state.thumbnails)
    newThumbnails.set(path, thumbnail)
    const newLoading = new Set(state.thumbnailsLoading)
    newLoading.delete(path)
    return { thumbnails: newThumbnails, thumbnailsLoading: newLoading }
  }),

  setThumbnailLoading: (path, loading) => set((state) => {
    const newLoading = new Set(state.thumbnailsLoading)
    if (loading) {
      newLoading.add(path)
    } else {
      newLoading.delete(path)
    }
    return { thumbnailsLoading: newLoading }
  }),

  // Selectors
  getSelectedImages: () => {
    const state = get()
    return state.images.filter((img) => state.selectedImageIds.has(img.path))
  },

  hasUnsavedChanges: () => {
    const state = get()
    return state.images.some(
      (img) => img.pendingChanges && Object.keys(img.pendingChanges).length > 0
    )
  },

  getImagesWithChanges: () => {
    const state = get()
    return state.images.filter(
      (img) => img.pendingChanges && Object.keys(img.pendingChanges).length > 0
    )
  }
}))
