import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { FREE_TIER_LIMITS } from "../features/featureFlags";

interface QuotaExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuotaExhaustedModal({
  isOpen,
  onClose,
}: QuotaExhaustedModalProps) {
  const [resetsAt, setResetsAt] = useState<string>("");
  const [daysUntilReset, setDaysUntilReset] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadQuotaInfo();
    }
  }, [isOpen]);

  const loadQuotaInfo = async () => {
    try {
      const quota = await window.electronAPI.getQuotaStatus();
      setResetsAt(quota.resetsAt);

      if (quota.resetsAt) {
        const days = Math.ceil(
          (new Date(quota.resetsAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        );
        setDaysUntilReset(days);
      }
    } catch (error) {
      console.error("Failed to load quota info:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Icon
                icon="material-symbols:speed-rounded"
                className="w-7 h-7 text-white"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Monthly Limit Reached
              </h2>
              <p className="text-white/80 text-sm">
                You've used all {FREE_TIER_LIMITS.monthlyTransformations}{" "}
                transformations this month
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mb-4">
              <Icon icon="material-symbols:calendar-month" className="w-5 h-5" />
              <span>
                Your quota resets in{" "}
                <strong className="text-gray-900 dark:text-white">
                  {daysUntilReset} day{daysUntilReset !== 1 ? "s" : ""}
                </strong>
              </span>
            </div>

            <div className="bg-gray-50 dark:bg-neutral-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Upgrade to Pro
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <Icon
                    icon="material-symbols:check-circle"
                    className="w-4 h-4 text-green-500"
                  />
                  Unlimited transformations
                </li>
                <li className="flex items-center gap-2">
                  <Icon
                    icon="material-symbols:check-circle"
                    className="w-4 h-4 text-green-500"
                  />
                  Interactive map picker
                </li>
                <li className="flex items-center gap-2">
                  <Icon
                    icon="material-symbols:check-circle"
                    className="w-4 h-4 text-green-500"
                  />
                  GPX track import
                </li>
                <li className="flex items-center gap-2">
                  <Icon
                    icon="material-symbols:check-circle"
                    className="w-4 h-4 text-green-500"
                  />
                  Unlimited saved locations
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-lg font-medium transition-colors"
            >
              Wait for Reset
            </button>
            <button
              onClick={() => {
                // TODO: Open upgrade link when Lemon Squeezy is integrated
                alert(
                  "Upgrade coming soon! For now, your quota will reset on the 1st of next month."
                );
              }}
              className="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/25"
            >
              Upgrade to Pro - €25
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
