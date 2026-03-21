import React from "react";
import { Icon } from "@iconify/react";

interface MergeConflictProps {
  field: string;
  existingValue: any;
  newValue: any;
  choice: "keep" | "overwrite";
  onChange: (choice: "keep" | "overwrite") => void;
  isScannerData: boolean;
  formatValue?: (value: any) => string;
}

export function MergeConflict({
  field,
  existingValue,
  newValue,
  choice,
  onChange,
  isScannerData,
  formatValue,
}: MergeConflictProps) {
  const displayValue = (value: any): string => {
    if (formatValue) {
      return formatValue(value);
    }
    if (value === null || value === undefined) {
      return "—";
    }
    if (typeof value === "object") {
      if ("name" in value) {
        return value.name;
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  const existingDisplay = displayValue(existingValue);
  const newDisplay = displayValue(newValue);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {field}
      </label>
      <div className="grid grid-cols-2 gap-3">
        {/* Existing Value Option */}
        <label
          className={`
            relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-[border-color,background-color]
            ${
              choice === "keep"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                : "border-gray-200 dark:border-neutral-600 hover:border-gray-300 dark:hover:border-neutral-500"
            }
            ${isScannerData ? "bg-amber-50 dark:bg-amber-900/20" : ""}
          `}
        >
          <input
            type="radio"
            name={`merge-${field}`}
            value="keep"
            checked={choice === "keep"}
            onChange={() => onChange("keep")}
            className="sr-only"
          />
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${
                  choice === "keep"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 dark:border-neutral-500"
                }
              `}
            >
              {choice === "keep" && (
                <Icon
                  icon="mdi:check"
                  className="w-3 h-3 text-white"
                />
              )}
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Existing
            </span>
            {isScannerData && (
              <div className="group relative ml-auto">
                <Icon
                  icon="mdi:alert"
                  className="w-4 h-4 text-amber-500"
                />
                <div className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  This appears to be scanner metadata
                </div>
              </div>
            )}
          </div>
          <span
            className={`
              text-sm truncate
              ${
                choice === "keep"
                  ? "text-gray-900 dark:text-gray-100 font-medium"
                  : "text-gray-600 dark:text-gray-400"
              }
            `}
            title={existingDisplay}
          >
            {existingDisplay}
          </span>
        </label>

        {/* New Value Option */}
        <label
          className={`
            relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-[border-color,background-color]
            ${
              choice === "overwrite"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                : "border-gray-200 dark:border-neutral-600 hover:border-gray-300 dark:hover:border-neutral-500"
            }
          `}
        >
          <input
            type="radio"
            name={`merge-${field}`}
            value="overwrite"
            checked={choice === "overwrite"}
            onChange={() => onChange("overwrite")}
            className="sr-only"
          />
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${
                  choice === "overwrite"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 dark:border-neutral-500"
                }
              `}
            >
              {choice === "overwrite" && (
                <Icon
                  icon="mdi:check"
                  className="w-3 h-3 text-white"
                />
              )}
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              New
            </span>
          </div>
          <span
            className={`
              text-sm truncate
              ${
                choice === "overwrite"
                  ? "text-gray-900 dark:text-gray-100 font-medium"
                  : "text-gray-600 dark:text-gray-400"
              }
            `}
            title={newDisplay}
          >
            {newDisplay}
          </span>
        </label>
      </div>
    </div>
  );
}
