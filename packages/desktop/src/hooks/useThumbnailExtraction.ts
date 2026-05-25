import { useState, useEffect } from 'react'
import { useSettingsStore } from '../store'

interface ThumbnailState {
  thumbnail: string | null
  loading: boolean
  error: boolean
}

const MAX_THUMBNAIL_EXTRACTIONS = 4
let activeThumbnailExtractions = 0
const thumbnailQueue: Array<() => void> = []

function enqueueThumbnailExtraction(task: () => Promise<string | null>): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeThumbnailExtractions += 1
      task()
        .then(resolve, reject)
        .finally(() => {
          activeThumbnailExtractions -= 1
          const next = thumbnailQueue.shift()
          if (next) next()
        })
    }

    if (activeThumbnailExtractions < MAX_THUMBNAIL_EXTRACTIONS) {
      run()
    } else {
      thumbnailQueue.push(run)
    }
  })
}

export function useThumbnailExtraction(filePath: string): ThumbnailState {
  const [state, setState] = useState<ThumbnailState>({
    thumbnail: null,
    loading: true,
    error: false
  })
  const { thumbnailCacheEnabled } = useSettingsStore()

  useEffect(() => {
    let cancelled = false

    async function extractThumbnail() {
      setState({ thumbnail: null, loading: true, error: false })

      try {
        // Check cache first if enabled
        if (thumbnailCacheEnabled) {
          const cached = await window.electronAPI.getCachedThumbnail(filePath)
          if (cached && !cancelled) {
            setState({ thumbnail: cached, loading: false, error: false })
            return
          }
        }

        // Extract thumbnail
        const thumbnail = await enqueueThumbnailExtraction(() =>
          window.electronAPI.extractThumbnail(filePath)
        )

        if (cancelled) return

        if (thumbnail) {
          // Cache it if enabled
          if (thumbnailCacheEnabled) {
            await window.electronAPI.cacheThumbnail(filePath, thumbnail)
          }
          setState({ thumbnail, loading: false, error: false })
        } else {
          setState({ thumbnail: null, loading: false, error: false })
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error extracting thumbnail:', error)
          setState({ thumbnail: null, loading: false, error: true })
        }
      }
    }

    extractThumbnail()

    return () => {
      cancelled = true
    }
  }, [filePath, thumbnailCacheEnabled])

  return state
}
