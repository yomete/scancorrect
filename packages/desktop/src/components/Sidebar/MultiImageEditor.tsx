import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import type { ImageFile, ExifData, CameraProfile } from "../../types";
import { FieldEditor } from "./FieldEditor";
import { AddFieldDropdown } from "./AddFieldDropdown";

interface MultiImageEditorProps {
  images: ImageFile[];
  onUpdatePendingChanges: (paths: string[], changes: Partial<ExifData>) => void;
  activeProfile: CameraProfile | null;
}

const FIELD_LABELS: Partial<Record<keyof ExifData, string>> = {
  make: "Camera Make",
  model: "Camera Model",
  lens: "Lens",
  iso: "ISO",
  aperture: "Aperture",
  shutterSpeed: "Shutter Speed",
  focalLength: "Focal Length",
  exposureComp: "Exposure Comp",
  filmStock: "Film Stock",
  location: "Location",
  dateOriginal: "Date",
};

const FIELD_TYPES: Partial<Record<keyof ExifData, "text" | "number" | "date">> = {
  iso: "number",
  aperture: "number",
  shutterSpeed: "number",
  focalLength: "number",
  exposureComp: "number",
  dateOriginal: "date",
};

export function MultiImageEditor({
  images,
  onUpdatePendingChanges,
  activeProfile,
}: MultiImageEditorProps) {
  const commonFields = useMemo(() => {
    const fieldValues: Record<string, Set<string>> = {};

    images.forEach((image) => {
      const existing = image.existingExif || {};
      const pending = image.pendingChanges || {};

      Object.keys(FIELD_LABELS).forEach((field) => {
        if (field === "location") return;
        const key = field as keyof ExifData;
        const value = pending[key] !== undefined ? pending[key] : existing[key];
        if (!fieldValues[field]) {
          fieldValues[field] = new Set();
        }
        if (value !== undefined) {
          fieldValues[field].add(String(value));
        }
      });
    });

    return Object.entries(fieldValues)
      .filter(([_, values]) => values.size > 0)
      .map(([field, values]) => ({
        field: field as keyof ExifData,
        hasMultipleValues: values.size > 1,
        commonValue: values.size === 1 ? Array.from(values)[0] : undefined,
      }));
  }, [images]);

  const availableFields = useMemo(() => {
    const shownFields = commonFields.map((f) => f.field);
    const allFields: (keyof ExifData)[] = [
      "make", "model", "lens", "iso", "aperture", "shutterSpeed",
      "focalLength", "exposureComp", "filmStock", "dateOriginal",
    ];
    return allFields
      .filter((f) => !shownFields.includes(f))
      .map((f) => ({ field: f, label: FIELD_LABELS[f] || f }));
  }, [commonFields]);

  const handleFieldChange = (field: keyof ExifData, value: unknown) => {
    const paths = images.map((img) => img.path);
    onUpdatePendingChanges(paths, { [field]: value });
  };

  const handleRestore = (field: keyof ExifData) => {
    const paths = images.map((image) => image.path);
    onUpdatePendingChanges(paths, { [field]: undefined });
  };

  const handleAddField = (field: string) => {
    const f = field as keyof ExifData;
    let defaultValue: unknown = "";
    if (activeProfile) {
      if (f === "make") defaultValue = activeProfile.make;
      else if (f === "model") defaultValue = activeProfile.model;
      else if (f === "lens") defaultValue = activeProfile.lens;
      else if (activeProfile.defaults) {
        const d = activeProfile.defaults;
        if (f === "iso") defaultValue = d.iso;
        else if (f === "aperture") defaultValue = d.aperture;
        else if (f === "shutterSpeed") defaultValue = d.shutterSpeed;
        else if (f === "focalLength") defaultValue = d.focalLength;
        else if (f === "exposureComp") defaultValue = d.exposureComp;
        else if (f === "filmStock") defaultValue = d.filmStock;
      }
    }
    const paths = images.map((img) => img.path);
    onUpdatePendingChanges(paths, {
      [field]: defaultValue === undefined ? "" : defaultValue,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <Icon icon="mdi:image-multiple" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Editing {images.length} images
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {commonFields.map(({ field, hasMultipleValues, commonValue }) => (
          <div key={field} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {FIELD_LABELS[field]}
            </label>

            {hasMultipleValues ? (
              <div className="flex flex-col gap-2">
                <div className="p-2 px-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-800 rounded-md text-sm text-gray-400 dark:text-gray-500 italic">
                  Multiple values
                </div>
                <input
                  type={FIELD_TYPES[field] || "text"}
                  placeholder="Set for all..."
                  onChange={(e) => {
                    const val = e.target.value;
                    if (FIELD_TYPES[field] === "number") {
                      handleFieldChange(field, val ? parseFloat(val) : undefined);
                    } else {
                      handleFieldChange(field, val || undefined);
                    }
                  }}
                  className="p-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-gray-200 rounded-md text-sm transition-colors focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <FieldEditor
                field={field}
                label=""
                existingValue={commonValue}
                pendingValue={undefined}
                onChange={(value) => handleFieldChange(field, value)}
                onRestore={() => handleRestore(field)}
                type={FIELD_TYPES[field]}
              />
            )}

            {field === "dateOriginal" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <Icon icon="mdi:information-outline" className="w-3 h-3 inline mr-1" />
                The same date is set on all {images.length} selected images.
              </p>
            )}
          </div>
        ))}
      </div>

      <AddFieldDropdown
        availableFields={availableFields}
        onAddField={handleAddField}
      />
    </div>
  );
}
