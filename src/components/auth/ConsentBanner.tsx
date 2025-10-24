/**
 * ConsentBanner Component
 *
 * Built with TDD - All tests written FIRST
 *
 * Features:
 * - GDPR consent banner
 * - Accept/Decline actions
 * - IPC communication for consent storage
 * - Loading states
 * - Error handling
 * - Dismissible
 * - Accessible (ARIA)
 */

import { useState } from "react";

interface ConsentBannerProps {
  consentType: "data_processing" | "marketing" | "analytics";
  onAccept?: () => void;
  onDecline?: () => void;
  onDismiss?: () => void;
}

const CONSENT_MESSAGES = {
  data_processing:
    "We collect and process your personal data to provide our legal case management services. Your data is stored locally and encrypted.",
  marketing:
    "We would like to send you promotional emails and newsletters about our services. You can opt out at any time.",
  analytics:
    "We use analytics to improve our application. This helps us understand how users interact with our features.",
};

export function ConsentBanner({
  consentType,
  onAccept,
  onDecline,
  onDismiss,
}: ConsentBannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  const message = CONSENT_MESSAGES[consentType];

  /**
   * Handle Accept action
   */
  const handleAccept = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await window.justiceAPI.grantConsent(consentType, true);

      if (response.success) {
        setIsVisible(false);
        if (onAccept) {
          onAccept();
        }
      } else {
        setError(response.error || "Failed to save consent");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Decline action
   */
  const handleDecline = async () => {
    setError("");
    setIsLoading(true);

    try {
      const response = await window.justiceAPI.grantConsent(consentType, false);

      if (response.success) {
        setIsVisible(false);
        if (onDecline) {
          onDecline();
        }
      } else {
        setError(response.error || "Failed to save consent");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Dismiss action (close without accepting/declining)
   */
  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-primary-800 border-t border-gray-700 p-4 shadow-lg z-50"
      role="dialog"
      aria-label="Privacy consent banner"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Message */}
        <div className="flex-1">
          <p className="text-sm text-gray-300">{message}</p>

          {/* Error message */}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Decline button */}
          <button
            type="button"
            onClick={handleDecline}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-secondary-700 rounded-md hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Decline
          </button>

          {/* Accept button */}
          <button
            type="button"
            onClick={handleAccept}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-secondary-600 rounded-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Saving..." : "Accept"}
          </button>

          {/* Close/Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close consent banner"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
