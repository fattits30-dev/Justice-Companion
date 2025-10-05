/**
 * ViewErrorBoundary Component
 *
 * Lightweight error boundary for individual views.
 * Allows the rest of the app to continue functioning even if one view crashes.
 * Provides a fallback UI with navigation back to dashboard.
 *
 * This is a view-level boundary that catches errors within specific views,
 * while the root ErrorBoundary catches errors across the entire app.
 */

import { Component, ErrorInfo, ReactNode } from 'react';

interface ViewErrorBoundaryProps {
  children: ReactNode;
  viewName: string;
  onNavigateToDashboard?: () => void;
}

interface ViewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  constructor(props: ViewErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ViewErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for immediate visibility
    console.error(`[ViewErrorBoundary:${this.props.viewName}] Caught error:`, error);
    console.error(`[ViewErrorBoundary:${this.props.viewName}] Component stack:`, errorInfo.componentStack);

    // Send to main process via IPC for persistent logging
    this.logErrorToMainProcess(error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });
  }

  /**
   * Log error to main process via IPC for audit logging
   */
  private logErrorToMainProcess(error: Error, errorInfo: ErrorInfo): void {
    try {
      // Check if justiceAPI is available
      if (typeof window !== 'undefined' && window.justiceAPI && window.justiceAPI.logUIError) {
        window.justiceAPI.logUIError({
          error: `[${this.props.viewName}] ${error.message || 'Unknown error'}`,
          errorInfo: error.stack || 'No stack trace available',
          componentStack: errorInfo.componentStack || 'No component stack available',
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }).catch((logError) => {
          // Silently fail if logging fails - we don't want to crash from logging
          console.error('[ViewErrorBoundary] Failed to log error to main process:', logError);
        });
      } else {
        console.warn('[ViewErrorBoundary] justiceAPI.logUIError not available');
      }
    } catch (logError) {
      // Silently fail if logging fails
      console.error('[ViewErrorBoundary] Exception while logging error:', logError);
    }
  }

  handleNavigateToDashboard = (): void => {
    // Clear error state and navigate to dashboard
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call parent navigation handler if provided
    if (this.props.onNavigateToDashboard) {
      this.props.onNavigateToDashboard();
    }
  };

  handleTryAgain = (): void => {
    // Clear error state and try to re-render the view
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="w-full max-w-lg rounded-lg bg-slate-900 border border-red-500/30 p-8 shadow-xl">
            {/* Error Icon */}
            <div className="mb-6 flex items-center gap-3">
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h1 className="text-2xl font-bold text-red-400">
                View Error
              </h1>
            </div>

            {/* Error Message */}
            <div className="mb-6">
              <p className="mb-3 text-lg text-slate-300">
                The <span className="font-semibold text-blue-400">{this.props.viewName}</span> view encountered an error.
              </p>
              <p className="text-sm text-slate-400">
                Don't worry - the rest of the application is still working. You can navigate back to the dashboard or try again.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-400 hover:text-slate-300 select-none">
                    Error Details (Dev Only)
                  </summary>
                  <div className="mt-2 rounded-md bg-slate-950 border border-red-500/20 p-3">
                    <p className="font-mono text-xs text-red-400 break-all">
                      {this.state.error.message}
                    </p>
                  </div>
                </details>
              </div>
            )}

            {/* Component Stack (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-semibold text-slate-400 hover:text-slate-300 select-none">
                  Component Stack (Dev Only)
                </summary>
                <pre className="mt-2 overflow-auto rounded-md bg-slate-950 border border-red-500/20 p-3 text-xs text-slate-400 max-h-32">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Recovery Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleNavigateToDashboard}
                className="flex-1 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Navigate back to dashboard"
              >
                Back to Dashboard
              </button>
              <button
                onClick={this.handleTryAgain}
                className="flex-1 rounded-lg border-2 border-slate-700 bg-slate-800 px-5 py-3 font-semibold text-slate-300 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Try to reload this view"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
