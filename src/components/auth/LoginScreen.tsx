import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginScreenProps {
  onSwitchToRegister: () => void;
}

export function LoginScreen({ onSwitchToRegister }: LoginScreenProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
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
      await login(username.trim(), password);
      // Login successful - AuthContext will update user state
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
          <p className="text-3xl text-blue-100 font-semibold mt-8">
            Your Legal Case Management Assistant
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-blue-600/50 rounded-3xl shadow-2xl px-24 py-36">
          <h2 className="text-5xl font-black text-white mb-24 text-center">Welcome Back</h2>

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
                placeholder="Enter your username"
                autoFocus
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
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-24 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-800 disabled:to-blue-900 disabled:cursor-not-allowed text-white font-black text-2xl py-9 px-12 rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-32 text-center">
            <p className="text-2xl text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-blue-400 hover:text-blue-300 font-black transition-colors underline decoration-2 underline-offset-4"
                disabled={isLoading}
              >
                Create Account
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
