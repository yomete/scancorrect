import React, { useState, useRef, useEffect } from "react";

import { Icon } from "@iconify/react/dist/iconify.js";

import { CameraProfile } from "../types";

interface ProfileDropdownProps {
  profiles: CameraProfile[];
  selectedProfile: string;
  onProfileSelect: (profileId: string) => void;
  onProfileDelete: (profileId: string) => void;
}

export function ProfileDropdown({
  profiles,
  selectedProfile,
  onProfileSelect,
  onProfileDelete,
}: ProfileDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfileSelect = (profileId: string) => {
    onProfileSelect(profileId);
    setShowDropdown(false);
  };

  const handleProfileDelete = (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    onProfileDelete(profileId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="text-gray-500 dark:text-gray-400 text-lg p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center w-8 h-8"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Switch camera profile"
      >
        ⋯
      </button>

      {showDropdown && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg min-w-72 max-h-72 overflow-y-auto z-50">
          <div className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 text-sm">
            Camera Profiles
          </div>
          {profiles.length === 0 ? (
            <div className="px-4 py-4 text-gray-400 dark:text-gray-500 text-center italic text-sm">
              No profiles created yet
            </div>
          ) : (
            <>
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors gap-3 group hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    profile.id === selectedProfile
                      ? "bg-blue-50 dark:bg-blue-900"
                      : ""
                  }`}
                  onClick={() => handleProfileSelect(profile.id)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="block font-medium text-gray-800 dark:text-gray-200 text-sm">
                      {profile.name}
                    </span>
                    <span className="block text-gray-500 dark:text-gray-400 text-xs mt-0.5 truncate">
                      {profile.make} {profile.model}
                      {profile.lens && ` • ${profile.lens}`}
                    </span>
                  </div>
                  <button
                    className="text-gray-400 dark:text-gray-500 p-1 rounded hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleProfileDelete(e, profile.id)}
                    title="Delete profile"
                  >
                    <Icon icon="material-symbols:delete" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
