import React from "react";
import { ProfileDefaults } from "../../types";
import {
  STANDARD_ISO,
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
  STANDARD_FOCAL_LENGTHS,
  STANDARD_EV,
  FILM_FORMATS,
  formatAperture,
  formatExposureComp,
  calculate35mmEquivalent,
} from "../../constants/metadata";

interface ExposureStepProps {
  data: ProfileDefaults;
  onChange: (data: ProfileDefaults) => void;
}

export function ExposureStep({ data, onChange }: ExposureStepProps) {
  const handleChange = <K extends keyof ProfileDefaults>(
    field: K,
    value: ProfileDefaults[K] | undefined
  ) => {
    const newData = { ...data };
    if (value === undefined || value === "") {
      delete newData[field];
    } else {
      newData[field] = value;
    }
    onChange(newData);
  };

  // Calculate 35mm equivalent if both focal length and format are selected
  const selectedFormat = FILM_FORMATS.find((f) => f.name === data.filmFormat);
  const equivalentFocalLength =
    data.focalLength && selectedFormat
      ? calculate35mmEquivalent(data.focalLength, selectedFormat.cropFactor)
      : null;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Set default exposure values for this profile. These will be automatically applied when processing images. All fields are optional.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* ISO */}
        <div>
          <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
            ISO
          </label>
          <select
            value={data.iso ?? ""}
            onChange={(e) =>
              handleChange("iso", e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Select ISO</option>
            {STANDARD_ISO.map((iso) => (
              <option key={iso} value={iso}>
                ISO {iso}
              </option>
            ))}
          </select>
        </div>

        {/* Aperture */}
        <div>
          <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Aperture
          </label>
          <select
            value={data.aperture ?? ""}
            onChange={(e) =>
              handleChange("aperture", e.target.value ? parseFloat(e.target.value) : undefined)
            }
            className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Select Aperture</option>
            {STANDARD_APERTURES.map((aperture) => (
              <option key={aperture} value={aperture}>
                {formatAperture(aperture)}
              </option>
            ))}
          </select>
        </div>

        {/* Shutter Speed */}
        <div>
          <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Shutter Speed
          </label>
          <select
            value={data.shutterSpeed ?? ""}
            onChange={(e) =>
              handleChange("shutterSpeed", e.target.value ? parseFloat(e.target.value) : undefined)
            }
            className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Select Shutter Speed</option>
            {STANDARD_SHUTTER_SPEEDS.map((speed) => (
              <option key={speed.display} value={speed.value}>
                {speed.display}
              </option>
            ))}
          </select>
        </div>

        {/* Focal Length */}
        <div>
          <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Focal Length
          </label>
          <select
            value={data.focalLength ?? ""}
            onChange={(e) =>
              handleChange("focalLength", e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Select Focal Length</option>
            {STANDARD_FOCAL_LENGTHS.map((fl) => (
              <option key={fl} value={fl}>
                {fl}mm
              </option>
            ))}
          </select>
        </div>

        {/* Film Format */}
        <div>
          <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Film Format
          </label>
          <select
            value={data.filmFormat ?? ""}
            onChange={(e) =>
              handleChange("filmFormat", e.target.value || undefined)
            }
            className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Select Format</option>
            {FILM_FORMATS.map((format) => (
              <option key={format.name} value={format.name}>
                {format.name}
              </option>
            ))}
          </select>
        </div>

        {/* Exposure Compensation */}
        <div>
          <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Exposure Compensation
          </label>
          <select
            value={data.exposureComp ?? ""}
            onChange={(e) =>
              handleChange("exposureComp", e.target.value ? parseFloat(e.target.value) : undefined)
            }
            className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="">Select EV</option>
            {STANDARD_EV.map((ev) => (
              <option key={ev} value={ev}>
                {formatExposureComp(ev)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 35mm Equivalent calculation */}
      {equivalentFocalLength !== null && (
        <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              35mm Equivalent:
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {equivalentFocalLength}mm
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Based on {data.focalLength}mm on {data.filmFormat} (crop factor:{" "}
            {selectedFormat?.cropFactor}x)
          </p>
        </div>
      )}

      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-100 dark:border-amber-800">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Note:</strong> These are default values that will be applied when you process images with this profile. You can still adjust individual values for each image before saving.
        </p>
      </div>
    </div>
  );
}
