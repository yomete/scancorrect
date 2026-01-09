import React from 'react'
import { Icon } from '@iconify/react'
import { FeatureFlag, FeatureTier } from '../../types'
import { useFeature } from '../../features/featureFlags'

interface FeatureGateProps {
  feature: FeatureFlag
  children: React.ReactNode
  fallback?: React.ReactNode
  showUpgradePrompt?: boolean
}

const FEATURE_LABELS: Record<FeatureFlag, string> = {
  mapPicker: 'Interactive Map',
  gpxImport: 'GPX Track Import',
  savedLocations: 'Saved Locations',
  locationHistory: 'Location History',
}

const FEATURE_ICONS: Record<FeatureFlag, string> = {
  mapPicker: 'mdi:map',
  gpxImport: 'mdi:map-marker-path',
  savedLocations: 'mdi:bookmark-multiple',
  locationHistory: 'mdi:history',
}

interface UpgradePromptProps {
  feature: FeatureFlag
  requiredTier: FeatureTier
  compact?: boolean
}

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
        <Icon
          icon="mdi:lock"
          className="text-amber-600 dark:text-amber-400"
          width={16}
          height={16}
        />
        <span className="text-sm text-amber-700 dark:text-amber-300">
          Pro feature
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-3">
        <Icon
          icon={FEATURE_ICONS[feature]}
          className="text-amber-600 dark:text-amber-400"
          width={24}
          height={24}
        />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
        {FEATURE_LABELS[feature]}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
        Upgrade to Pro to unlock this feature
      </p>
      <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm font-medium transition-colors">
        <Icon icon="mdi:crown" width={16} height={16} />
        Upgrade to Pro
      </button>
    </div>
  )
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGateProps) {
  const { enabled, requiredTier } = useFeature(feature)

  if (enabled) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (showUpgradePrompt) {
    return <UpgradePrompt feature={feature} requiredTier={requiredTier} />
  }

  return null
}

// Button variant that shows lock icon when feature is gated
interface FeatureButtonProps {
  feature: FeatureFlag
  onClick: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function FeatureButton({
  feature,
  onClick,
  children,
  className = '',
  disabled = false,
}: FeatureButtonProps) {
  const { enabled } = useFeature(feature)

  const handleClick = () => {
    if (enabled) {
      onClick()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !enabled}
      className={`flex items-center gap-2 ${className} ${
        !enabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
      title={!enabled ? `Upgrade to Pro to use ${FEATURE_LABELS[feature]}` : undefined}
    >
      {children}
      {!enabled && (
        <Icon
          icon="mdi:lock"
          className="text-amber-500"
          width={14}
          height={14}
        />
      )}
    </button>
  )
}
