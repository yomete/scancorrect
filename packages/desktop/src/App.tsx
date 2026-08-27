import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { useTheme } from "./ThemeContext";
import {
  DropZone,
  ProfileWizard,
  Footer,
  ImageGrid,
  BulkActionBar,
  BulkLocationModal,
  ProcessingLog,
  ImageSidebar,
} from "./components";
import {
  CameraProfile,
  ImageFile,
  ExifData,
  ProcessingLogEntry,
  LocationValue,
  GeocodingResult,
  FolderMetadataVerificationResult,
} from "./types";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { getFilename } from "./utils";

type AppView = "dropzone" | "grid";

const PROFILE_FIELDS: (keyof ExifData)[] = [
  "make",
  "model",
  "lens",
  "iso",
  "aperture",
  "shutterSpeed",
  "focalLength",
  "exposureComp",
  "filmStock",
  "location",
];

const mergePendingChanges = (
  pendingChanges: ExifData | undefined,
  changes: Partial<ExifData>
): ExifData => {
  const nextChanges: ExifData = { ...pendingChanges };

  Object.entries(changes).forEach(([field, value]) => {
    const key = field as keyof ExifData;
    if (value === undefined) {
      delete nextChanges[key];
    } else {
      nextChanges[key] = value as never;
    }
  });

  return nextChanges;
};

// Extend window for close confirmation
declare global {
  interface Window {
    __hasUnsavedChanges?: () => boolean;
  }
}

