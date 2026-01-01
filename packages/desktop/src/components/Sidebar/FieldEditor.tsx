import React from "react";
import { Icon } from "@iconify/react";

interface FieldEditorProps {
  field: string;
  label: string;
  existingValue: string | number | undefined;
  pendingValue: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  onRestore: () => void;
  scannerReplaced?: boolean;
  options?: { value: string | number; label: string }[];
  type?: "text" | "number" | "date";
}

export function FieldEditor({
  field,
  label,
  existingValue,
  pendingValue,
  onChange,
  onRestore,
  scannerReplaced = false,
  options,
  type = "text",
}: FieldEditorProps) {
  const currentValue = pendingValue !== undefined ? pendingValue : existingValue;
  const hasChanged = pendingValue !== undefined && pendingValue !== existingValue;
  const displayExisting = existingValue !== undefined ? String(existingValue) : "";
  const displayPending = pendingValue !== undefined ? String(pendingValue) : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "") {
      onChange(undefined);
    } else if (type === "number") {
      const num = parseFloat(value);
      onChange(isNaN(num) ? undefined : num);
    } else {
      onChange(value);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {scannerReplaced && (
          <div className="group relative">
            <Icon
              icon="mdi:swap-horizontal"
              className="w-4 h-4 text-amber-500"
            />
            <div className="absolute bottom-full left-0 mb-1 px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Replaced scanner metadata
            </div>
          </div>
        )}
      </div>

      {hasChanged && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="line-through">{displayExisting || "(empty)"}</span>
          <Icon icon="mdi:arrow-right" className="w-3 h-3" />
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {displayPending || "(empty)"}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {options ? (
          <select
            value={currentValue !== undefined ? String(currentValue) : ""}
            onChange={handleChange}
            className="flex-1 p-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type === "date" ? "date" : type}
            value={currentValue !== undefined ? String(currentValue) : ""}
            onChange={handleChange}
            className="flex-1 p-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
          />
        )}

        {hasChanged && (
          <button
            type="button"
            onClick={onRestore}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-600 rounded-md transition-colors"
            title="Restore original value"
          >
            <Icon icon="mdi:undo" className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
