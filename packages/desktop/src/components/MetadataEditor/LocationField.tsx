import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { LocationValue, GeocodingResult } from "../../types";

interface LocationFieldProps {
  value?: LocationValue;
  onChange: (location: LocationValue | undefined) => void;
  onSearch: (query: string) => Promise<GeocodingResult[]>;
  error?: string;
  disabled?: boolean;
}

export function LocationField({
  value,
  onChange,
  onSearch,
  error,
  disabled = false,
}: LocationFieldProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      setManualLat(value.latitude.toString());
      setManualLng(value.longitude.toString());
    } else {
      setManualLat("");
      setManualLng("");
    }
  }, [value]);

  const handleSearch = async () => {
    if (!query.trim() || disabled) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const results = await onSearch(query.trim());
      setSearchResults(results.slice(0, 5));
      setShowResults(true);

      if (results.length === 0) {
        setSearchError("No locations found. Try a different search term.");
      }
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Failed to search location"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelectResult = (result: GeocodingResult) => {
    onChange({
      name: result.displayName,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setQuery("");
    setSearchResults([]);
    setShowResults(false);
    setSearchError(null);
  };

  const handleClear = () => {
    onChange(undefined);
    setQuery("");
    setSearchResults([]);
    setShowResults(false);
    setSearchError(null);
    setManualLat("");
    setManualLng("");
  };

  const handleManualApply = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setSearchError("Please enter valid latitude and longitude values");
      return;
    }

    if (lat < -90 || lat > 90) {
      setSearchError("Latitude must be between -90 and 90");
      return;
    }

    if (lng < -180 || lng > 180) {
      setSearchError("Longitude must be between -180 and 180");
      return;
    }

    onChange({
      name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      latitude: lat,
      longitude: lng,
    });
    setSearchError(null);
  };

  const displayError = error || searchError;

  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2.5 px-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
          <Icon
            icon="mdi:map-marker"
            className="text-green-600 dark:text-green-400 flex-shrink-0"
            width={18}
            height={18}
          />
          <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">
            {value.name}
          </span>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Clear location"
          >
            <Icon icon="mdi:close" width={16} height={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
        >
          <Icon
            icon={showAdvanced ? "mdi:chevron-up" : "mdi:chevron-down"}
            width={14}
            height={14}
          />
          {showAdvanced ? "Hide" : "Show"} coordinates
        </button>

        {showAdvanced && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
            Lat: {value.latitude.toFixed(6)}, Lng: {value.longitude.toFixed(6)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for a location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSearching}
            className="w-full p-2.5 px-3 pr-8 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {query && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSearchResults([]);
                setShowResults(false);
                setSearchError(null);
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <Icon icon="mdi:close-circle" width={16} height={16} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={disabled || isSearching || !query.trim()}
          className="bg-blue-500 text-white px-4 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSearching ? (
            <>
              <Icon
                icon="mdi:loading"
                className="animate-spin"
                width={16}
                height={16}
              />
              <span>Searching</span>
            </>
          ) : (
            <>
              <Icon icon="mdi:magnify" width={16} height={16} />
              <span>Search</span>
            </>
          )}
        </button>
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((result, index) => (
            <button
              key={`${result.latitude}-${result.longitude}-${index}`}
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-neutral-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <Icon
                  icon="mdi:map-marker"
                  className="text-gray-400 flex-shrink-0 mt-0.5"
                  width={16}
                  height={16}
                />
                <span className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                  {result.displayName}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {displayError && (
        <div className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400">
          <Icon icon="mdi:alert-circle" width={16} height={16} />
          <span>{displayError}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        disabled={disabled}
        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon
          icon={showAdvanced ? "mdi:chevron-up" : "mdi:chevron-down"}
          width={14}
          height={14}
        />
        Advanced: Enter coordinates manually
      </button>

      {showAdvanced && (
        <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-md space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Latitude
              </label>
              <input
                type="text"
                placeholder="-90 to 90"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                disabled={disabled}
                className="w-full p-2 px-2.5 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex-1">
              <label className="block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                Longitude
              </label>
              <input
                type="text"
                placeholder="-180 to 180"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                disabled={disabled}
                className="w-full p-2 px-2.5 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualApply}
            disabled={disabled || !manualLat || !manualLng}
            className="w-full bg-gray-200 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded text-sm hover:bg-gray-300 dark:hover:bg-neutral-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Coordinates
          </button>
        </div>
      )}
    </div>
  );
}
