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
} from "./types";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

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

// Extend window for close confirmation
declare global {
  interface Window {
    __hasUnsavedChanges?: () => boolean;
  }
}

function App() {
  const { theme } = useTheme();
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
        setSelectedProfile(loadedProfiles[0].id);
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
    try {
      return await window.electronAPI.geocodeLocation(query);
    } catch (error) {
      console.error("Geocoding failed:", error);
      return [];
    }
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
    setSelectedProfile(profileId);

    const profile = profiles.find((p) => p.id === profileId);
    if (!profile || images.length === 0) return;

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
      filename: path.split("/").pop() || path.split("\\").pop() || path,
      selected: false,
      status: "pending" as const,
    }));

    setCurrentView("grid");

    // Read EXIF data for each image and apply profile defaults
    const profile = profiles.find((p) => p.id === selectedProfile);

    const updatedImages = await Promise.all(
      newImages.map(async (image) => {
        try {
          const result = await window.electronAPI.readExif(image.path);
          if ("error" in result) {
            return { ...image, error: result.error };
          }

          // Start with profile defaults as pending changes
          const pendingChanges = profile
            ? applyProfileToPendingChanges(undefined, profile)
            : {};

          return {
            ...image,
            existingExif: result.data,
            pendingChanges,
          };
        } catch (error) {
          return { ...image, error: String(error) };
        }
      })
    );

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
      .map((file) => file.path);

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
          ? { ...img, pendingChanges: { ...img.pendingChanges, ...changes } }
          : img
      )
    );
  };

  const handleUpdateMultiplePendingChanges = (paths: string[], changes: Partial<ExifData>) => {
    setImages((prev) =>
      prev.map((img) =>
        paths.includes(img.path)
          ? { ...img, pendingChanges: { ...img.pendingChanges, ...changes } }
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

        // Skip if image already has location and we're not overwriting
        if (!overwriteExisting && img.existingExif?.location) {
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

  // Check if any selected images have existing location data
  const hasLocationConflicts = Array.from(selectedImageIds).some((id) => {
    const image = images.find((img) => img.path === id);
    return image?.existingExif?.location;
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
          image.pendingChanges,
          true // Keep backup
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
    // Cleanup backup files before clearing log
    const backupPaths = processingLog
      .filter((entry) => entry.success && entry.backupPath)
      .map((entry) => entry.backupPath as string);

    if (backupPaths.length > 0) {
      try {
        await window.electronAPI.cleanupBackups(backupPaths);
      } catch (error) {
        console.error("Failed to cleanup backups:", error);
      }
    }

    try {
      await window.electronAPI.clearProcessingLog();
      setProcessingLog([]);
    } catch (error) {
      console.error("Failed to clear log:", error);
    }
  };

  const handleClearImages = async () => {
    // Cleanup backup files for successfully saved images
    const backupPaths = processingLog
      .filter((entry) => entry.success && entry.backupPath)
      .map((entry) => entry.backupPath as string);

    if (backupPaths.length > 0) {
      try {
        await window.electronAPI.cleanupBackups(backupPaths);
      } catch (error) {
        console.error("Failed to cleanup backups:", error);
      }
    }

    setImages([]);
    setSelectedImageIds(new Set());
    setCurrentView("dropzone");
  };

  const handleDiscardChanges = () => {
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
                    : `Save Changes (${imagesWithChanges})`}
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
