import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

interface LicenseStatus {
  key: string;
  valid: boolean;
  activationId?: string;
  machineName?: string;
  activatedAt?: string;
  lastValidatedAt?: string;
  offlineGracePeriodEnd?: string;
}

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: () => void;
}

const POLAR_CHECKOUT_URL = "https://polar.sh/scancorrect/ScanCorrect-Pro";

export function LicenseModal({ isOpen, onClose, onActivated }: LicenseModalProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingLicense, setExistingLicense] = useState<LicenseStatus | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadExistingLicense();
      setLicenseKey("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const loadExistingLicense = async () => {
    try {
      const status = await window.electronAPI.getLicenseStatus();
      setExistingLicense(status);
    } catch (err) {
      console.error("Failed to load license status:", err);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError("Please enter a license key");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.activateLicense(licenseKey.trim());

      if (result.success) {
        setSuccess(true);
        await loadExistingLicense();
        onActivated?.();
      } else {
        setError(result.error || "Failed to activate license");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setError(null);

    try {
      const result = await window.electronAPI.deactivateLicense();

      if (result.success) {
        setExistingLicense(null);
        setSuccess(false);
        setLicenseKey("");
      } else {
        setError(result.error || "Failed to deactivate license");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleBuyLicense = () => {
    window.open(POLAR_CHECKOUT_URL, "_blank");
  };

  if (!isOpen) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Icon icon="material-symbols:key" className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {existingLicense ? "License Status" : "Activate License"}
              </h2>
              <p className="text-white/80 text-sm">
                {existingLicense
                  ? "Your Pro license is active"
                  : "Enter your license key to unlock Pro features"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {existingLicense ? (
            // Show existing license info
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <Icon icon="material-symbols:check-circle" className="w-5 h-5" />
                  <span className="font-medium">License Active</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Machine:</span>{" "}
                    {existingLicense.machineName || "This device"}
                  </p>
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Activated:</span>{" "}
                    {formatDate(existingLicense.activatedAt)}
                  </p>
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Last validated:</span>{" "}
                    {formatDate(existingLicense.lastValidatedAt)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                To transfer your license to another computer, deactivate it here first.
              </p>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={isDeactivating}
                  className="flex-1 px-4 py-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isDeactivating ? "Deactivating..." : "Deactivate"}
                </button>
              </div>
            </div>
          ) : success ? (
            // Show success state
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon
                  icon="material-symbols:check-circle"
                  className="w-10 h-10 text-green-500"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                License Activated!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You now have unlimited access to all Pro features.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg font-medium transition-[background-color,transform] active:scale-[0.96]"
              >
                Get Started
              </button>
            </div>
          ) : (
            // Show activation form
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  License Key
                </label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="SC-XXXX-XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-[border-color,box-shadow] font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActivate}
                  disabled={isLoading || !licenseKey.trim()}
                  className="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg font-medium transition-[background-color,transform] active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Activating..." : "Activate"}
                </button>
              </div>

              <div className="border-t border-gray-200 dark:border-neutral-700 pt-4 mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-3">
                  Don't have a license key?
                </p>
                <button
                  onClick={handleBuyLicense}
                  className="w-full px-4 py-2.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Icon icon="material-symbols:shopping-cart" className="w-5 h-5" />
                  Buy ScanCorrect Pro - €25
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
