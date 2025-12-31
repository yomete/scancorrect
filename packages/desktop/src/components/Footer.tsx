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
  const getCurrentProfile = () => {
    return profiles.find((p) => p.id === selectedProfile);
  };

  return (
    <footer className="bg-white/95 dark:bg-neutral-700 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-3 py-2">
      <div className="flex items-center gap-2 max-w-6xl mx-auto">
        <button
          className="text-white w-6 h-6 rounded-md text-lg font-bold flex items-center justify-center transition-colors flex-shrink-0 border border-neutral-600 dark:border-neutral-600"
          onClick={onAddProfile}
          title="Add new camera profile"
        >
          <Icon
            className="text-gray-600 dark:text-neutral-400"
            icon="material-symbols:add"
          />
        </button>

        <div className="flex-1 min-w-0">
          {getCurrentProfile() ? (
            <span className="block font-normal text-gray-800 dark:text-gray-400 text-xs leading-tight">
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
          onProfileEdit={onProfileEdit}
        />
      </div>
    </footer>
  );
}
