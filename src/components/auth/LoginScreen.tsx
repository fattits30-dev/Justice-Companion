import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8">
      <div className="w-full max-w-3xl">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-8xl font-black text-white leading-tight">Justice</h1>
          <h1 className="text-8xl font-black text-white leading-tight mb-8">Companion</h1>

          {/* Scales Icon */}
          <div className="flex justify-center mb-8">
            <svg
              className="w-40 h-40 text-white"
              viewBox="0 0 512 512"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M256 0c-8.284 0-15 6.716-15 15v45.72C108.49 69.485 0 183.618 0 323c0 8.284 6.716 15 15 15s15-6.716 15-15c0-123.514 100.486-224 224-224s224 100.486 224 224c0 8.284 6.716 15 15 15s15-6.716 15-15c0-139.382-108.49-253.515-241-262.28V15c0-8.284-6.716-15-15-15z" />
              <path d="M256 113c-8.284 0-15 6.716-15 15v384c0 8.284 6.716 15 15 15s15-6.716 15-15V128c0-8.284-6.716-15-15-15z" />
              <path d="M406 143c-8.284 0-15 6.716-15 15v30h-46c-8.284 0-15 6.716-15 15s6.716 15 15 15h61c8.284 0 15-6.716 15-15v-45c0-8.284-6.716-15-15-15zM121 188h46v-30c0-8.284 6.716-15 15-15s15 6.716 15 15v45c0 8.284-6.716 15-15 15h-61c-8.284 0-15-6.716-15-15s6.716-15 15-15z" />
              <ellipse cx="406" cy="248" rx="60" ry="20" />
              <path d="M406 218c-33.084 0-60 13.458-60 30v15c0 16.542 26.916 30 60 30s60-13.458 60-30v-15c0-16.542-26.916-30-60-30z" />
              <ellipse cx="106" cy="248" rx="60" ry="20" />
              <path d="M106 218c-33.084 0-60 13.458-60 30v15c0 16.542 26.916 30 60 30s60-13.458 60-30v-15c0-16.542-26.916-30-60-30z" />
            </svg>
          </div>

          <p className="text-4xl text-white font-light">Your Legal Assistant</p>
        </div>

        {/* Form Card */}
        <div className="bg-blue-500/20 backdrop-blur-md border-2 border-blue-400/30 rounded-[48px] p-12">
          {/* Sign In Heading */}
          <h2 className="text-4xl font-bold text-white mb-8 text-center">Sign In</h2>

          {error && (
            <div
              className="mb-8 bg-red-500/80 text-white px-6 py-4 rounded-3xl text-xl text-center"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" aria-label="Login form">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-8 py-7 bg-blue-300/25 border-2 border-blue-200/40 rounded-3xl text-white text-3xl placeholder-white/75 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/30 transition-all"
                autoFocus
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error ? 'true' : undefined}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-8 py-7 bg-blue-300/25 border-2 border-blue-200/40 rounded-3xl text-white text-3xl placeholder-white/75 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/30 transition-all"
                disabled={isLoading}
                aria-required="true"
                aria-invalid={error ? 'true' : undefined}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600/70 hover:bg-blue-600/90 disabled:bg-blue-800/40 disabled:cursor-not-allowed text-white text-3xl font-bold py-7 rounded-3xl transition-all shadow-lg hover:shadow-xl"
              aria-busy={isLoading ? 'true' : undefined}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg
                    className="animate-spin h-8 w-8"
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
                  Signing in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-white/90 text-lg hover:text-white hover:underline transition-colors"
              disabled={isLoading}
              aria-label="Switch to registration"
            >
              Don't have an account? Create one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
