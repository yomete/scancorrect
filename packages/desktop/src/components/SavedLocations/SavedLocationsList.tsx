import React, { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { SavedLocation, LocationValue } from '../../types'
import { SavedLocationItem } from './SavedLocationItem'
import { useLocationStore } from '../../store/locationStore'

interface SavedLocationsListProps {
  onSelectLocation: (location: LocationValue) => void
  currentLocation?: LocationValue
  compact?: boolean
}

export function SavedLocationsList({
  onSelectLocation,
  currentLocation,
  compact = false,
}: SavedLocationsListProps) {
  const {
    savedLocations,
    loadSavedLocations,
    saveLocation,
    deleteSavedLocation,
    toggleFavorite,
    useLocation,
  } = useLocationStore()

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')

  useEffect(() => {
    loadSavedLocations()
  }, [loadSavedLocations])

  const handleSelectLocation = async (location: SavedLocation) => {
    await useLocation(location.id)
    onSelectLocation({
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    })
  }

  const handleSaveCurrentLocation = async () => {
    if (!currentLocation || !newLocationName.trim()) return

    await saveLocation({
      name: newLocationName.trim(),
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      isFavorite: false,
    })

    setNewLocationName('')
    setShowSaveModal(false)
  }

  const handleDelete = async (id: string) => {
    await deleteSavedLocation(id)
  }

  const favorites = savedLocations.filter((l) => l.isFavorite)
  const others = savedLocations.filter((l) => !l.isFavorite)

  if (compact) {
    return (
      <div className="max-h-48 overflow-y-auto">
        {savedLocations.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            No saved locations
          </div>
        ) : (
          savedLocations.map((location) => (
            <SavedLocationItem
              key={location.id}
              location={location}
              onSelect={handleSelectLocation}
              onToggleFavorite={toggleFavorite}
              onDelete={handleDelete}
              compact
            />
          ))
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Save current location button */}
      {currentLocation && (
        <div className="flex items-center gap-2">
          {!showSaveModal ? (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <Icon icon="mdi:bookmark-plus" width={16} height={16} />
              Save this location
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Location name..."
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 rounded"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCurrentLocation()
                  if (e.key === 'Escape') setShowSaveModal(false)
                }}
              />
              <button
                onClick={handleSaveCurrentLocation}
                disabled={!newLocationName.trim()}
                className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-400"
              >
                <Icon icon="mdi:check" width={18} height={18} />
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Icon icon="mdi:close" width={18} height={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Favorites section */}
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <Icon icon="mdi:star" width={12} height={12} />
            Favorites
          </div>
          <div className="space-y-1">
            {favorites.map((location) => (
              <SavedLocationItem
                key={location.id}
                location={location}
                onSelect={handleSelectLocation}
                onToggleFavorite={toggleFavorite}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other saved locations */}
      {others.length > 0 && (
        <div>
          {favorites.length > 0 && (
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <Icon icon="mdi:map-marker-multiple" width={12} height={12} />
              All Locations
            </div>
          )}
          <div className="space-y-1">
            {others.map((location) => (
              <SavedLocationItem
                key={location.id}
                location={location}
                onSelect={handleSelectLocation}
                onToggleFavorite={toggleFavorite}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {savedLocations.length === 0 && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <Icon
            icon="mdi:bookmark-outline"
            className="mx-auto mb-2 opacity-50"
            width={32}
            height={32}
          />
          <p className="text-sm">No saved locations yet</p>
          <p className="text-xs mt-1">
            Search for a location and save it for quick access
          </p>
        </div>
      )}
    </div>
  )
}
