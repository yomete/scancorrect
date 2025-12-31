import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { LocationValue, GeocodingResult } from "../../types";
import { LocationField } from "../MetadataEditor/LocationField";

interface BulkLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (location: LocationValue, overwriteExisting: boolean) => void;
  onSearch: (query: string) => Promise<GeocodingResult[]>;
  selectedCount: number;
  hasConflicts: boolean;
}

export function BulkLocationModal({
  isOpen,
  onClose,
  onApply,
  onSearch,
  selectedCount,
  hasConflicts,
}: BulkLocationModalProps) {
  const [location, setLocation] = useState<LocationValue | undefined>(undefined);
  const [showConflictOptions, setShowConflictOptions] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!location) return;

    if (hasConflicts && !showConflictOptions) {
      setShowConflictOptions(true);
      return;
    }

    onApply(location, true);
    handleClose();
  };

  const handleOverwriteAll = () => {
    if (!location) return;
    onApply(location, true);
    handleClose();
  };

  const handleSkipExisting = () => {
    if (!location) return;
    onApply(location, false);
    handleClose();
  };

  const handleClose = () => {
    setLocation(undefined);
    setShowConflictOptions(false);
    onClose();
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Icon
                icon="mdi:map-marker-multiple"
                className="text-blue-600 dark:text-blue-400"
                width={22}
                height={22}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                Set Location
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Apply to {selectedCount} selected {selectedCount === 1 ? "image" : "images"}
              </p>
            </div>
          </div>
          <button
            className="text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded w-7 h-7 flex items-center justify-center text-lg"
            onClick={handleClose}
          >
            <Icon icon="mdi:close" width={20} height={20} />
          </button>
        </div>

        <div className="p-6">
          {!showConflictOptions ? (
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 text-sm">
                  Search for Location
                </label>
                <LocationField
                  value={location}
                  onChange={setLocation}
                  onSearch={onSearch}
                />
              </div>

              {hasConflicts && location && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <Icon
                    icon="mdi:alert"
                    className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                    width={18}
                    height={18}
                  />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Some selected images already have location data. You'll be asked how to handle conflicts.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Icon
                  icon="mdi:alert-circle"
                  className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  width={24}
                  height={24}
                />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">
                    Existing Location Data Found
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Some of the selected images already have location data. How would you like to proceed?
                  </p>
                </div>
              </div>

              {location && (
                <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    New location to apply:
                  </p>
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="mdi:map-marker"
                      className="text-green-600 dark:text-green-400 flex-shrink-0"
                      width={16}
                      height={16}
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {location.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 px-6 border-t border-gray-100 dark:border-gray-700">
          {!showConflictOptions ? (
            <>
              <button
                className="bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={handleApply}
                disabled={!location}
              >
                <Icon icon="mdi:check" width={16} height={16} />
                {hasConflicts ? "Continue" : "Apply Location"}
              </button>
            </>
          ) : (
            <>
              <button
                className="bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                className="bg-amber-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-amber-600 transition-colors flex items-center gap-2"
                onClick={handleSkipExisting}
              >
                <Icon icon="mdi:skip-next" width={16} height={16} />
                Skip Existing
              </button>
              <button
                className="bg-blue-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
                onClick={handleOverwriteAll}
              >
                <Icon icon="mdi:pencil" width={16} height={16} />
                Overwrite All
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
