import React from "react";
import { Icon } from "@iconify/react";
import type { ProcessingLogEntry } from "../../types";
import { LogEntry } from "./LogEntry";

interface ProcessingLogProps {
  entries: ProcessingLogEntry[];
  onClear: () => void;
  onUndo: (entry: ProcessingLogEntry) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ProcessingLog({
  entries,
  onClear,
  onUndo,
  isOpen,
  onClose,
}: ProcessingLogProps) {
  // Sort entries by timestamp, most recent first
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const successCount = entries.filter((e) => e.success).length;
  const errorCount = entries.filter((e) => !e.success).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        className={`
          fixed right-0 top-0 bottom-0 w-full max-w-md z-50
          bg-gray-50 dark:bg-neutral-800
          shadow-xl
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon
                icon="mdi:history"
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
              />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 [text-wrap:balance]">
                Processing History
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
              title="Close"
            >
              <Icon icon="mdi:close" className="w-5 h-5" />
            </button>
          </div>

          {/* Stats summary */}
          {entries.length > 0 && (
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </span>
              {successCount > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 tabular-nums">
                  <Icon icon="mdi:check-circle" className="w-4 h-4" />
                  {successCount} successful
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-500 tabular-nums">
                  <Icon icon="mdi:alert-circle" className="w-4 h-4" />
                  {errorCount} failed
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {sortedEntries.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
                <Icon
                  icon="mdi:clipboard-text-clock-outline"
                  className="w-8 h-8 text-gray-400 dark:text-gray-500"
                />
              </div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                No Processing History
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Your processing history will appear here after you edit metadata
                on your images.
              </p>
            </div>
          ) : (
            /* Log entries list */
            <div className="p-4 space-y-3">
              {sortedEntries.map((entry) => (
                <LogEntry
                  key={entry.id}
                  entry={entry}
                  onUndo={() => onUndo(entry)}
                  canUndo={Boolean(entry.backupPath) && entry.success}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with Clear All button */}
        {entries.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <button
              onClick={onClear}
              className="
                w-full flex items-center justify-center gap-2 px-4 py-2.5
                text-sm font-medium
                text-red-600 dark:text-red-400
                bg-red-50 dark:bg-red-900/20
                hover:bg-red-100 dark:hover:bg-red-900/30
                border border-red-200 dark:border-red-800
                rounded-lg
                transition-[background-color,transform] active:scale-[0.96]
              "
            >
              <Icon icon="mdi:delete-outline" className="w-5 h-5" />
              Clear All History
            </button>
          </div>
        )}
      </div>
    </>
  );
}
