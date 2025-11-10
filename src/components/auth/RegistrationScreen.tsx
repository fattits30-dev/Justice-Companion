/**
 * RegistrationScreen Component
 *
 * Built with TDD - All tests written FIRST
 *
 * Features:
 * - Form validation (username, email, password strength, password match, terms)
 * - IPC communication with main process
 * - Loading states
 * - Error handling
 * - Password visibility toggles (2 independent)
 * - Accessible form labels
 */

import { useState, FormEvent } from "react";
import type { User } from "../../domains/auth/entities/User.ts";

interface RegistrationScreenProps {
  onSuccess?: (data: { user: User }) => void;
  onLoginClick?: () => void;
}

export function RegistrationScreen({
  onSuccess,
  onLoginClick,
}: RegistrationScreenProps) {
  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate form inputs
   */
  const validate = (): boolean => {
    const errors: {
      username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    // Username validation
    if (!username.trim()) {
      errors.username = "Username is required";
    } else if (username.trim().length < 3) {
      errors.username = "Username must be at least 3 characters";
    }

    // Email validation
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      errors.email = "Please enter a valid email";
    }

    // Password validation
    if (!password.trim()) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Terms validation
    if (!acceptedTerms) {
      errors.terms = "You must accept the terms and conditions";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    // Validate inputs
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      // Call IPC handler
      const response = await window.justiceAPI.register(
        username,
        email,
        password,
      );

      if (!response.success) {
        // Handle error as string or object with message property
        const errorMessage =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "Registration failed";
        setError(errorMessage);
        return;
      }

      if (response.data) {
        // Clear form on success
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setAcceptedTerms(false);

        // Call success callback
        if (onSuccess) {
          onSuccess({ user: response.data });
        }
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
            Create Account
          </h2>
          <p className="mt-2 text-center text-white/90">
            Join Justice Companion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Error message */}
          {error && (
            <div className="p-3 text-sm text-red-300 bg-red-900/50 rounded-md border border-red-700">
              {error}
            </div>
          )}

          {/* Username field */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-white mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your username"
            />
            {validationErrors.username && (
              <p className="mt-1 text-sm text-red-400">
                {validationErrors.username}
              </p>
            )}
          </div>

          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your email"
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-400">
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
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
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-400">
                {validationErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password field */}
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-white mb-1"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/90 hover:text-white"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
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
            {validationErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Terms & Conditions checkbox */}
          <div className="flex items-start">
            <input
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 mt-1 text-primary-600 bg-primary-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="terms" className="ml-2 text-sm text-white">
              I agree to the Terms and Conditions
            </label>
          </div>
          {validationErrors.terms && (
            <p className="mt-1 text-sm text-red-400">
              {validationErrors.terms}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-secondary-600 rounded-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 focus:ring-offset-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        {/* Login link */}
        <div className="text-center">
          <p className="text-sm text-white/90">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onLoginClick}
              className="text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
