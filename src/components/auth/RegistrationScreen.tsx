/**
 * RegistrationScreen Component
 *
 * Migrated to HTTP REST API - Replaces Electron IPC with FastAPI backend
 *
 * Features:
 * - Form validation (username, email, password strength, password match, terms)
 * - HTTP REST API communication
 * - Loading states
 * - Error handling
 * - Password visibility toggles (2 independent)
 * - Accessible form labels
 */

import { useState, FormEvent } from "react";
import { apiClient } from "../../lib/apiClient.ts";
import type { User } from "../../domains/auth/entities/User.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";

// Preserve state during HMR
if (import.meta.hot) {
  import.meta.hot.accept();
}

interface RegistrationScreenProps {
  onSuccess?: (data: { user: User }) => void;
  onLoginClick?: () => void;
}

export function RegistrationScreen({
  onSuccess,
  onLoginClick,
}: RegistrationScreenProps) {
  const { refreshUser } = useAuth();
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
    firstName?: string;
    lastName?: string;
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
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    // First name validation
    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (firstName.trim().length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    }

    // Last name validation
    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    } else if (lastName.trim().length < 2) {
      errors.lastName = "Last name must be at least 2 characters";
    }

    // Email validation
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      errors.email = "Please enter a valid email";
    }

    // Password validation (must match backend: 12 characters minimum)
    if (!password.trim()) {
      errors.password = "Password is required";
    } else if (password.length < 12) {
      errors.password = "Password must be at least 12 characters";
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
      // Combine first and last name into username
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // Call HTTP API
      const response = await apiClient.auth.register(fullName, email, password);

      if (!response.success) {
        setError(response.error?.message || "Registration failed");
        return;
      }

      if (response.data) {
        // Clear form on success
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setAcceptedTerms(false);

        // Refresh auth state using the new session created during registration
        await refreshUser();

        // Call success callback
        if (onSuccess) {
          // Map API response to User type
          onSuccess({
            user: {
              id: response.data.user.id,
              username: response.data.user.username,
              email: response.data.user.email,
              passwordHash: "", // Not exposed by API
              passwordSalt: "", // Not exposed by API
              role: (response.data.user.role === "admin" ? "admin" : "user") as
                | "user"
                | "admin",
              isActive: response.data.user.is_active,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastLoginAt: null,
            },
          });
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

          {/* First Name field */}
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-white mb-1"
            >
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your first name"
            />
            {validationErrors.firstName && (
              <p className="mt-1 text-sm text-red-400">
                {validationErrors.firstName}
              </p>
            )}
          </div>

          {/* Last Name field */}
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-white mb-1"
            >
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your last name"
            />
            {validationErrors.lastName && (
              <p className="mt-1 text-sm text-red-400">
                {validationErrors.lastName}
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
              className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                placeholder="Min 12 characters"
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
                className="w-full px-3 py-2 bg-primary-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed pr-10"
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
            className="w-full px-4 py-2 text-sm font-medium text-white bg-secondary-600 rounded-md hover:bg-secondary-700 focus:outline-hidden focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 focus:ring-offset-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
