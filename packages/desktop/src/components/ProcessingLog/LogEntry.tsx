import React, { useState } from "react";
import { Icon } from "@iconify/react";
import type { ProcessingLogEntry, ExifData } from "../../types";

interface LogEntryProps {
  entry: ProcessingLogEntry;
  onUndo: () => void;
  canUndo: boolean;
}

function formatTimestamp(date: Date | string): string {
  const now = new Date();
  const entryDate = new Date(date);

  const isToday =
    entryDate.getDate() === now.getDate() &&
    entryDate.getMonth() === now.getMonth() &&
    entryDate.getFullYear() === now.getFullYear();

  const isYesterday =
    entryDate.getDate() === now.getDate() - 1 &&
    entryDate.getMonth() === now.getMonth() &&
    entryDate.getFullYear() === now.getFullYear();

  const timeStr = entryDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today ${timeStr}`;
  }

  if (isYesterday) {
    return `Yesterday ${timeStr}`;
  }

  return entryDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + ` ${timeStr}`;
}

function formatAperture(value: number): string {
  return `f/${value}`;
}

function formatShutterSpeed(value: number): string {
  if (value >= 1) {
    return `${value}"`;
  }
  const denominator = Math.round(1 / value);
  return `1/${denominator}`;
}

function formatExposureComp(value: number): string {
  if (value > 0) return `+${value} EV`;
  if (value < 0) return `${value} EV`;
  return "0 EV";
}

function getChangesSummary(changes: Partial<ExifData>): string {
  const parts: string[] = [];

  if (changes.make || changes.model) {
    const camera = [changes.make, changes.model].filter(Boolean).join(" ");
    if (camera) parts.push(camera);
  }

  if (changes.lens) {
    parts.push(changes.lens);
  }

  if (changes.iso) {
    parts.push(`ISO ${changes.iso}`);
  }

  if (changes.aperture) {
    parts.push(formatAperture(changes.aperture));
  }

  if (changes.shutterSpeed) {
    parts.push(formatShutterSpeed(changes.shutterSpeed));
  }

  if (changes.focalLength) {
    parts.push(`${changes.focalLength}mm`);
  }

  if (changes.exposureComp === null) {
    parts.push("Exposure Comp removed");
  } else if (changes.exposureComp !== undefined) {
    parts.push(formatExposureComp(changes.exposureComp));
  }

  if (changes.filmStock) {
    parts.push(changes.filmStock);
  }

  if (changes.location?.name) {
    parts.push(`Location: ${changes.location.name}`);
  }

  if (changes.dateOriginal) {
    parts.push(`Date: ${changes.dateOriginal}`);
  }

  return parts.length > 0 ? parts.join(", ") : "No changes";
}

function getChangesDetails(changes: Partial<ExifData>): { label: string; value: string }[] {
  const details: { label: string; value: string }[] = [];

  if (changes.make) {
    details.push({ label: "Make", value: changes.make });
  }

  if (changes.model) {
    details.push({ label: "Model", value: changes.model });
  }

  if (changes.lens) {
    details.push({ label: "Lens", value: changes.lens });
  }

  if (changes.iso) {
    details.push({ label: "ISO", value: String(changes.iso) });
  }

  if (changes.aperture) {
    details.push({ label: "Aperture", value: formatAperture(changes.aperture) });
  }

  if (changes.shutterSpeed) {
    details.push({ label: "Shutter Speed", value: formatShutterSpeed(changes.shutterSpeed) });
  }

  if (changes.focalLength) {
    details.push({ label: "Focal Length", value: `${changes.focalLength}mm` });
  }

  if (changes.exposureComp === null) {
    details.push({ label: "Exposure Comp", value: "removed" });
  } else if (changes.exposureComp !== undefined) {
    details.push({ label: "Exposure Comp", value: formatExposureComp(changes.exposureComp) });
  }

  if (changes.filmStock) {
    details.push({ label: "Film Stock", value: changes.filmStock });
  }

  if (changes.location) {
    details.push({ label: "Location", value: changes.location.name });
    details.push({
      label: "GPS",
      value: `${changes.location.latitude.toFixed(6)}, ${changes.location.longitude.toFixed(6)}`
    });
  }

  if (changes.dateOriginal) {
    details.push({ label: "Date", value: changes.dateOriginal });
  }

  return details;
}

export function LogEntry({ entry, onUndo, canUndo }: LogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const changesSummary = getChangesSummary(entry.changesApplied);
  const changesDetails = getChangesDetails(entry.changesApplied);

  return (
    <div
      className={`
        border rounded-lg overflow-hidden transition-colors
        ${entry.success
          ? "border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700"
          : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
        }
      `}
    >
      {/* Main entry row */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Status indicator */}
          <div className="flex-shrink-0 mt-0.5">
            {entry.success ? (
              <Icon
                icon="mdi:check-circle"
                className="w-5 h-5 text-green-500"
              />
            ) : (
              <Icon
                icon="mdi:alert-circle"
                className="w-5 h-5 text-red-500"
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Timestamp and filename row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimestamp(entry.timestamp)}
              </span>
              <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
              <span
                className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate"
                title={entry.filename}
              >
                {entry.filename}
              </span>
            </div>

            {/* Profile used */}
            {entry.profileUsed && (
              <div className="flex items-center gap-1 mt-1">
                <Icon
                  icon="mdi:camera"
                  className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.profileUsed}
                </span>
              </div>
            )}

            {/* Changes summary or error */}
            <div className="mt-1.5">
              {entry.success ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {changesSummary}
                  </p>
                  {entry.warning && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {entry.warning}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {entry.error || "Unknown error"}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Expand/collapse button */}
            {entry.success && changesDetails.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors"
                title={isExpanded ? "Collapse details" : "Expand details"}
              >
                <Icon
                  icon={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"}
                  className="w-5 h-5"
                />
              </button>
            )}

            {/* Undo button */}
            {canUndo && entry.success && (
              <button
                onClick={onUndo}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
                  text-gray-600 dark:text-gray-300
                  bg-gray-100 dark:bg-neutral-600
                  hover:bg-gray-200 dark:hover:bg-neutral-500
                  transition-colors"
                title="Undo this change"
              >
                <Icon icon="mdi:undo" className="w-4 h-4" />
                Undo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && changesDetails.length > 0 && (
        <div className="px-3 pb-3 pt-0">
          <div className="pl-8 border-t border-gray-100 dark:border-neutral-600 pt-3">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Changes Applied
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {changesDetails.map((detail, index) => (
                <div key={index} className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 min-w-[80px]">
                    {detail.label}:
                  </span>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>

            {/* File path */}
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-neutral-600">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Path: {entry.filePath}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
