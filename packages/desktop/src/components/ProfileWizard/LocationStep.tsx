import React, { useState, useRef, useEffect } from "react";
import { LocationValue, GeocodingResult } from "../../types";
import { COMMON_FILM_STOCKS } from "../../constants/metadata";

interface LocationStepProps {
  location: LocationValue | undefined;
  filmStock: string;
  onLocationChange: (location: LocationValue | undefined) => void;
  onFilmStockChange: (filmStock: string) => void;
  onSearch: (query: string) => Promise<GeocodingResult[]>;
}

export function LocationStep({
  location,
  filmStock,
  onLocationChange,
  onFilmStockChange,
  onSearch,
}: LocationStepProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [showFilmSuggestions, setShowFilmSuggestions] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const filmInputRef = useRef<HTMLInputElement>(null);
  const filmDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
      if (
        filmDropdownRef.current &&
        !filmDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilmSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update manual coordinates when location changes
  useEffect(() => {
    if (location) {
      setManualLat(location.latitude.toString());
      setManualLng(location.longitude.toString());
    } else {
      setManualLat("");
      setManualLng("");
    }
  }, [location]);

  const handleSearch = async () => {
    if (!query.trim()) return;

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
    onLocationChange({
      name: result.displayName,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setQuery("");
    setSearchResults([]);
    setShowResults(false);
    setSearchError(null);
  };

  const handleClearLocation = () => {
    onLocationChange(undefined);
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

    onLocationChange({
      name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      latitude: lat,
      longitude: lng,
    });
    setSearchError(null);
  };

  // Filter film stock suggestions
  const filteredFilmStocks = filmStock.trim()
    ? COMMON_FILM_STOCKS.filter((stock) =>
        stock.toLowerCase().includes(filmStock.toLowerCase())
      )
    : COMMON_FILM_STOCKS;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Set a default location and film stock for this profile. These will be applied to images processed with this profile. Both fields are optional.
      </p>

      {/* Location Field */}
      <div>
        <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
          Default Location
        </label>

        {location ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2.5 px-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">
                {location.name}
              </span>
              <button
                type="button"
                onClick={handleClearLocation}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Clear location"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
              </svg>
              {showAdvanced ? "Hide" : "Show"} coordinates
            </button>

            {showAdvanced && (
              <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2" ref={dropdownRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search for a location..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSearching}
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
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Clear search"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className="bg-blue-500 text-white px-4 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Searching</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>

            {/* Search results dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="relative">
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.latitude}-${result.longitude}-${index}`}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-neutral-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <span className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                          {result.displayName}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error display */}
            {searchError && (
              <div className="flex items-center gap-2 text-sm text-red-500 dark:text-red-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span>{searchError}</span>
              </div>
            )}

            {/* Advanced manual entry */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
              </svg>
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
                      className="w-full p-2 px-2.5 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
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
                      className="w-full p-2 px-2.5 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleManualApply}
                  disabled={!manualLat || !manualLng}
                  className="w-full bg-gray-200 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded text-sm hover:bg-gray-300 dark:hover:bg-neutral-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Coordinates
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Film Stock Field */}
      <div>
        <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
          Default Film Stock
        </label>
        <div className="relative" ref={filmDropdownRef}>
          <input
            ref={filmInputRef}
            type="text"
            placeholder="e.g., Kodak Portra 400"
            value={filmStock}
            onChange={(e) => onFilmStockChange(e.target.value)}
            onFocus={() => setShowFilmSuggestions(true)}
            className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
          />

          {/* Film stock suggestions dropdown */}
          {showFilmSuggestions && filteredFilmStocks.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredFilmStocks.map((stock) => (
                <button
                  key={stock}
                  type="button"
                  onClick={() => {
                    onFilmStockChange(stock);
                    setShowFilmSuggestions(false);
                  }}
                  className="w-full text-left p-2.5 px-3 hover:bg-gray-100 dark:hover:bg-neutral-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors text-sm text-gray-800 dark:text-gray-200"
                >
                  {stock}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          This will be written to the ImageDescription EXIF tag
        </p>
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> Setting a default location is useful if you typically shoot at the same place, like your local area. You can always override this when processing individual images.
        </p>
      </div>
    </div>
  );
}
