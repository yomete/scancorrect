import { describe, it, expect, beforeEach } from 'vitest'
import { useImageStore } from './imageStore'
import { ImageFile, CameraProfile } from '../types'

function makeImage(path: string): ImageFile {
  return {
    path,
    filename: path.split('/').pop() ?? path,
    selected: false,
    status: 'pending',
  }
}

beforeEach(() => {
  useImageStore.getState().clearImages()
})

describe('addImages / setImages', () => {
  it('addImages appends to existing images', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    s.addImages([makeImage('/b.jpg')])
    expect(useImageStore.getState().images).toHaveLength(2)
    expect(useImageStore.getState().images.map((i) => i.path)).toEqual(['/a.jpg', '/b.jpg'])
  })

  it('setImages replaces images', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    s.setImages([makeImage('/c.jpg')])
    expect(useImageStore.getState().images).toHaveLength(1)
    expect(useImageStore.getState().images[0].path).toBe('/c.jpg')
  })

  it('setImages clears selection', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    s.selectImage('/a.jpg')
    expect(useImageStore.getState().selectedImageIds.size).toBe(1)
    s.setImages([makeImage('/b.jpg')])
    expect(useImageStore.getState().selectedImageIds.size).toBe(0)
  })
})

describe('selectImage', () => {
  it('single-select: selecting B after A leaves only B', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    s.selectImage('/a.jpg')
    s.selectImage('/b.jpg')
    const ids = useImageStore.getState().selectedImageIds
    expect(ids.has('/a.jpg')).toBe(false)
    expect(ids.has('/b.jpg')).toBe(true)
    expect(ids.size).toBe(1)
  })
})

describe('toggleImageSelection', () => {
  it('adds when not selected', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    s.toggleImageSelection('/a.jpg')
    expect(useImageStore.getState().selectedImageIds.has('/a.jpg')).toBe(true)
  })

  it('removes when already selected', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    s.selectImage('/a.jpg')
    s.toggleImageSelection('/a.jpg')
    expect(useImageStore.getState().selectedImageIds.has('/a.jpg')).toBe(false)
  })
})

describe('selectAllImages / deselectAllImages', () => {
  it('selectAllImages selects all image paths', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    s.selectAllImages()
    const ids = useImageStore.getState().selectedImageIds
    expect(ids.has('/a.jpg')).toBe(true)
    expect(ids.has('/b.jpg')).toBe(true)
    expect(ids.size).toBe(2)
  })

  it('deselectAllImages clears selection', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    s.selectAllImages()
    s.deselectAllImages()
    expect(useImageStore.getState().selectedImageIds.size).toBe(0)
  })
})

describe('removeImages', () => {
  it('removes from images array', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    s.removeImages(['/a.jpg'])
    expect(useImageStore.getState().images).toHaveLength(1)
    expect(useImageStore.getState().images[0].path).toBe('/b.jpg')
  })

  it('also removes from selectedImageIds', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    s.selectAllImages()
    s.removeImages(['/a.jpg'])
    const ids = useImageStore.getState().selectedImageIds
    expect(ids.has('/a.jpg')).toBe(false)
    expect(ids.has('/b.jpg')).toBe(true)
  })
})

describe('updatePendingChanges', () => {
  it('merges without replacing prior pending changes', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    s.updatePendingChanges('/a.jpg', { make: 'Canon' })
    s.updatePendingChanges('/a.jpg', { model: 'AE-1' })
    const img = useImageStore.getState().images[0]
    expect(img.pendingChanges?.make).toBe('Canon')
    expect(img.pendingChanges?.model).toBe('AE-1')
  })
})

describe('updateMultiplePendingChanges', () => {
  it('only touches listed paths', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg'), makeImage('/c.jpg')])
    s.updateMultiplePendingChanges(['/a.jpg', '/b.jpg'], { make: 'Nikon' })
    const [a, b, c] = useImageStore.getState().images
    expect(a.pendingChanges?.make).toBe('Nikon')
    expect(b.pendingChanges?.make).toBe('Nikon')
    expect(c.pendingChanges).toBeUndefined()
  })
})

describe('discardImageChanges / discardAllChanges', () => {
  it('discardImageChanges sets pendingChanges to undefined for that path', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    s.updatePendingChanges('/a.jpg', { make: 'Canon' })
    s.updatePendingChanges('/b.jpg', { make: 'Nikon' })
    s.discardImageChanges('/a.jpg')
    expect(useImageStore.getState().images[0].pendingChanges).toBeUndefined()
    expect(useImageStore.getState().images[1].pendingChanges?.make).toBe('Nikon')
  })

  it('discardAllChanges clears pendingChanges on all images', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    s.updatePendingChanges('/a.jpg', { make: 'Canon' })
    s.updatePendingChanges('/b.jpg', { make: 'Nikon' })
    s.discardAllChanges()
    for (const img of useImageStore.getState().images) {
      expect(img.pendingChanges).toBeUndefined()
    }
  })
})

