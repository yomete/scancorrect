import { useState, useEffect } from "react";
import { FREE_TIER_LIMITS } from "../features/featureFlags";

interface QuotaState {
  used: number;
  limit: number;
  remaining: number;
  canProcess: boolean;
  resetsAt: string;
}

interface QuotaStatusProps {
  onQuotaExhausted?: () => void;
}

export function QuotaStatus({ onQuotaExhausted }: QuotaStatusProps) {
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [tier, setTier] = useState<"free" | "paid">("free");

  useEffect(() => {
    loadQuotaStatus();
  }, []);

  const loadQuotaStatus = async () => {
    try {
      const [quotaStatus, userTier] = await Promise.all([
        window.electronAPI.getQuotaStatus(),
        window.electronAPI.getUserTier(),
      ]);
      setQuota(quotaStatus);
      setTier(userTier);

      if (!quotaStatus.canProcess && userTier === "free" && onQuotaExhausted) {
        onQuotaExhausted();
      }
    } catch (error) {
      console.error("Failed to load quota status:", error);
    }
  };

  // Refresh quota periodically
  useEffect(() => {
    const interval = setInterval(loadQuotaStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (tier === "paid" || !quota) {
    return null;
  }

  const percentage = Math.round((quota.used / quota.limit) * 100);
  const isLow = quota.remaining <= 10;
  const isExhausted = quota.remaining === 0;

  // Calculate days until reset
  const daysUntilReset = quota.resetsAt
    ? Math.ceil(
        (new Date(quota.resetsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
        isExhausted
          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
          : isLow
          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          : "bg-gray-100 dark:bg-neutral-600 text-gray-600 dark:text-gray-300"
      }`}
      title={`${quota.remaining} transformations remaining. Resets in ${daysUntilReset} days.`}
    >
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 bg-gray-200 dark:bg-neutral-500 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isExhausted
                ? "bg-red-500"
                : isLow
                ? "bg-amber-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className="whitespace-nowrap">
          {quota.used}/{quota.limit}
        </span>
      </div>
      {isExhausted && (
        <span className="text-red-600 dark:text-red-400 font-medium">
          Limit reached
        </span>
      )}
    </div>
  );
}

// Hook for components that need to check quota before processing
export function useQuota() {
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [tier, setTier] = useState<"free" | "paid">("free");

  const refresh = async () => {
    try {
      const [quotaStatus, userTier] = await Promise.all([
        window.electronAPI.getQuotaStatus(),
        window.electronAPI.getUserTier(),
      ]);
      setQuota(quotaStatus);
      setTier(userTier);
    } catch (error) {
      console.error("Failed to load quota status:", error);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const checkCanProcess = async (imageCount: number) => {
    if (tier === "paid") {
      return { canProcess: true, remaining: Infinity, wouldExceed: false };
    }
    return window.electronAPI.checkCanProcess(imageCount);
  };

  return {
    quota,
    tier,
    isPaid: tier === "paid",
    canProcess: quota?.canProcess ?? true,
    remaining: quota?.remaining ?? FREE_TIER_LIMITS.monthlyTransformations,
    refresh,
    checkCanProcess,
  };
}
