import React, { useRef } from "react";
import { Icon } from "@iconify/react";

interface DateFieldProps {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string | undefined) => void;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function DateField({
  value,
  onChange,
  label,
  disabled = false,
  placeholder = "YYYY-MM-DD",
}: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange(undefined);
    inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue || undefined);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={value || ""}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full p-2.5 px-3 pr-8 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          } ${!value ? "text-gray-400 dark:text-gray-500" : ""}`}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear date"
          >
            <Icon icon="mdi:close-circle" width={16} height={16} />
          </button>
        )}
      </div>
    </div>
  );
}
