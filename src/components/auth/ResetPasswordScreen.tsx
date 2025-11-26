/**
 * ResetPasswordScreen Component
 *
 * Allows users to set a new password using a reset token.
 * Validates password strength according to OWASP requirements.
 */

import { useState, FormEvent } from "react";
import { apiClient } from "../../lib/apiClient.ts";

interface ResetPasswordScreenProps {
  token?: string;
  onSuccess?: () => void;
  onBackToLogin?: () => void;
}

export function ResetPasswordScreen({
  token: initialToken,
  onSuccess,
  onBackToLogin,
}: ResetPasswordScreenProps) {
  const [token, setToken] = useState(initialToken || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 12) {
      errors.push("At least 12 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("At least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("At least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("At least one number");
    }
    return errors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    const errors: typeof validationErrors = {};

    if (!token.trim()) {
      errors.token = "Reset token is required";
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      errors.newPassword = `Password must have: ${passwordErrors.join(", ")}`;
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.auth.resetPassword(token, newPassword);

      if (response.success) {
        setSuccess(true);
        onSuccess?.();
      } else {
        setError(response.error?.message || "Failed to reset password");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-900">
        <div className="w-full max-w-md p-8 space-y-6 bg-primary-800 rounded-lg shadow-xl">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Password Reset!</h2>
            <p className="mt-2 text-white/90">
              Your password has been successfully reset.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-secondary-600 rounded-md hover:bg-secondary-700 focus:outline-hidden focus:ring-2 focus:ring-secondary-500 transition-colors"
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-primary-800 rounded-lg shadow-xl">
        <div>
          <h2 className="text-3xl font-bold text-center text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-white/90">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-300 bg-red-900/50 rounded-md border border-red-700">
              {error}
            </div>
          )}

          {/* Token field (only if not provided as prop) */}
          {!initialToken && (
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium text-white mb-1"
              >
                Reset Token
              </label>
              <input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                placeholder="Paste your reset token here"
              />
              {validationErrors.token && (
                <p className="mt-1 text-sm text-red-400">
                  {validationErrors.token}
                </p>
              )}
            </div>
          )}

          {/* New Password field */}
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-white mb-1"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {validationErrors.newPassword && (
              <p className="mt-1 text-sm text-red-400">
                {validationErrors.newPassword}
              </p>
            )}
            <p className="mt-1 text-xs text-white/60">
              Must be 12+ characters with uppercase, lowercase, and numbers
            </p>
          </div>

          {/* Confirm Password field */}
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-white mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Confirm new password"
            />
            {validationErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-secondary-600 rounded-md hover:bg-secondary-700 focus:outline-hidden focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 focus:ring-offset-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
