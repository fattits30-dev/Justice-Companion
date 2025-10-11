import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

export function RegistrationScreen({ onSwitchToLogin }: RegistrationScreenProps) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-8 py-24">
      <div className="w-full max-w-5xl">
        {/* Logo/Title */}
        <div className="text-center mb-36">
          <h1 className="text-8xl font-black text-white mb-12 drop-shadow-2xl tracking-tight leading-tight">
            Justice Companion
          </h1>
          <p className="text-3xl text-blue-100 font-semibold mt-8">Create Your Account</p>
        </div>

        {/* Registration Form Card */}
        <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-blue-600/50 rounded-3xl shadow-2xl px-24 py-36">
          <h2 className="text-5xl font-black text-white mb-24 text-center">Create Account</h2>

          <form onSubmit={handleSubmit} className="space-y-20">
            {/* Error Display */}
            {error && (
              <div className="bg-red-900/40 border-2 border-red-500/60 text-red-100 px-10 py-6 rounded-2xl text-xl font-semibold">
                {error}
              </div>
            )}

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-2xl font-bold text-blue-100 mb-8">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-10 py-8 text-2xl bg-slate-800/80 border-2 border-blue-700/40 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Choose a username"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-2xl font-bold text-blue-100 mb-8">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-10 py-8 text-2xl bg-slate-800/80 border-2 border-blue-700/40 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-2xl font-bold text-blue-100 mb-8">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-10 py-8 text-2xl bg-slate-800/80 border-2 border-blue-700/40 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="At least 12 characters"
                disabled={isLoading}
              />

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                        style={{ width: `${(passwordStrength / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-lg text-slate-400 font-semibold min-w-[100px]">
                      {getStrengthLabel(passwordStrength)}
                    </span>
                  </div>
                  <ul className="text-lg text-slate-400 space-y-2">
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
                className="block text-2xl font-bold text-blue-100 mb-8"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-10 py-8 text-2xl bg-slate-800/80 border-2 border-blue-700/40 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Re-enter your password"
                disabled={isLoading}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-lg text-red-400 mt-3">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-24 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-800 disabled:to-blue-900 disabled:cursor-not-allowed text-white font-black text-2xl py-9 px-12 rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-32 text-center">
            <p className="text-2xl text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-400 hover:text-blue-300 font-black transition-colors underline decoration-2 underline-offset-4"
                disabled={isLoading}
              >
                Sign In
              </button>
            </p>
          </div>

          {/* Local Storage Notice */}
          <div className="mt-32 pt-24 border-t-2 border-blue-800/30">
            <div className="flex items-center justify-center gap-5">
              <span className="text-4xl">🔒</span>
              <p className="text-xl text-slate-400 text-center leading-relaxed">
                All data is stored locally on your device.
                <br />
                <span className="text-slate-500">No data is sent to external servers.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
