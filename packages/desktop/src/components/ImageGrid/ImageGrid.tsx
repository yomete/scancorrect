import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { ImageCard } from "./ImageCard";
import type { ImageFile } from "../../types";

type SortOrder = "filename-asc" | "filename-desc";

interface ImageGridProps {
  images: ImageFile[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onImageClick: (image: ImageFile) => void;
  sortOrder?: SortOrder;
}

export function ImageGrid({
  images,
  selectedIds,
  onSelectionChange,
  onImageClick,
  sortOrder = "filename-asc",
}: ImageGridProps) {
  // Sort images alphabetically by filename
  const sortedImages = useMemo(() => {
    const sorted = [...images].sort((a, b) => {
      const comparison = a.filename.localeCompare(b.filename, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortOrder === "filename-desc" ? -comparison : comparison;
    });
    return sorted;
  }, [images, sortOrder]);

  const allSelected = images.length > 0 && selectedIds.size === images.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < images.length;

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all
      const allIds = new Set(images.map((img) => img.path));
      onSelectionChange(allIds);
    }
  };

  const handleImageSelect = (image: ImageFile, selected: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (selected) {
      newSelectedIds.add(image.path);
    } else {
      newSelectedIds.delete(image.path);
    }
    onSelectionChange(newSelectedIds);
  };

  // Check if an image has pending changes
  const hasPendingChanges = (image: ImageFile): boolean => {
    return !!image.pendingChanges && Object.keys(image.pendingChanges).length > 0;
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with selection controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-800">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) {
                  el.indeterminate = someSelected;
                }
              }}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-300 dark:border-neutral-500 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Select All
            </span>
          </label>
          {selectedIds.size > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
              ({selectedIds.size} of {images.length} selected)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Icon icon="mdi:sort-alphabetical-ascending" className="w-4 h-4" />
          <span className="tabular-nums">{images.length} {images.length === 1 ? "image" : "images"}</span>
        </div>
      </div>

      {/* Grid of images */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {sortedImages.map((image) => (
            <ImageCard
              key={image.path}
              image={image}
              selected={selectedIds.has(image.path)}
              onSelect={(selected) => handleImageSelect(image, selected)}
              onClick={() => onImageClick(image)}
              showScannerWarning={!!image.isScanner}
              hasPendingChanges={hasPendingChanges(image)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
