import React from "react";
import { Icon } from "@iconify/react";
import type { ImageFile, ExifData, CameraProfile } from "../../types";
import { SingleImageEditor } from "./SingleImageEditor";
import { MultiImageEditor } from "./MultiImageEditor";

interface ImageSidebarProps {
  selectedImages: ImageFile[];
  onUpdatePendingChanges: (path: string, changes: Partial<ExifData>) => void;
  onUpdateMultiplePendingChanges: (paths: string[], changes: Partial<ExifData>) => void;
  activeProfile: CameraProfile | null;
}

export function ImageSidebar({
  selectedImages,
  onUpdatePendingChanges,
  onUpdateMultiplePendingChanges,
  activeProfile,
}: ImageSidebarProps) {
  return (
    <aside className="w-80 flex-shrink-0 bg-white dark:bg-neutral-800 border-l border-gray-200 dark:border-neutral-700 overflow-y-auto">
      <div className="p-4">
        {selectedImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <Icon icon="mdi:image-edit-outline" className="w-12 h-12 mb-3" />
            <p className="text-sm text-center">Select an image to edit</p>
          </div>
        ) : selectedImages.length === 1 ? (
          <SingleImageEditor
            image={selectedImages[0]}
            onUpdatePendingChanges={onUpdatePendingChanges}
            activeProfile={activeProfile}
          />
        ) : (
          <MultiImageEditor
            images={selectedImages}
            onUpdatePendingChanges={onUpdateMultiplePendingChanges}
            activeProfile={activeProfile}
          />
        )}
      </div>
    </aside>
  );
}
