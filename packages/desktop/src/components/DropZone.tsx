import React from "react";

import { Icon } from "@iconify/react";


interface DropZoneProps {
  isProcessing: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: () => void;
}

export function DropZone({
  isProcessing,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: DropZoneProps) {
  return (
    <div
      className="h-full w-full bg-white dark:bg-neutral-700 flex items-center justify-center cursor-pointer transition-colors duration-300 relative hover:bg-blue-50 dark:hover:bg-blue-900"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onFileSelect}
    >
      {isProcessing ? (
        <div className="flex flex-col items-center gap-4 text-gray-600 dark:text-gray-300">
          <div className="w-10 h-10 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="text-center flex flex-col items-center text-gray-500 dark:text-gray-400">
          <div className="text-8xl opacity-20">
            <Icon icon="mdi:arrow-down-bold" width={128} height={128} />
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Supported: JPG, JPEG, TIFF
          </p>
        </div>
      )}
    </div>
  );
}
