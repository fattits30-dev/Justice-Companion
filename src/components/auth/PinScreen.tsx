/**
 * PinScreen Component
 *
 * Handles both PIN setup (first-time users) and PIN unlock (returning users).
 * Used for local-first authentication without requiring a backend.
 *
 * Features:
 * - PIN setup with confirmation
 * - PIN unlock with error handling
 * - PIN visibility toggle
 * - Loading states
 * - Accessible labels
 */

import { useState, FormEvent, useEffect, useRef } from "react";

interface PinScreenProps {
  /** Mode: 'setup' for first-time, 'unlock' for returning users */
  mode: "setup" | "unlock";
  /** Called when PIN is successfully entered/set up */
  onSuccess: () => void;
  /** Called to set up a new PIN */
  onSetupPin: (pin: string) => Promise<void>;
  /** Called to unlock with PIN */
  onUnlock: (pin: string) => Promise<void>;
  /** External error message */
  error?: string | null;
  /** Whether operation is in progress */
  isLoading?: boolean;
}

export function PinScreen({
  mode,
  onSuccess,
  onSetupPin,
  onUnlock,
  error: externalError,
  isLoading: externalLoading,
}: PinScreenProps) {
  // Form state
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Ref for auto-focus
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus PIN input on mount
  useEffect(() => {
    pinInputRef.current?.focus();
  }, []);

  const loading = externalLoading || isLoading;
  const displayError = externalError || error;

  /**
   * Validate PIN
   */
  const validatePin = (value: string): string | null => {
    if (!value.trim()) {
      return "PIN is required";
    }
    if (value.length < 4) {
      return "PIN must be at least 4 characters";
    }
    if (value.length > 32) {
      return "PIN must be 32 characters or less";
    }
    return null;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate PIN
    const pinError = validatePin(pin);
    if (pinError) {
      setError(pinError);
      return;
    }

    // If setup mode, validate confirmation
    if (mode === "setup") {
      if (pin !== confirmPin) {
        setError("PINs do not match");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === "setup") {
        await onSetupPin(pin);
      } else {
        await onUnlock(pin);
      }

      // Clear form on success
      setPin("");
      setConfirmPin("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-950 p-4">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-4 sm:space-y-6 bg-primary-900 rounded-xl shadow-2xl border border-white/10">
        {/* Header */}
        <div className="text-center">
          {/* Scale/Legal Icon */}
          <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gold-400/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gold-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {mode === "setup" ? "Set Up Your PIN" : "Welcome Back"}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-white/70">
            {mode === "setup"
              ? "Create a PIN to protect your data. Your information stays encrypted on this device."
              : "Enter your PIN to access Justice Companion"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {displayError && (
            <div className="p-3 text-sm text-red-300 bg-red-900/50 rounded-md border border-red-700">
              {displayError}
            </div>
          )}

          {/* PIN field */}
          <div>
            <label
              htmlFor="pin"
              className="block text-sm font-medium text-white mb-1"
            >
              {mode === "setup" ? "Create PIN" : "Enter PIN"}
            </label>
            <div className="relative">
              <input
                ref={pinInputRef}
                id="pin"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-primary-800 border border-white/20 rounded-lg text-white text-lg tracking-widest placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50 disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                placeholder={mode === "setup" ? "Create your PIN" : "Enter your PIN"}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/90 hover:text-white p-1"
                aria-label={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? (
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
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm PIN field (setup mode only) */}
          {mode === "setup" && (
            <div>
              <label
                htmlFor="confirm-pin"
                className="block text-sm font-medium text-white mb-1"
              >
                Confirm PIN
              </label>
              <input
                id="confirm-pin"
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-primary-800 border border-white/20 rounded-lg text-white text-lg tracking-widest placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Confirm your PIN"
                autoComplete="off"
              />
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 text-base font-semibold text-primary-950 bg-gold-400 rounded-lg hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
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
                {mode === "setup" ? "Setting up..." : "Unlocking..."}
              </span>
            ) : mode === "setup" ? (
              "Set PIN & Continue"
            ) : (
              "Unlock"
            )}
          </button>
        </form>

        {/* Info section */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-gold-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-white/80">
              {mode === "setup" ? (
                <>
                  <p className="font-medium text-white">Your data stays on your device</p>
                  <p className="mt-1">
                    All your case information is encrypted and stored locally. No account
                    or internet connection required.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-white">Forgot your PIN?</p>
                  <p className="mt-1">
                    If you've forgotten your PIN, you'll need to reset the app and start
                    fresh. Export your data regularly to prevent loss.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
