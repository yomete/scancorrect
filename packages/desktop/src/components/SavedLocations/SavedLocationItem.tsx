import React from 'react'
import { Icon } from '@iconify/react'
import { SavedLocation } from '../../types'

interface SavedLocationItemProps {
  location: SavedLocation
  onSelect: (location: SavedLocation) => void
  onToggleFavorite: (id: string) => void
  onDelete: (id: string) => void
  compact?: boolean
}

export function SavedLocationItem({
  location,
  onSelect,
  onToggleFavorite,
  onDelete,
  compact = false,
}: SavedLocationItemProps) {
  const handleSelect = () => {
    onSelect(location)
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite(location.id)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(location.id)
  }

  if (compact) {
    return (
      <button
        onClick={handleSelect}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-600 text-left transition-colors"
      >
        <Icon
          icon={location.isFavorite ? 'mdi:star' : 'mdi:map-marker'}
          className={location.isFavorite ? 'text-amber-500' : 'text-gray-400'}
          width={16}
          height={16}
        />
        <span className="text-sm text-gray-700 dark:text-gray-200 truncate flex-1">
          {location.name}
        </span>
      </button>
    )
  }

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-md transition-colors">
      <button
        onClick={handleFavoriteClick}
        className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
        title={location.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Icon
          icon={location.isFavorite ? 'mdi:star' : 'mdi:star-outline'}
          className={location.isFavorite ? 'text-amber-500' : 'text-gray-400 hover:text-amber-400'}
          width={18}
          height={18}
        />
      </button>

      <button
        onClick={handleSelect}
        className="flex-1 text-left min-w-0"
      >
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {location.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          {location.usageCount > 0 && (
            <span className="ml-2">
              · Used {location.usageCount} {location.usageCount === 1 ? 'time' : 'times'}
            </span>
          )}
        </div>
      </button>

      <button
        onClick={handleDeleteClick}
        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-[opacity,background-color]"
        title="Delete location"
      >
        <Icon
          icon="mdi:trash-can-outline"
          className="text-gray-400 hover:text-red-500"
          width={16}
          height={16}
        />
      </button>
    </div>
  )
}
