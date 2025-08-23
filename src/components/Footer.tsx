import React from 'react'
import { CameraProfile } from '../types'
import { ThemeSwitcher } from './ThemeSwitcher'
import { ProfileDropdown } from './ProfileDropdown'

interface FooterProps {
  profiles: CameraProfile[]
  selectedProfile: string
  onAddProfile: () => void
  onProfileSelect: (profileId: string) => void
  onProfileDelete: (profileId: string) => void
}

export function Footer({
  profiles,
  selectedProfile,
  onAddProfile,
  onProfileSelect,
  onProfileDelete
}: FooterProps) {
  const getCurrentProfile = () => {
    return profiles.find(p => p.id === selectedProfile)
  }

  return (
    <footer className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-3 px-4">
      <div className="flex items-center gap-4 max-w-6xl mx-auto">
        <button
          className="bg-blue-500 text-white w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center hover:bg-blue-600 transition-colors flex-shrink-0"
          onClick={onAddProfile}
          title="Add new camera profile"
        >
          +
        </button>

        <div className="flex-1 min-w-0">
          {getCurrentProfile() ? (
            <span className="block font-semibold text-gray-800 dark:text-gray-200 text-sm leading-tight">
              {getCurrentProfile()?.name}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 italic text-sm">
              No camera profile selected
            </span>
          )}
        </div>

        <ThemeSwitcher />

        <ProfileDropdown
          profiles={profiles}
          selectedProfile={selectedProfile}
          onProfileSelect={onProfileSelect}
          onProfileDelete={onProfileDelete}
        />
      </div>
    </footer>
  )
}