/**
 * ErrorDisplay Component
 *
 * Displays user-friendly error messages for various failure scenarios:
 * - LM Studio offline
 * - Connection timeout
 * - Streaming errors
 * - Validation errors
 */

import { BiError } from 'react-icons/bi';

interface ErrorDisplayProps {
  error: string | null;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps): JSX.Element | null {
  if (!error) {
    return null;
  }

  // Parse error type for better messaging
  const isConnectionError = error.toLowerCase().includes('lm studio') ||
                           error.toLowerCase().includes('connect');
  const isOfflineError = error.toLowerCase().includes('running') ||
                        error.toLowerCase().includes('offline');

  return (
    <div className="mx-4 my-2 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <BiError className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-red-800 mb-1">
          {isConnectionError ? 'Connection Error' : isOfflineError ? 'AI Offline' : 'Error'}
        </h3>
        <p className="text-sm text-red-700">{error}</p>
        {isOfflineError && (
          <p className="text-xs text-red-600 mt-2">
            Make sure LM Studio is running at{' '}
            <a
              href="http://localhost:1234"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-red-800"
            >
              http://localhost:1234
            </a>
            {' '}and a model is loaded.
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </div>
  );
}
