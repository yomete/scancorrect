import React, { useState, useRef, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { LocationValue, GeocodingResult, SavedLocation } from '../../types'
import { MapPickerModal } from '../MapPicker'
import { useLocationStore } from '../../store/locationStore'

interface LocationFieldEnhancedProps {
  value?: LocationValue
  onChange: (location: LocationValue | undefined) => void
  onSearch: (query: string) => Promise<GeocodingResult[]>
  error?: string
  disabled?: boolean
  onOpenGPXImport?: () => void
}

export function LocationFieldEnhanced({
  value,
  onChange,
  onSearch,
  error,
  disabled = false,
  onOpenGPXImport,
}: LocationFieldEnhancedProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [showSavedLocations, setShowSavedLocations] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    savedLocations,
    locationHistory,
    loadSavedLocations,
    loadLocationHistory,
    addToHistory,
    useLocation,
  } = useLocationStore()

  // Load saved locations and history on mount
  useEffect(() => {
    loadSavedLocations()
    loadLocationHistory()
  }, [loadSavedLocations, loadLocationHistory])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setShowSavedLocations(false)
        setShowHistory(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (value) {
      setManualLat(value.latitude.toString())
      setManualLng(value.longitude.toString())
    } else {
      setManualLat('')
      setManualLng('')
    }
  }, [value])

  const handleSearch = async () => {
    if (!query.trim() || disabled) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResults([])

    try {
      const results = await onSearch(query.trim())
      setSearchResults(results.slice(0, 5))
      setShowResults(true)
      setShowSavedLocations(false)
      setShowHistory(false)

      if (results.length === 0) {
        setSearchError('No locations found. Try a different search term.')
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search location')
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleSelectResult = async (result: GeocodingResult) => {
    const location: LocationValue = {
      name: result.displayName,
      latitude: result.latitude,
      longitude: result.longitude,
    }
    onChange(location)
    await addToHistory(location, 'search')
    setQuery('')
    setSearchResults([])
    setShowResults(false)
    setSearchError(null)
  }

  const handleSelectSavedLocation = async (saved: SavedLocation) => {
    const location: LocationValue = {
      name: saved.name,
      latitude: saved.latitude,
      longitude: saved.longitude,
    }
    onChange(location)
    await useLocation(saved.id)
    setShowSavedLocations(false)
  }

  const handleSelectHistoryLocation = async (entry: { location: LocationValue }) => {
    onChange(entry.location)
    await addToHistory(entry.location, 'search')
    setShowHistory(false)
  }

  const handleClear = () => {
    onChange(undefined)
    setQuery('')
    setSearchResults([])
    setShowResults(false)
    setSearchError(null)
    setManualLat('')
    setManualLng('')
  }

  const handleManualApply = async () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)

    if (isNaN(lat) || isNaN(lng)) {
      setSearchError('Please enter valid latitude and longitude values')
      return
    }

    if (lat < -90 || lat > 90) {
      setSearchError('Latitude must be between -90 and 90')
      return
    }

    if (lng < -180 || lng > 180) {
      setSearchError('Longitude must be between -180 and 180')
      return
    }

    const location: LocationValue = {
      name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      latitude: lat,
      longitude: lng,
    }
    onChange(location)
    await addToHistory(location, 'manual')
    setSearchError(null)
  }

  const handleMapPickerApply = async (location: LocationValue) => {
    onChange(location)
    await addToHistory(location, 'map')
    setShowMapPicker(false)
  }

  const displayError = error || searchError

  // Render when a value is selected
  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2.5 px-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
          <Icon
            icon="mdi:map-marker"
            className="text-green-600 dark:text-green-400 flex-shrink-0"
            width={18}
            height={18}
          />
          <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">
            {value.name}
          </span>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Clear location"
          >
            <Icon icon="mdi:close" width={16} height={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
        >
          <Icon
            icon={showAdvanced ? 'mdi:chevron-up' : 'mdi:chevron-down'}
            width={14}
            height={14}
          />
          {showAdvanced ? 'Hide' : 'Show'} coordinates
        </button>

        {showAdvanced && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
            Lat: {value.latitude.toFixed(6)}, Lng: {value.longitude.toFixed(6)}
          </div>
        )}
      </div>
    )
  }

  // Render search/input mode
  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for a location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setShowSavedLocations(false)
              setShowHistory(false)
            }}
            disabled={disabled || isSearching}
            className="w-full p-2.5 px-3 pr-8 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {query && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSearchResults([])
                setShowResults(false)
                setSearchError(null)
                inputRef.current?.focus()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <Icon icon="mdi:close-circle" width={16} height={16} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={disabled || isSearching || !query.trim()}
          className="bg-blue-500 text-white px-4 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSearching ? (
            <>
              <Icon icon="mdi:loading" className="animate-spin" width={16} height={16} />
              <span>Searching</span>
            </>
          ) : (
            <>
              <Icon icon="mdi:magnify" width={16} height={16} />
              <span>Search</span>
            </>
          )}
        </button>
      </div>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Map Picker Button */}
        <button
          type="button"
          onClick={() => setShowMapPicker(true)}
          disabled={disabled}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-neutral-500 transition-colors disabled:opacity-50"
        >
          <Icon icon="mdi:map" width={14} height={14} />
          <span>Pick on Map</span>
        </button>

        {/* GPX Import Button */}
        {onOpenGPXImport && (
          <button
            type="button"
            onClick={onOpenGPXImport}
            disabled={disabled}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-neutral-500 transition-colors disabled:opacity-50"
          >
            <Icon icon="mdi:map-marker-path" width={14} height={14} />
            <span>From GPX</span>
          </button>
        )}

        {/* Saved Locations Dropdown */}
        {savedLocations.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSavedLocations(!showSavedLocations)
                setShowHistory(false)
                setShowResults(false)
              }}
              disabled={disabled}
              className="text-xs px-2.5 py-1.5 bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-neutral-500 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Icon icon="mdi:bookmark" width={14} height={14} />
              <span>Saved</span>
              <Icon
                icon={showSavedLocations ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                width={12}
                height={12}
              />
            </button>

            {showSavedLocations && (
              <div className="absolute z-50 left-0 mt-1 w-64 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {savedLocations.map((saved) => (
                  <button
                    key={saved.id}
                    type="button"
                    onClick={() => handleSelectSavedLocation(saved)}
                    className="w-full text-left p-2.5 hover:bg-gray-100 dark:hover:bg-neutral-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        icon={saved.isFavorite ? 'mdi:star' : 'mdi:map-marker'}
                        className={saved.isFavorite ? 'text-amber-500' : 'text-gray-400'}
                        width={14}
                        height={14}
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                        {saved.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Dropdown */}
        {locationHistory.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHistory(!showHistory)
                setShowSavedLocations(false)
                setShowResults(false)
              }}
              disabled={disabled}
              className="text-xs px-2.5 py-1.5 bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-neutral-500 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Icon icon="mdi:history" width={14} height={14} />
              <span>Recent</span>
              <Icon
                icon={showHistory ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                width={12}
                height={12}
              />
            </button>

            {showHistory && (
              <div className="absolute z-50 left-0 mt-1 w-64 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {locationHistory.slice(0, 10).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelectHistoryLocation(entry)}
                    className="w-full text-left p-2.5 hover:bg-gray-100 dark:hover:bg-neutral-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon icon="mdi:map-marker" className="text-gray-400" width={14} height={14} />
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                        {entry.location.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search results dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={`${result.latitude}-${result.longitude}-${index}`}
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-neutral-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <Icon
                  icon="mdi:map-marker"
                  className="text-gray-400 flex-shrink-0 mt-0.5"
                  width={16}
                  height={16}
                />
                <span className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                  {result.displayName}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error display */}
      {displayError && (
        <div className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400">
          <Icon icon="mdi:alert-circle" width={16} height={16} />
          <span>{displayError}</span>
        </div>
      )}

      {/* Advanced: manual coordinates */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        disabled={disabled}
        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon
          icon={showAdvanced ? 'mdi:chevron-up' : 'mdi:chevron-down'}
          width={14}
          height={14}
        />
        Advanced: Enter coordinates manually
      </button>

      {showAdvanced && (
        <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-md space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Latitude
              </label>
              <input
                type="text"
                placeholder="-90 to 90"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                disabled={disabled}
                className="w-full p-2 px-2.5 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Longitude
              </label>
              <input
                type="text"
                placeholder="-180 to 180"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                disabled={disabled}
                className="w-full p-2 px-2.5 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualApply}
            disabled={disabled || !manualLat || !manualLng}
            className="w-full bg-gray-200 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded text-sm hover:bg-gray-300 dark:hover:bg-neutral-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Coordinates
          </button>
        </div>
      )}

      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onApply={handleMapPickerApply}
        initialLocation={value}
      />
    </div>
  )
}
