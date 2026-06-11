import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

import { CameraProfile } from "../types";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { ProfileDropdown } from "./ProfileDropdown";

interface FooterProps {
  profiles: CameraProfile[];
  selectedProfile: string;
  onAddProfile: () => void;
  onProfileSelect: (profileId: string) => void;
  onProfileDelete: (profileId: string) => void;
  onProfileEdit?: (profile: CameraProfile) => void;
}

export function Footer({
  profiles,
  selectedProfile,
  onAddProfile,
  onProfileSelect,
  onProfileDelete,
  onProfileEdit,
}: FooterProps) {
  const currentProfile = profiles.find((p) => p.id === selectedProfile);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateReady) return
    const unsubscribe = window.electronAPI.onUpdateReady((version) => {
      setUpdateVersion(version)
    })
    return unsubscribe
  }, [])

  return (
    <footer className="bg-white/95 dark:bg-neutral-700 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-3 py-2">
      <div className="flex items-center gap-2 max-w-6xl mx-auto">
        <button
          className="text-white w-10 h-10 rounded-md text-lg font-bold flex items-center justify-center transition-[background-color,transform] active:scale-[0.96] flex-shrink-0 border border-neutral-600 dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-600"
          onClick={onAddProfile}
          title="Add new camera profile"
        >
          <Icon
            className="text-gray-600 dark:text-neutral-400"
            icon="material-symbols:add"
          />
        </button>

        <div className="flex-1 min-w-0">
          {currentProfile ? (
            <span className="block font-normal text-gray-800 dark:text-gray-400 text-xs leading-tight">
              {currentProfile.name}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 italic text-sm">
              No camera profile selected
            </span>
          )}
        </div>

        {updateVersion && (
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors flex-shrink-0"
            onClick={() => window.electronAPI?.installUpdateNow?.()}
            title={`v${updateVersion} ready — restart to update`}
          >
            <Icon icon="material-symbols:system-update" className="text-sm" />
            v{updateVersion} ready — Restart to update
          </button>
        )}

        <ThemeSwitcher />

        <ProfileDropdown
          profiles={profiles}
          selectedProfile={selectedProfile}
          onProfileSelect={onProfileSelect}
          onProfileDelete={onProfileDelete}
          onProfileEdit={onProfileEdit}
        />
      </div>
    </footer>
  );
}
