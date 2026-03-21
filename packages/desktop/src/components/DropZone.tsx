import React from "react";

import { Icon } from "@iconify/react";

import { ProcessResult } from "../types";

interface DropZoneProps {
  isDragOver: boolean;
  isProcessing: boolean;
  results: ProcessResult[];
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: () => void;
  onClearResults: () => void;
}

export function DropZone({
  isDragOver,
  isProcessing,
  results,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onClearResults,
}: DropZoneProps) {
  return (
    <div
      className={`h-full w-full bg-white dark:bg-neutral-700 flex items-center justify-center cursor-pointer transition-colors duration-300 relative ${
        isDragOver
          ? "bg-blue-50 dark:bg-blue-900"
          : "hover:bg-blue-50 dark:hover:bg-blue-900"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onFileSelect}
    >
      {isProcessing ? (
        <div className="flex flex-col items-center gap-4 text-gray-600 dark:text-gray-300">
          <div className="w-10 h-10 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="w-full max-w-2xl text-left">
          <div className="flex flex-col gap-2 mb-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-2 px-3 rounded-md text-sm ${
                  result.success
                    ? "bg-green-100 dark:bg-green-900 border-l-3 border-green-500"
                    : "bg-red-100 dark:bg-red-900 border-l-3 border-red-500"
                }`}
              >
                <span className="text-lg">{result.success ? "✅" : "❌"}</span>
                <span className="font-medium flex-1 text-gray-800 dark:text-gray-200">
                  {result.file}
                </span>
                {result.error && (
                  <span className="text-xs text-red-500 dark:text-red-400">
                    {result.error}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 transition-colors"
            onClick={onClearResults}
          >
            Clear Results
          </button>
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
