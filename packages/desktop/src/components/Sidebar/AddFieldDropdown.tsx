import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";

interface AddFieldDropdownProps {
  availableFields: { field: string; label: string }[];
  onAddField: (field: string) => void;
}

export function AddFieldDropdown({
  availableFields,
  onAddField,
}: AddFieldDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (field: string) => {
    onAddField(field);
    setIsOpen(false);
  };

  if (availableFields.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-blue-600 dark:text-blue-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <Icon icon="mdi:plus" className="w-4 h-4" />
        <span>Add field</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg overflow-hidden">
          {availableFields.map((item) => (
            <button
              key={item.field}
              type="button"
              onClick={() => handleSelect(item.field)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
