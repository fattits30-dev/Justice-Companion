import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface RegistrationScreenProps {
  onSwitchToLogin: () => void;
}

/**
 * Calculate password strength (0-4)
 * 0 = Very Weak, 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
 */
function calculatePasswordStrength(password: string): number {
  let strength = 0;

  if (password.length >= 12) {
    strength++;
  }
  if (password.length >= 16) {
    strength++;
  }
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    strength++;
  }
  if (/[0-9]/.test(password)) {
    strength++;
  }
  if (/[^a-zA-Z0-9]/.test(password)) {
    strength++;
  }

  return Math.min(strength, 4);
}

function getStrengthLabel(strength: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return labels[strength] || 'Very Weak';
}

function getStrengthColor(strength: number): string {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  return colors[strength] || 'bg-red-500';
}

export function RegistrationScreen({ onSwitchToLogin }: RegistrationScreenProps): JSX.Element {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters (OWASP requirement)');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register(username.trim(), password, email.trim());
      // Registration successful - AuthContext will handle auto-login
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-24">
          <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">Justice Companion</h1>
          <p className="text-lg text-blue-300">Create Your Account</p>
        </div>

        {/* Registration Form */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-20 text-center">Create Account</h2>

          <form onSubmit={handleSubmit} className="space-y-16" aria-label="Registration form">
            {/* Error Display */}
            {error && (
              <div
                className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-blue-200 mb-6">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/40 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Choose a username"
                autoFocus
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={
                  username.length > 0 && username.length < 3 ? 'username-error' : undefined
                }
              />
              {username.length > 0 && username.length < 3 && (
                <p id="username-error" className="text-xs text-red-400 mt-1">
                  Username must be at least 3 characters
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-6">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/40 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="your@email.com"
                disabled={isLoading}
                aria-required="true"
                aria-invalid={
                  error && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                    ? 'true'
                    : undefined
                }
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-6">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/40 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="At least 12 characters"
                disabled={isLoading}
                aria-required="true"
                aria-invalid={
                  error && password.length > 0 && password.length < 12 ? 'true' : undefined
                }
                aria-describedby={password ? 'password-requirements' : undefined}
              />

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3" id="password-requirements">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor(
                          passwordStrength,
                        )}`}
                        style={{ width: `${(passwordStrength / 4) * 100}%` }}
                        role="progressbar"
                        aria-valuenow={passwordStrength}
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-label="Password strength"
                      />
                    </div>
                    <span
                      className="text-xs text-slate-300 font-medium min-w-[70px]"
                      aria-live="polite"
                    >
                      {getStrengthLabel(passwordStrength)}
                    </span>
                  </div>
                  <ul
                    className="text-xs text-slate-300 space-y-1"
                    aria-label="Password requirements"
                  >
                    <li className={password.length >= 12 ? 'text-green-400' : ''}>
                      {password.length >= 12 ? '✓' : '○'} At least 12 characters
                    </li>
                    <li className={/[A-Z]/.test(password) ? 'text-green-400' : ''}>
                      {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(password) ? 'text-green-400' : ''}>
                      {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
                    </li>
                    <li className={/[0-9]/.test(password) ? 'text-green-400' : ''}>
                      {/[0-9]/.test(password) ? '✓' : '○'} One number
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-blue-200 mb-6"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-blue-700/40 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Re-enter your password"
                disabled={isLoading}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-800 disabled:to-blue-900 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
              aria-busy={isLoading ? 'true' : undefined}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-20 text-center">
            <p className="text-sm text-slate-300">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                disabled={isLoading}
              >
                Sign In
              </button>
            </p>
          </div>

          {/* Local Storage Notice */}
          <div className="mt-20 pt-20 border-t border-blue-800/30">
            <div className="flex items-start gap-3 justify-center">
              <span className="text-xl">🔒</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                All data is stored locally on your device. No data is sent to external servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
