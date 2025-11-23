import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry, ErrorBoundary } from "./lib/sentry.ts";

// Initialize Sentry error monitoring before rendering
initSentry();

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                We've been notified and are working to fix the issue.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        }
      >
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
