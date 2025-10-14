import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useAuth } from '@/contexts/AuthContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import { AlertTriangle, Scale } from 'lucide-react';
import { useState } from 'react';

interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

/**
 * Modern Login Screen with 2025 Design Standards
 * Features:
 * - Clean, minimal design with glassmorphism
 * - Smooth animations with Framer Motion
 * - Accessible form components
 * - Responsive layout
 * - Modern color palette with gradients
 */
export function LoginScreen({ onSwitchToRegister }: LoginScreenProps): JSX.Element {
  const { login } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);

    try {
      await login(username.trim(), password, rememberMe);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 sm:p-6 md:p-8">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
        className="w-full max-w-md lg:max-w-lg xl:max-w-xl"
      >
        {/* Logo and Title */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: prefersReducedMotion ? 0 : 0.1,
              duration: prefersReducedMotion ? 0 : 0.5,
            }}
            className="inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-24 lg:h-24 mb-4 sm:mb-5 md:mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/30"
          >
            <Scale className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 text-white" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 sm:mb-3">
            Justice Companion
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-300">Your Legal Assistant</p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: prefersReducedMotion ? 0 : 0.2,
            duration: prefersReducedMotion ? 0 : 0.5,
          }}
          className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-2xl"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-6 sm:mb-8">
            Sign In
          </h2>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2"
              role="alert"
              aria-live="polite"
            >
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-5 sm:space-y-6 md:space-y-7"
            aria-label="Login form"
          >
            <FormField
              label="Username"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoFocus
              disabled={isLoading}
              required
              aria-required="true"
            />

            <FormField
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
              aria-required="true"
            />

            {/* Remember Me Checkbox - Glass Effect Container */}
            <div className="bg-slate-800/20 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-3 hover:bg-slate-800/30 hover:border-slate-600/40 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-blue-700/30 bg-slate-800/50 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  aria-describedby="remember-me-description remember-me-warning"
                />
                <label
                  htmlFor="remember-me"
                  className="text-sm text-slate-300 cursor-pointer select-none hover:text-slate-100 transition-colors"
                >
                  Remember me for 30 days
                </label>
                <span id="remember-me-description" className="sr-only">
                  Keep me logged in for 30 days on this device
                </span>
              </div>

              {/* Security Warning - Animated */}
              {rememberMe && (
                <motion.div
                  initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
                  className="mt-2 text-xs text-amber-300 flex items-start gap-1.5 px-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                  role="alert"
                  aria-live="polite"
                  id="remember-me-warning"
                >
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="leading-relaxed">
                    Only use on trusted devices. Your session will remain active for 30 days.
                  </span>
                </motion.div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 sm:mt-8 md:mt-10 text-center">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-sm sm:text-base md:text-lg text-slate-300 hover:text-white transition-colors"
              disabled={isLoading}
              aria-label="Switch to registration"
            >
              Don't have an account?{' '}
              <span className="text-blue-400 hover:text-blue-300 font-medium">Create one</span>
            </button>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="mt-6 sm:mt-8 md:mt-10 text-center text-xs sm:text-sm md:text-base text-slate-300">
          Secure • Encrypted • Private
        </p>
      </motion.div>
    </div>
  );
}