describe('applyProfileDefaults', () => {
  it('applies make/model/lens to listed paths', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    const profile: CameraProfile = { id: '1', name: 'Canon AE-1', make: 'Canon', model: 'AE-1', lens: '50mm f/1.8' }
    s.applyProfileDefaults(['/a.jpg'], profile)
    const a = useImageStore.getState().images[0]
    expect(a.pendingChanges?.make).toBe('Canon')
    expect(a.pendingChanges?.model).toBe('AE-1')
    expect(a.pendingChanges?.lens).toBe('50mm f/1.8')
    expect(useImageStore.getState().images[1].pendingChanges).toBeUndefined()
  })

  it('applies numeric defaults including iso: 0 (falsy-but-defined number)', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    const profile: CameraProfile = {
      id: '1', name: 'Test', make: 'Canon', model: 'AE-1',
      defaults: { iso: 0, aperture: 2.8, shutterSpeed: 0.008, focalLength: 50, exposureComp: -1 }
    }
    s.applyProfileDefaults(['/a.jpg'], profile)
    const a = useImageStore.getState().images[0]
    expect(a.pendingChanges?.iso).toBe(0)
    expect(a.pendingChanges?.aperture).toBe(2.8)
    expect(a.pendingChanges?.shutterSpeed).toBe(0.008)
    expect(a.pendingChanges?.focalLength).toBe(50)
    expect(a.pendingChanges?.exposureComp).toBe(-1)
  })

  it('applies filmStock only when truthy (empty string is skipped)', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    const profile1: CameraProfile = { id: '1', name: 'Test', make: 'Canon', model: 'AE-1', defaults: { filmStock: '' } }
    s.applyProfileDefaults(['/a.jpg'], profile1)
    expect(useImageStore.getState().images[0].pendingChanges?.filmStock).toBeUndefined()

    const profile2: CameraProfile = { id: '2', name: 'Test2', make: 'Canon', model: 'AE-1', defaults: { filmStock: 'Kodak Gold 200' } }
    s.applyProfileDefaults(['/b.jpg'], profile2)
    expect(useImageStore.getState().images[1].pendingChanges?.filmStock).toBe('Kodak Gold 200')
  })

  it('untouched paths are unchanged', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    const profile: CameraProfile = { id: '1', name: 'Test', make: 'Canon', model: 'AE-1' }
    s.applyProfileDefaults(['/a.jpg'], profile)
    expect(useImageStore.getState().images[1].pendingChanges).toBeUndefined()
  })
})

describe('selectors', () => {
  it('hasUnsavedChanges is false when no images have pending changes', () => {
    expect(useImageStore.getState().hasUnsavedChanges()).toBe(false)
  })

  it('hasUnsavedChanges is false for empty pendingChanges object', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    s.updateImage('/a.jpg', { pendingChanges: {} })
    expect(useImageStore.getState().hasUnsavedChanges()).toBe(false)
  })

  it('hasUnsavedChanges is true when an image has non-empty pendingChanges', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    s.updatePendingChanges('/a.jpg', { make: 'Canon' })
    expect(useImageStore.getState().hasUnsavedChanges()).toBe(true)
  })

  it('getImagesWithChanges returns only images with non-empty pendingChanges', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    s.updatePendingChanges('/a.jpg', { make: 'Canon' })
    const withChanges = useImageStore.getState().getImagesWithChanges()
    expect(withChanges).toHaveLength(1)
    expect(withChanges[0].path).toBe('/a.jpg')
  })

  it('getSelectedImages returns images matching selectedImageIds', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg'), makeImage('/b.jpg')])
    s.selectImage('/a.jpg')
    const selected = useImageStore.getState().getSelectedImages()
    expect(selected).toHaveLength(1)
    expect(selected[0].path).toBe('/a.jpg')
  })
})

describe('setThumbnail', () => {
  it('stores the data URL', () => {
    const s = useImageStore.getState()
    s.addImages([makeImage('/a.jpg')])
    s.setThumbnailLoading('/a.jpg', true)
    expect(useImageStore.getState().thumbnailsLoading.has('/a.jpg')).toBe(true)
    s.setThumbnail('/a.jpg', 'data:image/jpeg;base64,abc')
    expect(useImageStore.getState().thumbnails.get('/a.jpg')).toBe('data:image/jpeg;base64,abc')
  })

  it('clears the loading flag when thumbnail is set', () => {
    const s = useImageStore.getState()
    s.setThumbnailLoading('/a.jpg', true)
    s.setThumbnail('/a.jpg', 'data:image/jpeg;base64,abc')
    expect(useImageStore.getState().thumbnailsLoading.has('/a.jpg')).toBe(false)
  })
})
