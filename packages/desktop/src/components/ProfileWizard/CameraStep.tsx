import React from "react";

interface CameraData {
  name: string;
  make: string;
  model: string;
  lens: string;
}

interface CameraStepProps {
  data: CameraData;
  onChange: (data: CameraData) => void;
}

export function CameraStep({ data, onChange }: CameraStepProps) {
  const handleChange = (field: keyof CameraData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Enter the basic camera information for this profile. This data will be written to the EXIF metadata of your scanned images.
      </p>

      <div>
        <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
          Profile Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g., Nikon FM with 50mm"
          value={data.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          A descriptive name to identify this camera/lens combination
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Camera Make <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Nikon"
            value={data.make}
            onChange={(e) => handleChange("make", e.target.value)}
            className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
            Camera Model <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., FM"
            value={data.model}
            onChange={(e) => handleChange("model", e.target.value)}
            className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block mb-1.5 font-medium text-gray-700 dark:text-gray-300 text-sm">
          Lens <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g., Nikkor 50mm f/1.8"
          value={data.lens}
          onChange={(e) => handleChange("lens", e.target.value)}
          className="w-full p-2.5 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          The lens used with this camera
        </p>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> The Make and Model fields will be written to the corresponding EXIF tags in your images. Use the exact camera manufacturer name and model for best compatibility with photo management software.
        </p>
      </div>
    </div>
  );
}
