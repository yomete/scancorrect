import React from 'react'
import { Icon } from '@iconify/react'
import { GPXMatchResult } from '../../types'

interface GPXMatchResultsProps {
  results: GPXMatchResult[]
  onToggleSelect: (imagePath: string) => void
  selectedPaths: Set<string>
}

const CONFIDENCE_STYLES = {
  exact: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-700 dark:text-green-300',
    icon: 'mdi:check-circle',
    label: 'Exact match',
  },
  close: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'mdi:check',
    label: 'Close match',
  },
  far: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'mdi:alert',
    label: 'Far match',
  },
  no_match: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-500 dark:text-gray-400',
    icon: 'mdi:close-circle',
    label: 'No match',
  },
}

function formatTimeDifference(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function getFilename(path: string): string {
  return path.split(/[/\\]/).pop() || path
}

export function GPXMatchResults({
  results,
  onToggleSelect,
  selectedPaths,
}: GPXMatchResultsProps) {
  const matchedCount = results.filter((r) => r.confidence !== 'no_match').length
  const exactCount = results.filter((r) => r.confidence === 'exact').length

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          {matchedCount} of {results.length} images matched
          {exactCount > 0 && (
            <span className="text-green-600 dark:text-green-400 ml-1">
              ({exactCount} exact)
            </span>
          )}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {selectedPaths.size} selected
        </span>
      </div>

      {/* Results list */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {results.map((result) => {
          const style = CONFIDENCE_STYLES[result.confidence]
          const isSelected = selectedPaths.has(result.imagePath)

          return (
            <div
              key={result.imagePath}
              className={`flex items-center gap-3 p-3 rounded-lg border ${style.border} ${style.bg} cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onToggleSelect(result.imagePath)}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isSelected
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-400 dark:border-gray-500'
                }`}
              >
                {isSelected && (
                  <Icon icon="mdi:check" className="text-white" width={14} height={14} />
                )}
              </div>

              {/* Confidence badge */}
              <div className={`flex items-center gap-1 ${style.text}`}>
                <Icon icon={style.icon} width={18} height={18} />
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {getFilename(result.imagePath)}
                </div>
                {result.matchedLocation ? (
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {result.matchedLocation.name}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    No timestamp or match found
                  </div>
                )}
              </div>

              {/* Time difference */}
              {result.timeDifferenceSeconds !== undefined && result.confidence !== 'no_match' && (
                <div className={`text-xs ${style.text}`}>
                  ±{formatTimeDifference(result.timeDifferenceSeconds)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
