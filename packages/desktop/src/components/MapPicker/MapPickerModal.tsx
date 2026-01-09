import React, { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { LocationValue } from '../../types'
import { MapPicker } from './MapPicker'

interface MapPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (location: LocationValue) => void
  initialLocation?: LocationValue
}

// Default Mapbox token - in production this would come from environment/config
const DEFAULT_MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

export function MapPickerModal({
  isOpen,
  onClose,
  onApply,
  initialLocation,
}: MapPickerModalProps) {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialLocation
      ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
      : null
  )
  const [locationName, setLocationName] = useState<string>(initialLocation?.name || '')
  const [isLoadingName, setIsLoadingName] = useState(false)
  const [mapboxToken, setMapboxToken] = useState<string>('')

  // Load Mapbox token
  useEffect(() => {
    async function loadToken() {
      const storedToken = await window.electronAPI.getMapboxToken()
      setMapboxToken(storedToken || DEFAULT_MAPBOX_TOKEN)
    }
    loadToken()
  }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialLocation) {
        setSelectedCoords({ lat: initialLocation.latitude, lng: initialLocation.longitude })
        setLocationName(initialLocation.name)
      } else {
        setSelectedCoords(null)
        setLocationName('')
      }
    }
  }, [isOpen, initialLocation])

  const handleLocationSelect = async (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng })
    setIsLoadingName(true)
    setLocationName(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)

    // Try to reverse geocode using Nominatim (free)
    try {
      const results = await window.electronAPI.geocodeLocation(`${lat},${lng}`)
      // Use Nominatim's reverse geocoding by searching for coords
      // This is a workaround - ideally we'd have a dedicated reverse geocode endpoint
      if (results.length > 0) {
        setLocationName(results[0].displayName)
      }
    } catch {
      // Keep coordinates as fallback
    } finally {
      setIsLoadingName(false)
    }
  }

  const handleApply = () => {
    if (!selectedCoords) return

    onApply({
      name: locationName || `${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`,
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
    })
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  if (!mapboxToken) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={handleOverlayClick}
      >
        <div className="bg-white dark:bg-neutral-700 rounded-xl w-[90%] max-w-lg p-6 shadow-2xl">
          <div className="text-center">
            <Icon
              icon="mdi:map-marker-off"
              className="mx-auto mb-4 text-amber-500"
              width={48}
              height={48}
            />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Mapbox Token Required
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              To use the interactive map, please configure your Mapbox access token in settings.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-neutral-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white dark:bg-neutral-700 rounded-xl w-[90%] max-w-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 px-6 border-b border-gray-100 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Icon
                icon="mdi:map-marker"
                className="text-blue-600 dark:text-blue-400"
                width={22}
                height={22}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Pick Location on Map
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click on the map to select a location
              </p>
            </div>
          </div>
          <button
            className="text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded w-7 h-7 flex items-center justify-center"
            onClick={onClose}
          >
            <Icon icon="mdi:close" width={20} height={20} />
          </button>
        </div>

        {/* Map */}
        <div className="h-[400px]">
          <MapPicker
            initialLocation={initialLocation}
            onLocationSelect={handleLocationSelect}
            accessToken={mapboxToken}
          />
        </div>

        {/* Selected location preview */}
        {selectedCoords && (
          <div className="p-4 bg-gray-50 dark:bg-neutral-800 border-t border-gray-100 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <Icon
                icon="mdi:map-marker"
                className="text-blue-500 flex-shrink-0"
                width={20}
                height={20}
              />
              <div className="flex-1 min-w-0">
                {isLoadingName ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Icon icon="mdi:loading" className="animate-spin" width={14} height={14} />
                    Looking up location name...
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {locationName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 px-6 border-t border-gray-100 dark:border-gray-600">
          <button
            className="bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-blue-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={handleApply}
            disabled={!selectedCoords}
          >
            <Icon icon="mdi:check" width={16} height={16} />
            Apply Location
          </button>
        </div>
      </div>
    </div>
  )
}