function App() {
  const { theme: _theme } = useTheme();
  const [profiles, setProfiles] = useState<CameraProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CameraProfile | undefined>(undefined);

  // Image state
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [currentView, setCurrentView] = useState<AppView>("dropzone");

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLog, setProcessingLog] = useState<ProcessingLogEntry[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Bulk location modal
  const [isBulkLocationOpen, setIsBulkLocationOpen] = useState(false);

  const handleVerifyFolderMetadata = useCallback(async () => {
    try {
      const result = await window.electronAPI.verifyFolderMetadata();

      if ("error" in result) {
        if (result.error !== "Verification canceled") {
          alert(`Metadata verification failed: ${result.error}`);
        }
        return;
      }

      const verification: FolderMetadataVerificationResult = result;
      // Finder-visible metadata is a macOS-only concept; on Windows/Linux the
      // counts are always 0/N, so omit those lines instead of showing a false
      // negative.
      const isMac = window.electronAPI.platform === "darwin";
      alert(
        [
          `Verified ${verification.total} images`,
          `Embedded metadata: ${verification.embeddedPresent}/${verification.total}`,
          ...(isMac
            ? [`Finder-visible metadata: ${verification.finderVisible}/${verification.total}`]
            : []),
          `Missing embedded metadata: ${verification.embeddedMissing}`,
          ...(isMac ? [`Missing Finder metadata: ${verification.finderMissing}`] : []),
          `Log: ${verification.logPath}`,
        ].join("\n")
      );
    } catch (error) {
      alert(`Metadata verification failed: ${error}`);
    }
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    "mod+a": () => {
      if (currentView === "grid" && images.length > 0) {
        setSelectedImageIds(new Set(images.map((img) => img.path)));
      }
    },
    "mod+shift+a": () => {
      setSelectedImageIds(new Set());
    },
    "mod+alt+shift+v": () => {
      void handleVerifyFolderMetadata();
    },
    "Escape": () => {
      if (isBulkLocationOpen) {
        setIsBulkLocationOpen(false);
      } else if (isLogOpen) {
        setIsLogOpen(false);
      } else if (isCreatingProfile) {
        setIsCreatingProfile(false);
        setEditingProfile(undefined);
      } else {
        setSelectedImageIds(new Set());
      }
    },
  });

  useEffect(() => {
    loadProfiles();
    loadProcessingLog();
  }, []);

  // Persist last-used profile whenever it changes to a non-empty value
  useEffect(() => {
    if (selectedProfile) {
      window.electronAPI.setLastUsedProfile(selectedProfile).catch(() => {
        // fire-and-forget; non-critical
      });
    }
  }, [selectedProfile]);

  // One question, asked the same way everywhere work is about to be lost.
  // The window close guard asks about exactly this, in these words; the
  // in-app paths that discard should not be quieter than it is.
  const confirmDiscard = (count: number, whatHappens: string): boolean => {
    if (count === 0) return true;
    const images = count === 1 ? "1 image" : `${count} images`;
    return window.confirm(
      `You have unsaved changes to ${images}.\n\n${whatHappens}\n\nThis cannot be undone.`
    );
  };

  // Track if save was triggered by close dialog
  const saveAndCloseRef = useRef(false);

  // Set up unsaved changes check for window close
  useEffect(() => {
    window.__hasUnsavedChanges = () => {
      return images.some(
        (img) => img.pendingChanges && Object.keys(img.pendingChanges).length > 0
      );
    };

    return () => {
      delete window.__hasUnsavedChanges;
    };
  }, [images]);

  const loadProfiles = async () => {
    try {
      const loadedProfiles = await window.electronAPI.getProfiles();
      setProfiles(loadedProfiles);
      if (loadedProfiles.length > 0 && !selectedProfile) {
        // Restore last-used profile if it still exists in the list
        const lastUsed = await window.electronAPI.getLastUsedProfile();
        const restoredId = lastUsed && loadedProfiles.some((p) => p.id === lastUsed)
          ? lastUsed
          : loadedProfiles[0].id;
        setSelectedProfile(restoredId);
      }
    } catch (error) {
      console.error("Failed to load profiles:", error);
    }
  };

  const loadProcessingLog = async () => {
    try {
      const log = await window.electronAPI.getProcessingLog();
      setProcessingLog(log);
    } catch (error) {
      console.error("Failed to load processing log:", error);
    }
  };

  const handleSaveProfile = async (profile: CameraProfile) => {
    try {
      await window.electronAPI.saveProfile(profile);
      await loadProfiles();
      setSelectedProfile(profile.id);
      setIsCreatingProfile(false);
      setEditingProfile(undefined);
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      await window.electronAPI.deleteProfile(profileId);
      await loadProfiles();
      if (selectedProfile === profileId) {
        setSelectedProfile(
          profiles.length > 1
            ? profiles.find((p) => p.id !== profileId)?.id || ""
            : ""
        );
      }
    } catch (error) {
      console.error("Failed to delete profile:", error);
    }
  };

  const handleEditProfile = (profile: CameraProfile) => {
    setEditingProfile(profile);
    setIsCreatingProfile(true);
  };

  const handleGeocode = async (query: string): Promise<GeocodingResult[]> => {
    const response = await window.electronAPI.geocodeLocation(query);
    if (Array.isArray(response)) {
      return response;
    }
    // Typed error from geocoding module — surface as a thrown message so the
    // location search UI can display it inline via its existing error state.
    const messages: Record<string, string> = {
      'rate-limited': 'Nominatim is rate-limiting requests — please try again in a moment.',
      'offline': 'No network connection. Please check your internet and try again.',
      'failed': 'Location search failed. Please try again.',
    };
    throw new Error(messages[response.error] ?? 'Location search failed.');
  };

  const applyProfileToPendingChanges = (
    pendingChanges: ExifData | undefined,
    profile: CameraProfile
  ): ExifData => {
    const nextChanges: ExifData = { ...pendingChanges };

    PROFILE_FIELDS.forEach((field) => {
      delete nextChanges[field];
    });

    if (profile.make) nextChanges.make = profile.make;
    if (profile.model) nextChanges.model = profile.model;
    if (profile.lens) nextChanges.lens = profile.lens;
    if (profile.defaults) {
      if (profile.defaults.iso !== undefined) nextChanges.iso = profile.defaults.iso;
      if (profile.defaults.aperture !== undefined) nextChanges.aperture = profile.defaults.aperture;
      if (profile.defaults.shutterSpeed !== undefined) nextChanges.shutterSpeed = profile.defaults.shutterSpeed;
      if (profile.defaults.focalLength !== undefined) nextChanges.focalLength = profile.defaults.focalLength;
      if (profile.defaults.exposureComp !== undefined) nextChanges.exposureComp = profile.defaults.exposureComp;
      if (profile.defaults.filmStock) nextChanges.filmStock = profile.defaults.filmStock;
      if (profile.defaults.location) nextChanges.location = profile.defaults.location;
    }

    return nextChanges;
  };

  const handleProfileSelect = (profileId: string) => {
    // Clicking the profile that is already active used to run the whole
    // rewrite, destroying hand-typed values for no gain. Apply Profile
    // Defaults is the way to deliberately re-apply.
    if (profileId === selectedProfile) return;

    const profile = profiles.find((p) => p.id === profileId);
    if (!profile || images.length === 0) {
      setSelectedProfile(profileId);
      return;
    }

    // Only ask about work the user actually authored. Loading a roll with a
    // profile active seeds every image with that profile's fields, and losing
    // those to another profile costs the user nothing — so compare against
    // what the current profile would have written and ignore the matches.
    const activeProfile = profiles.find((p) => p.id === selectedProfile);
    const seeded: ExifData = activeProfile
      ? applyProfileToPendingChanges(undefined, activeProfile)
      : {};
    const wouldOverwrite = images.filter((img) => {
      const pending = img.pendingChanges;
      if (!pending) return false;
      return PROFILE_FIELDS.some((field) => {
        if (pending[field] === undefined) return false;
        return JSON.stringify(pending[field]) !== JSON.stringify(seeded[field]);
      });
    }).length;
    if (
      !confirmDiscard(
        wouldOverwrite,
        "Switching camera profile overwrites the camera and exposure fields on every loaded image, including anything you have typed."
      )
    ) {
      return;
    }

    setSelectedProfile(profileId);

    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        pendingChanges: applyProfileToPendingChanges(img.pendingChanges, profile),
        status: img.status === "success" ? "pending" : img.status,
      }))
    );
  };

  const handleFilesDropped = async (filePaths: string[]) => {
    const existingPaths = new Set(images.map((image) => image.path));
    const pathsToAdd = filePaths.filter((path) => !existingPaths.has(path));
    if (pathsToAdd.length === 0) return;

    // Create ImageFile objects for each dropped file
    const newImages: ImageFile[] = pathsToAdd.map((path) => ({
      path,
      filename: getFilename(path),
      selected: false,
      status: "pending" as const,
    }));

    setCurrentView("grid");

    // Read EXIF data for all new images in a single batch IPC call
    const profile = profiles.find((p) => p.id === selectedProfile);

    const batchResult = await window.electronAPI.readExifBatch(newImages.map((i) => i.path));

    const updatedImages = newImages.map((image) => {
      const result = batchResult[image.path];
      if (!result || "error" in result) {
        return {
          ...image,
          status: "error" as const,
          error: result?.error ?? "Unknown error reading EXIF data",
        };
      }

      // Start with profile defaults as pending changes
      const pendingChanges = profile
        ? applyProfileToPendingChanges(undefined, profile)
        : {};

      return {
        ...image,
        existingExif: result.data,
        isScanner: result.isScanner,
        pendingChanges,
      };
    });

    setImages((prev) => {
      const loadedPaths = new Set(prev.map((image) => image.path));
      const imagesToAppend = updatedImages.filter((image) => !loadedPaths.has(image.path));
      return [...prev, ...imagesToAppend];
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.files);
    const imagePaths = files
      .filter((file) => /\.(jpg|jpeg|tiff|tif)$/i.test(file.name))
      .map((file) => window.electronAPI.getPathForFile(file));

    if (imagePaths.length > 0) {
      await handleFilesDropped(imagePaths);
    }
  };

  const handleFileSelect = async () => {
    try {
      const filePaths = await window.electronAPI.showOpenDialog();
      if (filePaths && filePaths.length > 0) {
        await handleFilesDropped(filePaths);
      }
    } catch (error) {
      console.error("Failed to select files:", error);
    }
  };

  const handleImageClick = (image: ImageFile) => {
    // Select only this image (deselect others) to open in sidebar
    setSelectedImageIds(new Set([image.path]));
  };

  const handleUpdatePendingChanges = (path: string, changes: Partial<ExifData>) => {
    setImages((prev) =>
      prev.map((img) =>
        img.path === path
          ? { ...img, pendingChanges: mergePendingChanges(img.pendingChanges, changes) }
          : img
      )
    );
  };

  const handleUpdateMultiplePendingChanges = (paths: string[], changes: Partial<ExifData>) => {
    setImages((prev) =>
      prev.map((img) =>
        paths.includes(img.path)
          ? { ...img, pendingChanges: mergePendingChanges(img.pendingChanges, changes) }
          : img
      )
    );
  };

  const handleSelectAll = () => {
    setSelectedImageIds(new Set(images.map((img) => img.path)));
  };

  const handleDeselectAll = () => {
    setSelectedImageIds(new Set());
  };

  const handleSetLocation = () => {
    setIsBulkLocationOpen(true);
  };

  const handleApplyBulkLocation = async (
    location: LocationValue,
    overwriteExisting: boolean
  ) => {
    // Apply location to all selected images
    setImages((prev) =>
      prev.map((img) => {
        if (!selectedImageIds.has(img.path)) return img;

        // Skip if the image already has a location and we're not overwriting.
        // A location applied but not yet written counts too — otherwise Skip
        // Existing silently overwrites everything a profile default just set.
        const alreadyHasLocation =
          img.pendingChanges?.location ?? img.existingExif?.location;
        if (!overwriteExisting && alreadyHasLocation) {
          return img;
        }

        return {
          ...img,
          pendingChanges: {
            ...img.pendingChanges,
            location,
          },
        };
      })
    );
  };

  // Check if any selected images already carry a location — on the file, or
  // applied and not yet written.
  const hasLocationConflicts = Array.from(selectedImageIds).some((id) => {
    const image = images.find((img) => img.path === id);
    return Boolean(image?.pendingChanges?.location ?? image?.existingExif?.location);
  });

  const handleApplyDefaults = async () => {
    const profile = profiles.find((p) => p.id === selectedProfile);
    if (!profile) {
      alert("Please select a camera profile first");
      return;
    }

    // Apply profile defaults to all selected images
    setImages((prev) =>
      prev.map((img) => {
        if (!selectedImageIds.has(img.path)) return img;

        return {
          ...img,
          pendingChanges: applyProfileToPendingChanges(img.pendingChanges, profile),
        };
      })
    );
  };

  const handleSaveChanges = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    const profile = profiles.find((p) => p.id === selectedProfile);
    const results: ProcessingLogEntry[] = [];

    for (const image of images) {
      if (!image.pendingChanges || Object.keys(image.pendingChanges).length === 0) {
        continue;
      }

      try {
        const writeResult = await window.electronAPI.writeExif(
          image.path,
          image.pendingChanges
        );

        const logEntry: ProcessingLogEntry = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          filePath: image.path,
          filename: image.filename,
          profileUsed: profile?.name,
          changesApplied: image.pendingChanges,
          success: writeResult.success,
          error: writeResult.error,
          warning: writeResult.warning,
          backupPath: writeResult.backupPath,
        };

        results.push(logEntry);
        await window.electronAPI.addLogEntry(logEntry);

        // Update image status
        setImages((prev) =>
          prev.map((img) =>
            img.path === image.path
              ? {
                  ...img,
                  status: writeResult.success ? "success" : "error",
                  error: writeResult.error,
                  pendingChanges: writeResult.success ? {} : img.pendingChanges,
                }
              : img
          )
        );
      } catch (error) {
        const logEntry: ProcessingLogEntry = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          filePath: image.path,
          filename: image.filename,
          profileUsed: profile?.name,
          changesApplied: image.pendingChanges,
          success: false,
          error: String(error),
        };

        results.push(logEntry);
        await window.electronAPI.addLogEntry(logEntry);

        setImages((prev) =>
          prev.map((img) =>
            img.path === image.path
              ? { ...img, status: "error", error: String(error) }
              : img
          )
        );
      }
    }

    setProcessingLog((prev) => [...results, ...prev]);
    setIsProcessing(false);

    // If save was triggered by close dialog, close window now
    if (saveAndCloseRef.current) {
      saveAndCloseRef.current = false;
      window.electronAPI.forceCloseWindow();
    }
  }, [images, profiles, selectedProfile]);

  // Listen for save-before-close event from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onSaveBeforeClose(() => {
      saveAndCloseRef.current = true;
      handleSaveChanges();
    });
    return cleanup;
  }, [handleSaveChanges]);

  const handleUndo = async (entry: ProcessingLogEntry) => {
    if (!entry.backupPath) return;

    try {
      const result = await window.electronAPI.restoreBackup(
        entry.filePath,
        entry.backupPath
      );
      if (result.success) {
        // Remove entry from log
        setProcessingLog((prev) => prev.filter((e) => e.id !== entry.id));
      } else {
        alert(`Failed to restore backup: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to restore backup: ${error}`);
    }
  };

  const handleClearLog = async () => {
    try {
      await window.electronAPI.clearProcessingLog();
      setProcessingLog([]);
    } catch (error) {
      console.error("Failed to clear log:", error);
    }
  };

  const handleClearImages = () => {
    if (!confirmDiscard(imagesWithChanges, "Going back will discard them.")) {
      return;
    }
    setImages([]);
    setSelectedImageIds(new Set());
    setCurrentView("dropzone");
  };

  const handleDiscardChanges = () => {
    if (
      !confirmDiscard(
        imagesWithChanges,
        "Discard All clears every field you have changed, on every loaded image."
      )
    ) {
      return;
    }
    // Clear all pending changes from all images
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        pendingChanges: {},
        status: "pending",
      }))
    );
  };

  // Calculate how many images have pending changes
  const imagesWithChanges = images.filter(
    (img) => img.pendingChanges && Object.keys(img.pendingChanges).length > 0
  ).length;

  return (
    <div
      className="h-screen flex flex-col bg-gray-100 dark:bg-neutral-800"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === "dropzone" ? (
          <DropZone
            isDragOver={false}
            isProcessing={isProcessing}
            results={[]}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileSelect={handleFileSelect}
            onClearResults={() => {}}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top action bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-neutral-700 border-b border-gray-200 dark:border-neutral-600">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClearImages}
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 flex items-center gap-1"
                >
                  ← Back
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                  {images.length} {images.length === 1 ? "image" : "images"} loaded
                </span>
                <button
                  onClick={handleFileSelect}
                  disabled={isProcessing}
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add files
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsLogOpen(true)}
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 flex items-center gap-1"
                >
                  History
                  {processingLog.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-neutral-600 rounded-full tabular-nums">
                      {processingLog.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleDiscardChanges}
                  disabled={isProcessing || imagesWithChanges === 0}
                  className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-neutral-600 hover:bg-gray-300 dark:hover:bg-neutral-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,transform] active:scale-[0.96]"
                >
                  Discard All
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isProcessing || imagesWithChanges === 0}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed transition-[background-color,transform] active:scale-[0.96]"
                >
                  {isProcessing
                    ? "Processing..."
                    : imagesWithChanges === 0
                    ? "Save Changes"
                    : imagesWithChanges === 1
                    ? "Save 1 image"
                    : `Save all ${imagesWithChanges} images`}
                </button>
              </div>
            </div>

            {/* Image grid and sidebar */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <ImageGrid
                  images={images}
                  selectedIds={selectedImageIds}
                  onSelectionChange={setSelectedImageIds}
                  onImageClick={handleImageClick}
                />
              </div>
              <ImageSidebar
                selectedImages={images.filter((img) => selectedImageIds.has(img.path))}
                onUpdatePendingChanges={handleUpdatePendingChanges}
                onUpdateMultiplePendingChanges={handleUpdateMultiplePendingChanges}
                activeProfile={profiles.find((p) => p.id === selectedProfile) || null}
              />
            </div>

            {/* Bulk action bar */}
            <BulkActionBar
              selectedCount={selectedImageIds.size}
              totalCount={images.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onSetLocation={handleSetLocation}
              onApplyDefaults={handleApplyDefaults}
              onClearSelection={handleDeselectAll}
              disabled={isProcessing}
            />
          </div>
        )}
      </main>

      <Footer
        profiles={profiles}
        selectedProfile={selectedProfile}
        onAddProfile={() => setIsCreatingProfile(true)}
        onProfileSelect={handleProfileSelect}
        onProfileDelete={handleDeleteProfile}
        onProfileEdit={handleEditProfile}
      />

      {/* Profile Wizard Modal */}
      <ProfileWizard
        isOpen={isCreatingProfile}
        onClose={() => {
          setIsCreatingProfile(false);
          setEditingProfile(undefined);
        }}
        onSave={handleSaveProfile}
        onSearch={handleGeocode}
        editingProfile={editingProfile}
      />

      {/* Bulk Location Modal */}
      <BulkLocationModal
        isOpen={isBulkLocationOpen}
        onClose={() => setIsBulkLocationOpen(false)}
        onApply={handleApplyBulkLocation}
        onSearch={handleGeocode}
        selectedCount={selectedImageIds.size}
        hasConflicts={hasLocationConflicts}
      />

      {/* Processing Log Panel */}
      <ProcessingLog
        entries={processingLog}
        onClear={handleClearLog}
        onUndo={handleUndo}
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
      />

    </div>
  );
}

export default App;
