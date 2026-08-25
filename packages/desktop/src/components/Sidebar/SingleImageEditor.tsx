import React, { useMemo } from "react";
import type { ImageFile, ExifData, CameraProfile } from "../../types";
import { SidebarThumbnail } from "./SidebarThumbnail";
import { FieldEditor } from "./FieldEditor";
import { AddFieldDropdown } from "./AddFieldDropdown";
import { useThumbnailExtraction } from "../../hooks/useThumbnailExtraction";

interface SingleImageEditorProps {
  image: ImageFile;
  onUpdatePendingChanges: (path: string, changes: Partial<ExifData>) => void;
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

export function SingleImageEditor({
  image,
  onUpdatePendingChanges,
  activeProfile,
}: SingleImageEditorProps) {
  const { thumbnail, loading } = useThumbnailExtraction(image.path);
  const existingExif = image.existingExif || {};
  const pendingChanges = image.pendingChanges || {};

  const isScanner = Boolean(image.isScanner);

  const populatedFields = useMemo(() => {
    const fields = new Set<keyof ExifData>();
    Object.keys(existingExif).forEach((key) => {
      const k = key as keyof ExifData;
      if (existingExif[k] !== undefined && k !== "location") {
        fields.add(k);
      }
    });
    Object.keys(pendingChanges).forEach((key) => {
      const k = key as keyof ExifData;
      if (pendingChanges[k] !== undefined && k !== "location") {
        fields.add(k);
      }
    });
    return Array.from(fields);
  }, [existingExif, pendingChanges]);

  const availableFields = useMemo(() => {
    const allFields: (keyof ExifData)[] = [
      "make", "model", "lens", "iso", "aperture", "shutterSpeed",
      "focalLength", "exposureComp", "filmStock", "dateOriginal",
    ];
    return allFields
      .filter((f) => !populatedFields.includes(f))
      .map((f) => ({ field: f, label: FIELD_LABELS[f] || f }));
  }, [populatedFields]);

  const handleFieldChange = (field: keyof ExifData, value: unknown) => {
    onUpdatePendingChanges(image.path, { [field]: value });
  };

  const handleRestore = (field: keyof ExifData) => {
    onUpdatePendingChanges(image.path, { [field]: undefined });
  };

  const handleAddField = (field: string) => {
    const f = field as keyof ExifData;
    // Pre-fill from profile if available
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
    onUpdatePendingChanges(image.path, {
      ...pendingChanges,
      [field]: defaultValue === undefined ? "" : defaultValue,
    });
  };

  const isScannerReplaced = (field: keyof ExifData) => {
    if (!isScanner) return false;
    if (field === "make" || field === "model") {
      return pendingChanges[field] !== undefined && pendingChanges[field] !== existingExif[field];
    }
    return false;
  };

  return (
    <div className="flex flex-col gap-4">
      <SidebarThumbnail
        thumbnail={thumbnail}
        loading={loading}
        filename={image.filename}
      />

      <div>
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={image.filename}>
          {image.filename}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={image.path}>
          {image.path}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {populatedFields.map((field) => (
          <FieldEditor
            key={field}
            field={field}
            label={FIELD_LABELS[field] || field}
            existingValue={existingExif[field] as string | number | undefined}
            pendingValue={pendingChanges[field] as string | number | undefined}
            onChange={(value) => handleFieldChange(field, value)}
            onRestore={() => handleRestore(field)}
            scannerReplaced={isScannerReplaced(field)}
            type={FIELD_TYPES[field]}
          />
        ))}
      </div>

      <AddFieldDropdown
        availableFields={availableFields}
        onAddField={handleAddField}
      />
    </div>
  );
}
