import { useState, useRef, useEffect } from "react";

import { Icon } from "@iconify/react";

import { useTheme } from "../ThemeContext";

type Theme = "light" | "dark" | "system";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getThemeIcon = (themeMode: Theme): JSX.Element => {
    switch (themeMode) {
      case "light":
        return (
          <Icon
            className="text-gray-500 dark:text-gray-400"
            icon="material-symbols:sunny"
          />
        );
      case "dark":
        return (
          <Icon
            className="text-gray-500 dark:text-gray-400"
            icon="material-symbols:dark-mode"
          />
        );
      case "system":
        return (
          <Icon
            className="text-gray-500 dark:text-gray-400"
            icon="ic:twotone-desktop-mac"
          />
        );
      default:
        return (
          <Icon
            className="text-gray-500 dark:text-gray-400"
            icon="ic:twotone-desktop-mac"
          />
        );
    }
  };

  const getThemeLabel = (themeMode: Theme): string => {
    switch (themeMode) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
      default:
        return "System";
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="text-gray-500 dark:text-gray-400 text-lg p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center w-8 h-8"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Switch theme"
      >
        {getThemeIcon(theme)}
      </button>

      {showDropdown && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg min-w-40 z-50">
          <div className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 text-sm">
            Theme
          </div>
          {(["light", "dark", "system"] as const).map((themeOption) => (
            <div
              key={themeOption}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                theme === themeOption ? "bg-blue-50 dark:bg-blue-900" : ""
              }`}
              onClick={() => handleThemeChange(themeOption)}
            >
              <span className="text-lg">{getThemeIcon(themeOption)}</span>
              <span className="text-sm text-gray-800 dark:text-gray-200">
                {getThemeLabel(themeOption)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
