import React, { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";

interface ConstrainedDropdownProps<T> {
  label: string;
  value: T | undefined;
  options: T[];
  customValues: T[];
  onChange: (value: T) => void;
  onAddCustom: (value: T) => void;
  formatDisplay: (value: T) => string;
  parseInput: (input: string) => T | null;
  placeholder?: string;
  disabled?: boolean;
}

export function ConstrainedDropdown<T>({
  label,
  value,
  options,
  customValues,
  onChange,
  onAddCustom,
  formatDisplay,
  parseInput,
  placeholder = "Select...",
  disabled = false,
}: ConstrainedDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build the full list of items for keyboard navigation
  const allItems = [
    ...options.map((opt) => ({ type: "standard" as const, value: opt })),
    ...customValues.map((opt) => ({ type: "custom" as const, value: opt })),
    { type: "add" as const, value: null },
  ];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsAddingCustom(false);
        setCustomInput("");
        setCustomError(null);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus input when adding custom value
  useEffect(() => {
    if (isAddingCustom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingCustom]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-dropdown-item]");
      const focusedItem = items[focusedIndex] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex]);

  const handleSelect = useCallback(
    (selectedValue: T) => {
      onChange(selectedValue);
      setIsOpen(false);
      setFocusedIndex(-1);
    },
    [onChange]
  );

  const handleAddCustomClick = useCallback(() => {
    setIsAddingCustom(true);
    setFocusedIndex(-1);
  }, []);

  const handleCustomSubmit = useCallback(() => {
    const trimmedInput = customInput.trim();
    if (!trimmedInput) {
      setCustomError("Please enter a value");
      return;
    }

    const parsed = parseInput(trimmedInput);
    if (parsed === null) {
      setCustomError("Invalid value format");
      return;
    }

    // Check if value already exists in standard options
    const existsInStandard = options.some(
      (opt) => formatDisplay(opt) === formatDisplay(parsed)
    );
    if (existsInStandard) {
      // Just select the existing value
      onChange(parsed);
      setIsAddingCustom(false);
      setCustomInput("");
      setCustomError(null);
      setIsOpen(false);
      return;
    }

    // Check if value already exists in custom values
    const existsInCustom = customValues.some(
      (opt) => formatDisplay(opt) === formatDisplay(parsed)
    );
    if (existsInCustom) {
      // Just select the existing value
      onChange(parsed);
      setIsAddingCustom(false);
      setCustomInput("");
      setCustomError(null);
      setIsOpen(false);
      return;
    }

    // Add as new custom value
    onAddCustom(parsed);
    onChange(parsed);
    setIsAddingCustom(false);
    setCustomInput("");
    setCustomError(null);
    setIsOpen(false);
  }, [
    customInput,
    parseInput,
    options,
    customValues,
    formatDisplay,
    onChange,
    onAddCustom,
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
          event.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      if (isAddingCustom) {
        if (event.key === "Escape") {
          event.preventDefault();
          setIsAddingCustom(false);
          setCustomInput("");
          setCustomError(null);
        } else if (event.key === "Enter") {
          event.preventDefault();
          handleCustomSubmit();
        }
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setFocusedIndex((prev) =>
            prev < allItems.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < allItems.length) {
            const item = allItems[focusedIndex];
            if (item.type === "add") {
              handleAddCustomClick();
            } else if (item.value !== null) {
              handleSelect(item.value);
            }
          }
          break;
        case "Escape":
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case "Tab":
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [
      disabled,
      isOpen,
      isAddingCustom,
      allItems,
      focusedIndex,
      handleSelect,
      handleAddCustomClick,
      handleCustomSubmit,
    ]
  );

  const displayValue = value !== undefined ? formatDisplay(value) : placeholder;

  return (
    <div className="flex flex-col gap-1.5" ref={dropdownRef}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          className={`w-full flex items-center justify-between px-3 py-2 text-left bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg shadow-sm transition-colors ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:border-gray-400 dark:hover:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          } ${value === undefined ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="truncate">{displayValue}</span>
          <Icon
            icon="material-symbols:expand-more"
            className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            role="listbox"
          >
            {/* Standard options section */}
            {options.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-neutral-700">
                  Standard Values
                </div>
                {options.map((option, index) => {
                  const isSelected =
                    value !== undefined &&
                    formatDisplay(value) === formatDisplay(option);
                  const isFocused = focusedIndex === index;
                  return (
                    <div
                      key={`standard-${index}`}
                      data-dropdown-item
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                        isFocused
                          ? "bg-blue-50 dark:bg-blue-900/50"
                          : "hover:bg-gray-50 dark:hover:bg-neutral-700"
                      } ${isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
                      onClick={() => handleSelect(option)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {formatDisplay(option)}
                      </span>
                      {isSelected && (
                        <Icon
                          icon="material-symbols:check"
                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Custom values section */}
            {customValues.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-t border-gray-100 dark:border-neutral-700">
                  Custom Values
                </div>
                {customValues.map((option, index) => {
                  const globalIndex = options.length + index;
                  const isSelected =
                    value !== undefined &&
                    formatDisplay(value) === formatDisplay(option);
                  const isFocused = focusedIndex === globalIndex;
                  return (
                    <div
                      key={`custom-${index}`}
                      data-dropdown-item
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                        isFocused
                          ? "bg-blue-50 dark:bg-blue-900/50"
                          : "hover:bg-gray-50 dark:hover:bg-neutral-700"
                      } ${isSelected ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
                      onClick={() => handleSelect(option)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {formatDisplay(option)}
                      </span>
                      {isSelected && (
                        <Icon
                          icon="material-symbols:check"
                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Add custom value section */}
            <div className="border-t border-gray-100 dark:border-neutral-700">
              {isAddingCustom ? (
                <div className="p-3">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={customInput}
                      onChange={(e) => {
                        setCustomInput(e.target.value);
                        setCustomError(null);
                      }}
                      onKeyDown={handleKeyDown}
                      className={`flex-1 px-2 py-1.5 text-sm bg-white dark:bg-neutral-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 ${
                        customError
                          ? "border-red-300 dark:border-red-500"
                          : "border-gray-300 dark:border-neutral-600"
                      }`}
                      placeholder="Enter value..."
                    />
                    <button
                      type="button"
                      onClick={handleCustomSubmit}
                      className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                      title="Add value"
                    >
                      <Icon icon="material-symbols:check" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustom(false);
                        setCustomInput("");
                        setCustomError(null);
                      }}
                      className="px-2 py-1.5 bg-gray-200 dark:bg-neutral-600 hover:bg-gray-300 dark:hover:bg-neutral-500 text-gray-700 dark:text-gray-200 rounded-md transition-colors"
                      title="Cancel"
                    >
                      <Icon icon="material-symbols:close" className="w-4 h-4" />
                    </button>
                  </div>
                  {customError && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {customError}
                    </p>
                  )}
                </div>
              ) : (
                <div
                  data-dropdown-item
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    focusedIndex === allItems.length - 1
                      ? "bg-blue-50 dark:bg-blue-900/50"
                      : "hover:bg-gray-50 dark:hover:bg-neutral-700"
                  }`}
                  onClick={handleAddCustomClick}
                  role="option"
                >
                  <Icon
                    icon="material-symbols:add"
                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                  />
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    Add custom value...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
