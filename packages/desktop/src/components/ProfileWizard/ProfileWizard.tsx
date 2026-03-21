import React, { useState, useEffect } from "react";
import { CameraProfile, ProfileDefaults, LocationValue, GeocodingResult } from "../../types";
import { CameraStep } from "./CameraStep";
import { ExposureStep } from "./ExposureStep";
import { LocationStep } from "./LocationStep";

interface ProfileWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: CameraProfile) => void;
  onSearch: (query: string) => Promise<GeocodingResult[]>;
  editingProfile?: CameraProfile;
}

type WizardStep = 1 | 2 | 3;

interface CameraData {
  name: string;
  make: string;
  model: string;
  lens: string;
}

export function ProfileWizard({
  isOpen,
  onClose,
  onSave,
  onSearch,
  editingProfile,
}: ProfileWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: Camera info
  const [cameraData, setCameraData] = useState<CameraData>({
    name: "",
    make: "",
    model: "",
    lens: "",
  });

  // Step 2: Exposure defaults
  const [exposureData, setExposureData] = useState<ProfileDefaults>({});

  // Step 3: Location & Film
  const [location, setLocation] = useState<LocationValue | undefined>(undefined);
  const [filmStock, setFilmStock] = useState<string>("");

  // Reset form when modal opens/closes or when editing profile changes
  useEffect(() => {
    if (isOpen) {
      if (editingProfile) {
        // Populate form with existing profile data
        setCameraData({
          name: editingProfile.name,
          make: editingProfile.make,
          model: editingProfile.model,
          lens: editingProfile.lens || "",
        });
        setExposureData(editingProfile.defaults || {});
        setLocation(editingProfile.defaults?.location);
        setFilmStock(editingProfile.defaults?.filmStock || "");
      } else {
        // Reset form for new profile
        setCameraData({ name: "", make: "", model: "", lens: "" });
        setExposureData({});
        setLocation(undefined);
        setFilmStock("");
      }
      setCurrentStep(1);
    }
  }, [isOpen, editingProfile]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleSkip = () => {
    if (currentStep === 2) {
      // Skip to step 3
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Skip and save
      handleSave();
    }
  };

  const handleSave = () => {
    // Build the profile object
    const defaults: ProfileDefaults = {
      ...exposureData,
    };

    // Add location and film stock from step 3
    if (location) {
      defaults.location = location;
    }
    if (filmStock.trim()) {
      defaults.filmStock = filmStock.trim();
    }

    const profile: CameraProfile = {
      id: editingProfile?.id || Date.now().toString(),
      name: cameraData.name.trim(),
      make: cameraData.make.trim(),
      model: cameraData.model.trim(),
      lens: cameraData.lens.trim() || undefined,
      defaults: Object.keys(defaults).length > 0 ? defaults : undefined,
    };

    onSave(profile);
  };

  const isStep1Valid = cameraData.name.trim() && cameraData.make.trim() && cameraData.model.trim();

  const stepTitles = ["Camera Info", "Exposure Defaults", "Location & Film"];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white dark:bg-neutral-700 rounded-xl w-[90%] max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with step indicator */}
        <div className="flex flex-col border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center p-5 px-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 [text-wrap:balance]">
              {editingProfile ? "Edit Profile" : "Create Profile"}
            </h2>
            <button
              className="text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded w-7 h-7 flex items-center justify-center text-lg"
              onClick={handleClose}
            >
              X
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex px-6 pb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex-1 flex items-center">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step === currentStep
                        ? "bg-blue-500 text-white"
                        : step < currentStep
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-neutral-600 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step < currentStep ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>
                  <span
                    className={`text-sm hidden sm:block ${
                      step === currentStep
                        ? "text-gray-800 dark:text-gray-200 font-medium"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {stepTitles[step - 1]}
                  </span>
                </div>
                {step < 3 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      step < currentStep
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-neutral-600"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <CameraStep
              data={cameraData}
              onChange={setCameraData}
            />
          )}
          {currentStep === 2 && (
            <ExposureStep
              data={exposureData}
              onChange={setExposureData}
            />
          )}
          {currentStep === 3 && (
            <LocationStep
              location={location}
              filmStock={filmStock}
              onLocationChange={setLocation}
              onFilmStockChange={setFilmStock}
              onSearch={onSearch}
            />
          )}
        </div>

        {/* Footer with navigation buttons */}
        <div className="flex justify-between items-center p-5 px-6 border-t border-gray-100 dark:border-gray-700">
          <div>
            {currentStep > 1 && (
              <button
                className="bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                onClick={handleBack}
              >
                Back
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {/* Skip button for steps 2 and 3 */}
            {currentStep > 1 && (
              <button
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-5 py-2.5 text-sm transition-colors"
                onClick={handleSkip}
              >
                Skip
              </button>
            )}

            {/* Cancel button on step 1, or if user wants to exit */}
            {currentStep === 1 && (
              <button
                className="bg-gray-100 dark:bg-neutral-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                onClick={handleClose}
              >
                Cancel
              </button>
            )}

            {/* Next/Save button */}
            {currentStep < 3 ? (
              <button
                className="bg-blue-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-[background-color,transform] active:scale-[0.96] disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed"
                onClick={handleNext}
                disabled={currentStep === 1 && !isStep1Valid}
              >
                Next
              </button>
            ) : (
              <button
                className="bg-blue-500 text-white px-5 py-2.5 rounded-md text-sm hover:bg-blue-600 transition-[background-color,transform] active:scale-[0.96] disabled:bg-gray-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed"
                onClick={handleSave}
                disabled={!isStep1Valid}
              >
                Save Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
