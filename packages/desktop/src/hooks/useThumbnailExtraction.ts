import { useState, useEffect } from 'react'

interface ThumbnailState {
  thumbnail: string | null
  loading: boolean
  error: boolean
}

const MAX_THUMBNAIL_EXTRACTIONS = 8
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

  useEffect(() => {
    let cancelled = false

    async function loadThumbnail() {
      setState({ thumbnail: null, loading: true, error: false })

      try {
        // Cache orchestration moved to main process — one IPC call handles
        // cache check, extraction on miss, and cache write.
        const thumbnail = await enqueueThumbnailExtraction(() =>
          window.electronAPI.extractThumbnail(filePath)
        )

        if (cancelled) return

        if (thumbnail) {
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

    loadThumbnail()

    return () => {
      cancelled = true
    }
  }, [filePath])

  return state
}
