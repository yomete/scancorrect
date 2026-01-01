import React from "react";
import { Icon } from "@iconify/react";

interface SidebarThumbnailProps {
  thumbnail: string | null;
  loading: boolean;
  filename: string;
}

export function SidebarThumbnail({
  thumbnail,
  loading,
  filename,
}: SidebarThumbnailProps) {
  if (loading) {
    return (
      <div className="w-full max-h-[300px] bg-gray-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center aspect-[4/3]">
        <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs">Loading preview...</span>
        </div>
      </div>
    );
  }

  if (thumbnail) {
    return (
      <div className="w-full max-h-[300px] bg-gray-100 dark:bg-neutral-800 rounded-lg overflow-hidden">
        <img
          src={thumbnail}
          alt={filename}
          className="w-full h-full object-contain max-h-[300px]"
        />
      </div>
    );
  }

  return (
    <div className="w-full max-h-[300px] bg-gray-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center aspect-[4/3]">
      <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
        <Icon icon="mdi:image-off" className="w-12 h-12" />
        <span className="text-xs">No preview available</span>
      </div>
    </div>
  );
}
