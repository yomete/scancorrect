import { create } from 'zustand'
import { FeatureFlag, FeatureTier } from '../types'

interface FeatureFlagState {
  currentTier: FeatureTier
  setTier: (tier: FeatureTier) => void
  isFeatureEnabled: (flag: FeatureFlag) => boolean
  getFeatureTier: (flag: FeatureFlag) => FeatureTier
}

// Feature tier mapping - which tier is required for each feature
const FEATURE_TIERS: Record<FeatureFlag, FeatureTier> = {
  mapPicker: 'paid',
  gpxImport: 'paid',
  savedLocations: 'free', // Free tier gets 3 slots, paid gets unlimited
  locationHistory: 'free',
}

// Limits for free tier
export const FREE_TIER_LIMITS = {
  savedLocations: 3,
  historyEntries: 10,
  monthlyTransformations: 108, // 3 rolls of 36 exposures
}

export const useFeatureFlags = create<FeatureFlagState>((set, get) => ({
  currentTier: 'free', // Default to free, would be loaded from license check

  setTier: (tier) => set({ currentTier: tier }),

  isFeatureEnabled: (flag) => {
    const tier = get().currentTier
    const requiredTier = FEATURE_TIERS[flag]

    if (requiredTier === 'free') return true
    return tier === 'paid'
  },

  getFeatureTier: (flag) => FEATURE_TIERS[flag],
}))

// React hook for feature gating - provides all info needed for UI
export function useFeature(flag: FeatureFlag) {
  const { isFeatureEnabled, getFeatureTier, currentTier } = useFeatureFlags()

  return {
    enabled: isFeatureEnabled(flag),
    requiredTier: getFeatureTier(flag),
    currentTier,
    isPaid: currentTier === 'paid',
  }
}

// Helper to check if user can add more saved locations
export function useCanAddSavedLocation(currentCount: number) {
  const { currentTier } = useFeatureFlags()

  if (currentTier === 'paid') return true
  return currentCount < FREE_TIER_LIMITS.savedLocations
}
