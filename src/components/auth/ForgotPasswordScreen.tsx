/**
 * ForgotPasswordScreen Component
 *
 * Allows users to request a password reset link.
 * For development mode, displays the token directly.
 * In production, this would send an email.
 */

import { useState, FormEvent } from "react";
import { apiClient } from "../../lib/apiClient.ts";

interface ForgotPasswordScreenProps {
  onBackToLogin?: () => void;
  onResetTokenReceived?: (token: string) => void;
}

export function ForgotPasswordScreen({
  onBackToLogin,
  onResetTokenReceived,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setValidationError("");
    setSuccess(false);
    setResetToken(null);

    if (!email.trim()) {
      setValidationError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setValidationError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.auth.forgotPassword(email);

      if (response.success) {
        setSuccess(true);
        // In dev mode, the token is returned in the response
        if (response.data?.token) {
          setResetToken(response.data.token);
          onResetTokenReceived?.(response.data.token);
        }
      } else {
        setError(response.error?.message || "Failed to send reset email");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-primary-800 rounded-lg shadow-xl">
        <div>
          <h2 className="text-3xl font-bold text-center text-white">
            Forgot Password
          </h2>
          <p className="mt-2 text-center text-white/90">
            Enter your email to receive a password reset link
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 text-sm text-green-300 bg-green-900/50 rounded-md border border-green-700">
              <p className="font-medium">Check your email!</p>
              <p className="mt-1">
                If an account exists with this email, you will receive a
                password reset link.
              </p>
            </div>

            {/* Dev mode: Show token directly */}
            {resetToken && (
              <div className="p-4 text-sm text-yellow-300 bg-yellow-900/50 rounded-md border border-yellow-700">
                <p className="font-medium">🔧 Development Mode</p>
                <p className="mt-1 text-xs">
                  Token (copy this to reset your password):
                </p>
                <code className="block mt-2 p-2 bg-black/30 rounded text-xs break-all">
                  {resetToken}
                </code>
              </div>
            )}

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-secondary-600 rounded-md hover:bg-secondary-700 focus:outline-hidden focus:ring-2 focus:ring-secondary-500 transition-colors"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-300 bg-red-900/50 rounded-md border border-red-700">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your email address"
              />
              {validationError && (
                <p className="mt-1 text-sm text-red-400">{validationError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-secondary-600 rounded-md hover:bg-secondary-700 focus:outline-hidden focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 focus:ring-offset-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        {!success && (
          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
            >
              ← Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
