/**
 * ErrorBoundary Component
 *
 * Catches React errors and prevents app crashes.
 * Displays user-friendly error UI with recovery options.
 * Logs all errors to ErrorLogger for analysis.
 *
 * Wraps the entire App component to catch all React errors.
 */

import { Component, ErrorInfo, ReactNode } from 'react';
// errorLogger removed - uses fs which doesn't work in renderer process

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for immediate visibility
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    console.error('[ErrorBoundary] Error details:', {
      component: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    // TODO: Send to main process via IPC for persistent logging

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = (): void => {
    // Clear error state and reload the page
    window.location.reload();
  };

  handleReset = (): void => {
    // Clear error state and try to continue
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-red-50 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg">
            {/* Error Icon */}
            <div className="mb-6 flex items-center gap-3">
              <svg
                className="h-12 w-12 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h1 className="text-3xl font-bold text-gray-900">
                Something went wrong
              </h1>
            </div>

            {/* Error Message */}
            <div className="mb-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">
                Error Details:
              </h2>
              <div className="rounded-md bg-red-100 p-4">
                <p className="font-mono text-sm text-red-800">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>
            </div>

            {/* Component Stack (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                  Component Stack (Dev Only)
                </summary>
                <pre className="mt-2 overflow-auto rounded-md bg-gray-100 p-4 text-xs text-gray-800">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Error Stack (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                  Error Stack (Dev Only)
                </summary>
                <pre className="mt-2 overflow-auto rounded-md bg-gray-100 p-4 text-xs text-gray-800">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Recovery Actions */}
            <div className="flex gap-4">
              <button
                onClick={this.handleReload}
                className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Reload Application
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Try to Continue
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-6 text-center text-sm text-gray-600">
              If this problem persists, please check the error logs at{' '}
              <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                logs/errors.log
              </code>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
