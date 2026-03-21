import { Icon } from "@iconify/react";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSetLocation: () => void;
  onApplyDefaults: () => void;
  onClearSelection: () => void;
  disabled?: boolean;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onSetLocation,
  onApplyDefaults,
  onClearSelection,
  disabled = false,
}: BulkActionBarProps) {
  const hasSelection = selectedCount > 0;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-neutral-700
        border-t border-gray-200 dark:border-neutral-600
        transition-opacity duration-200
        ${!hasSelection ? "opacity-60" : ""}
      `}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap tabular-nums">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <div className="h-4 w-px bg-gray-300 dark:bg-neutral-500" />

      <div className="flex items-center gap-2 flex-wrap">
        {!allSelected ? (
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled || totalCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-600 hover:bg-gray-200 dark:hover:bg-neutral-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="mdi:checkbox-multiple-marked" width={16} height={16} />
            Select All
          </button>
        ) : (
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-600 hover:bg-gray-200 dark:hover:bg-neutral-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="mdi:checkbox-multiple-blank-outline" width={16} height={16} />
            Deselect All
          </button>
        )}

        <button
          type="button"
          onClick={onSetLocation}
          disabled={disabled || !hasSelection}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-[background-color,transform] active:scale-[0.96] disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <Icon icon="mdi:map-marker" width={16} height={16} />
          Set Location
        </button>

        <button
          type="button"
          onClick={onApplyDefaults}
          disabled={disabled || !hasSelection}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-md transition-[background-color,transform] active:scale-[0.96] disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <Icon icon="mdi:camera" width={16} height={16} />
          Apply Profile Defaults
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          disabled={disabled || !hasSelection}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon icon="mdi:close" width={16} height={16} />
          Clear Selection
        </button>
      </div>
    </div>
  );
}
