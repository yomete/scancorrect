import React, { useState, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { GPXTrack, GPXMatchResult, LocationValue } from '../../types'
import { GPXMatchResults } from './GPXMatchResults'

interface GPXImportModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (results: Array<{ imagePath: string; location: LocationValue }>) => void
  images: Array<{ path: string; dateTimeOriginal?: string }>
}

type Step = 'import' | 'configure' | 'results'

const CAMERA_TIMEZONE_OPTIONS = [
  ...Array.from({ length: 27 }, (_, index) => (index - 12) * 60),
  330,
  570,
].sort((a, b) => a - b)

export function GPXImportModal({
  isOpen,
  onClose,
  onApply,
  images,
}: GPXImportModalProps) {
  const [step, setStep] = useState<Step>('import')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [track, setTrack] = useState<GPXTrack | null>(null)
  const [tolerance, setTolerance] = useState(30) // seconds
  const [cameraOffset, setCameraOffset] = useState<number | null>(null)
  const [matchResults, setMatchResults] = useState<GPXMatchResult[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())

  const resetState = () => {
    setStep('import')
    setIsLoading(false)
    setError(null)
    setTrack(null)
    setTolerance(30)
    setCameraOffset(null)
    setMatchResults([])
    setSelectedPaths(new Set())
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleImportGPX = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.showOpenGPXDialog()
      if (!result) {
        setIsLoading(false)
        return
      }

      const parsedTrack = await window.electronAPI.parseGPX(result.content)
      setTrack(parsedTrack)
      setStep('configure')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import GPX file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMatchPhotos = async () => {
    if (!track) return

    setIsLoading(true)
    setError(null)

    try {
      const imagesToMatch = images.map((img) => ({
        path: img.path,
        timestamp: img.dateTimeOriginal || '',
      }))

      const results = await window.electronAPI.matchPhotosToGPX(
        track,
        imagesToMatch,
        tolerance,
        cameraOffset
      )

      setMatchResults(results)

      // Auto-select all matches that aren't "no_match"
      const matchedPaths = new Set(
        results.filter((r) => r.confidence !== 'no_match').map((r) => r.imagePath)
      )
      setSelectedPaths(matchedPaths)

      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to match photos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleSelect = useCallback((imagePath: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(imagePath)) {
        next.delete(imagePath)
      } else {
        next.add(imagePath)
      }
      return next
    })
  }, [])

  const handleSelectAll = () => {
    const matchedPaths = matchResults
      .filter((r) => r.confidence !== 'no_match')
      .map((r) => r.imagePath)
    setSelectedPaths(new Set(matchedPaths))
  }

  const handleSelectNone = () => {
    setSelectedPaths(new Set())
  }

  const handleApply = () => {
    const selectedResults = matchResults.filter(
      (r) => selectedPaths.has(r.imagePath) && r.matchedLocation
    )

    const locationsToApply = selectedResults.map((r) => ({
      imagePath: r.imagePath,
      location: r.matchedLocation!,
    }))

    onApply(locationsToApply)
    handleClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white dark:bg-neutral-700 rounded-xl w-[90%] max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 px-6 border-b border-gray-100 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <Icon
                icon="mdi:map-marker-path"
                className="text-green-600 dark:text-green-400"
                width={22}
                height={22}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Import GPX Track
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === 'import' && 'Select a GPX file to match photos'}
                {step === 'configure' && 'Configure matching settings'}
                {step === 'results' && `${images.length} images analyzed`}
              </p>
            </div>
          </div>
          <button
            className="text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded w-7 h-7 flex items-center justify-center"
            onClick={handleClose}
          >
            <Icon icon="mdi:close" width={20} height={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              <Icon icon="mdi:alert-circle" width={18} height={18} />
              {error}
            </div>
          )}

          {/* Step 1: Import */}
          {step === 'import' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-neutral-600 flex items-center justify-center">
                <Icon
                  icon="mdi:file-upload"
                  className="text-gray-400 dark:text-gray-300"
                  width={32}
                  height={32}
                />
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                Select GPX File
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Import a GPX track file from your GPS device, phone, or tracking app.
                Photos will be matched based on their timestamps.
              </p>
              <button
                onClick={handleImportGPX}
                disabled={isLoading}
                className="bg-blue-500 text-white px-6 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {isLoading ? (
                  <>
                    <Icon icon="mdi:loading" className="animate-spin" width={18} height={18} />
                    Importing...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:folder-open" width={18} height={18} />
                    Choose GPX File
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && track && (
            <div className="space-y-6">
              {/* Track info */}
              <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Icon
                    icon="mdi:map-marker-path"
                    className="text-green-500"
                    width={20}
                    height={20}
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {track.name}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {track.points.length} track points
                </div>
              </div>

              {/* Tolerance slider */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Time Tolerance: {tolerance} seconds
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>5s (strict)</span>
                  <span>60s (default)</span>
                  <span>120s (loose)</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Photos within this time window of a track point will be considered a match.
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Camera clock timezone
                </label>
                <select
                  value={cameraOffset ?? ''}
                  onChange={(e) => setCameraOffset(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full p-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
                >
                  <option value="">Same as this computer</option>
                  {CAMERA_TIMEZONE_OPTIONS.map((offset) => {
                    const sign = offset < 0 ? '−' : '+'
                    const absoluteOffset = Math.abs(offset)
                    const hours = Math.floor(absoluteOffset / 60)
                    const minutes = absoluteOffset % 60

                    return (
                      <option key={offset} value={offset}>
                        UTC{sign}{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Images to match */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <Icon icon="mdi:image-multiple" className="inline mr-2" width={16} height={16} />
                {images.length} images will be matched against this track
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 'results' && (
            <div className="space-y-4">
              {/* Selection controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select all matches
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={handleSelectNone}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select none
                </button>
              </div>

              <GPXMatchResults
                results={matchResults}
                onToggleSelect={handleToggleSelect}
                selectedPaths={selectedPaths}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-5 px-6 border-t border-gray-100 dark:border-gray-600">
          <div>
            {step !== 'import' && (
              <button
                onClick={() => setStep(step === 'results' ? 'configure' : 'import')}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
              >
                <Icon icon="mdi:arrow-left" width={16} height={16} />
                Back
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              className="bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              onClick={handleClose}
            >
              Cancel
            </button>

            {step === 'configure' && (
              <button
                onClick={handleMatchPhotos}
                disabled={isLoading}
                className="bg-blue-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Icon icon="mdi:loading" className="animate-spin" width={16} height={16} />
                    Matching...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:magnify" width={16} height={16} />
                    Match Photos
                  </>
                )}
              </button>
            )}

            {step === 'results' && (
              <button
                onClick={handleApply}
                disabled={selectedPaths.size === 0}
                className="bg-green-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-green-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Icon icon="mdi:check" width={16} height={16} />
                Apply to {selectedPaths.size} {selectedPaths.size === 1 ? 'Image' : 'Images'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
