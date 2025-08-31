import React, { useState } from "react";
import { CameraProfile } from "../types";

interface NewProfileData {
  name: string;
  make: string;
  model: string;
  lens: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: CameraProfile) => void;
}

export function ProfileModal({ isOpen, onClose, onSave }: ProfileModalProps) {
  const [newProfile, setNewProfile] = useState<NewProfileData>({
    name: "",
    make: "",
    model: "",
    lens: "",
  });

  if (!isOpen) return null;

  const handleSave = () => {
    if (!newProfile.name || !newProfile.make || !newProfile.model) return;

    const profile: CameraProfile = {
      id: Date.now().toString(),
      name: newProfile.name,
      make: newProfile.make,
      model: newProfile.model,
      lens: newProfile.lens || undefined,
    };

    onSave(profile);
    setNewProfile({ name: "", make: "", model: "", lens: "" });
  };

  const handleClose = () => {
    onClose();
    setNewProfile({ name: "", make: "", model: "", lens: "" });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white dark:bg-neutral-700 rounded-xl w-[90%] max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 px-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Add Camera Profile
          </h2>
          <button
            className="text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded w-7 h-7 flex items-center justify-center text-lg"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="mb-5">
            <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
              Profile Name
            </label>
            <input
              type="text"
              placeholder="e.g., Nikon FM"
              value={newProfile.name}
              onChange={(e) =>
                setNewProfile({ ...newProfile, name: e.target.value })
              }
              className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4 mb-5">
            <div className="flex-1">
              <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
                Camera Make
              </label>
              <input
                type="text"
                placeholder="e.g., Nikon"
                value={newProfile.make}
                onChange={(e) =>
                  setNewProfile({ ...newProfile, make: e.target.value })
                }
                className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
                Camera Model
              </label>
              <input
                type="text"
                placeholder="e.g., FM"
                value={newProfile.model}
                onChange={(e) =>
                  setNewProfile({ ...newProfile, model: e.target.value })
                }
                className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
              Lens (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., 50mm f/1.8"
              value={newProfile.lens}
              onChange={(e) =>
                setNewProfile({ ...newProfile, lens: e.target.value })
              }
              className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 px-6 border-t border-gray-100 dark:border-gray-700">
          <button
            className="bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="bg-blue-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={!newProfile.name || !newProfile.make || !newProfile.model}
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
