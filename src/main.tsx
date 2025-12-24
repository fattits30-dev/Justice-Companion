import "reflect-metadata";
import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import { ErrorBoundary, initSentry } from "./lib/sentry.ts";
import { initializeContainer } from "./di/container.ts";

// Local-first mode: Use LocalApp instead of App
// Set VITE_LOCAL_MODE=true in .env to enable local-first mode
const isLocalMode = import.meta.env.VITE_LOCAL_MODE === "true";

// Dynamic import based on mode
const AppComponent = isLocalMode
  ? React.lazy(() => import("./LocalApp.tsx"))
  : React.lazy(() => import("./App.tsx"));

// Initialize DI container before app starts (only needed for backend mode)
if (!isLocalMode) {
  initializeContainer();
}

// Initialize Sentry error monitoring before rendering
initSentry();

// Register service worker for PWA capabilities (production only)
if (typeof window !== "undefined") {
  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {
    // Unregister service worker in development to avoid cache issues
    navigator.serviceWorker?.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
        console.log("[Dev] Service worker unregistered");
      });
    });
    // Clear all caches
    caches?.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  } else {
    // Production: Register service worker
    registerSW({
      immediate: true,
      onRegistered(worker: ServiceWorkerRegistration | undefined) {
        if (worker) {
          console.log("Service worker registered", worker);
        }
      },
      onRegisterError(error: Error) {
        console.error("Service worker registration failed", error);
      },
    });
  }
}

// Loading fallback for lazy-loaded App
function AppLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Loading Justice Companion...</p>
      </div>
    </div>
  );
}

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
        <React.Suspense fallback={<AppLoader />}>
          <AppComponent />
        </React.Suspense>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
