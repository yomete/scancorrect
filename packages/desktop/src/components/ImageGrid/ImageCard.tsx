import React from "react";
import { Icon } from "@iconify/react";
import type { ImageFile } from "../../types";
import { useThumbnailExtraction } from "../../hooks/useThumbnailExtraction";

interface ImageCardProps {
  image: ImageFile;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  showScannerWarning: boolean;
  hasPendingChanges?: boolean;
}

export function ImageCard({
  image,
  selected,
  onSelect,
  onClick,
  showScannerWarning,
  hasPendingChanges = false,
}: ImageCardProps) {
  const { thumbnail, loading: thumbnailLoading } = useThumbnailExtraction(image.path);
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect(e.target.checked);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const getStatusIcon = () => {
    switch (image.status) {
      case "processing":
        return (
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        );
      case "success":
        return (
          <Icon
            icon="mdi:check-circle"
            className="w-4 h-4 text-green-500"
          />
        );
      case "error":
        return (
          <Icon
            icon="mdi:alert-circle"
            className="w-4 h-4 text-red-500"
          />
        );
      default:
        return (
          <Icon
            icon="mdi:clock-outline"
            className="w-4 h-4 text-gray-400 dark:text-gray-500"
          />
        );
    }
  };

  const getStatusLabel = () => {
    switch (image.status) {
      case "processing":
        return "Processing...";
      case "success":
        return "Saved";
      case "error":
        return image.error || "Error";
      default:
        return "Pending";
    }
  };

  const getFileExtension = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    return ext || "";
  };

  const getFileIcon = () => {
    const ext = getFileExtension(image.filename);
    if (ext === "tiff" || ext === "tif") {
      return "mdi:file-image";
    }
    return "mdi:file-jpg-box";
  };

  const getMetadataSummary = (): string | null => {
    const parts: string[] = [];

    if (image.existingExif?.make || image.pendingChanges?.make) {
      const make = image.pendingChanges?.make || image.existingExif?.make;
      const model = image.pendingChanges?.model || image.existingExif?.model;
      if (make && model) {
        parts.push(`${make} ${model}`);
      } else if (make) {
        parts.push(make);
      }
    }

    if (image.existingExif?.location || image.pendingChanges?.location) {
      const location = image.pendingChanges?.location || image.existingExif?.location;
      if (location?.name) {
        parts.push(location.name);
      }
    }

    return parts.length > 0 ? parts.join(" | ") : null;
  };

  const metadataSummary = getMetadataSummary();

  const getBorderClass = () => {
    if (selected) {
      return "border-blue-500 bg-blue-50 dark:bg-blue-900/30";
    }
    if (hasPendingChanges) {
      return "border-amber-400 dark:border-amber-500 bg-white dark:bg-neutral-700 hover:border-amber-500 dark:hover:border-amber-400";
    }
    return "border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 hover:border-gray-300 dark:hover:border-neutral-500";
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative flex flex-col p-3 rounded-lg border-2 cursor-pointer
        transition-[border-color,background-color,transform] duration-150
        active:scale-[0.96]
        ${getBorderClass()}
      `}
    >
      {/* Header: Checkbox and Status */}
      <div className="flex items-center justify-between mb-2">
        <label
          className="flex items-center"
          onClick={handleCheckboxClick}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheckboxChange}
            className="w-4 h-4 rounded border-gray-300 dark:border-neutral-500 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
          />
        </label>
        <div className="flex items-center gap-1.5">
          {showScannerWarning && (
            <div className="group relative">
              <Icon
                icon="mdi:scanner"
                className="w-4 h-4 text-amber-500"
              />
              <div className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Scanner metadata detected
              </div>
            </div>
          )}
          {getStatusIcon()}
        </div>
      </div>

      {/* Thumbnail or File Icon */}
      <div className="flex justify-center items-center py-2 min-h-[80px]">
        {thumbnailLoading ? (
          <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        ) : thumbnail ? (
          <img
            src={thumbnail}
            alt={image.filename}
            className="max-h-[80px] max-w-full object-contain rounded outline outline-1 outline-black/10 dark:outline-white/10"
          />
        ) : (
          <Icon
            icon={getFileIcon()}
            className="w-12 h-12 text-gray-400 dark:text-gray-500"
          />
        )}
      </div>

      {/* Filename */}
      <div className="mt-auto">
        <p
          className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate"
          title={image.filename}
        >
          {image.filename}
        </p>

        {/* Status Label */}
        <p
          className={`text-xs mt-0.5 ${
            image.status === "error"
              ? "text-red-500"
              : image.status === "success"
              ? "text-green-600 dark:text-green-400"
              : image.status === "processing"
              ? "text-blue-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {getStatusLabel()}
        </p>

        {/* Metadata Summary */}
        {metadataSummary && (
          <p
            className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate"
            title={metadataSummary}
          >
            {metadataSummary}
          </p>
        )}
      </div>
    </div>
  );
}
