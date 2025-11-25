/**
 * PWA Install Prompt Component
 *
 * Provides a user-friendly UI for installing Justice Companion as a PWA.
 * Handles the beforeinstallprompt event and guides users through installation.
 *
 * Features:
 * - Detects when app is installable
 * - Shows install banner with dismiss option
 * - Tracks installation success
 * - Stores user preference to not show again
 *
 * @module components/pwa/InstallPrompt
 */

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Expose deferred prompt hook for tests/install checks
    window.deferredPrompt = null;

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed === "true") {
      return;
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      // Prevent the default mini-infobar from appearing
      e.preventDefault();

      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      window.deferredPrompt = e as BeforeInstallPromptEvent;
      setShowInstallButton(true);

      console.log("[PWA] Install prompt available");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful installation
    const installedHandler = () => {
      console.log("[PWA] App successfully installed");
      setDeferredPrompt(null);
      window.deferredPrompt = null;
      setShowInstallButton(false);
      localStorage.setItem("pwa-install-dismissed", "true");
    };

    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.warn("[PWA] No install prompt available");
      return;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      console.log("[PWA] User accepted install");
    } else {
      console.log("[PWA] User dismissed install");
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    window.deferredPrompt = null;
    setShowInstallButton(false);
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
    // Don't permanently dismiss - allow it to show again on next visit
    // If you want permanent dismissal, uncomment:
    // localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleNeverShowAgain = () => {
    setShowInstallButton(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showInstallButton) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
      data-pwa-install
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl p-4 border border-blue-500">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <Download className="w-6 h-6 text-blue-100" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1">
              Install Justice Companion
            </h3>
            <p className="text-sm text-blue-100 mb-3">
              Install this app on your device for quick access and offline
              support. Works on desktop, mobile, and tablet.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-white text-blue-600 rounded-md font-semibold
                         hover:bg-blue-50 transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
                aria-label="Install Justice Companion"
              >
                Install Now
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-blue-500/30 text-white rounded-md font-medium
                         hover:bg-blue-500/50 transition-colors duration-200
                         focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
              >
                Maybe Later
              </button>
              <button
                onClick={handleNeverShowAgain}
                className="px-3 py-2 text-xs text-blue-100 hover:text-white
                         transition-colors duration-200 underline"
              >
                Don't show again
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-blue-500/30 rounded transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Dismiss install prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility: Check if running as PWA
 * Can be used to show/hide features based on install status
 */
export function isRunningAsPWA(): boolean {
  // Check if running in standalone mode (installed PWA)
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  // Check for iOS standalone mode
  if ((navigator as any).standalone === true) {
    return true;
  }

  return false;
}

/**
 * Utility: Get PWA display mode
 * Returns the current display mode of the app
 */
export function getPWADisplayMode():
  | "browser"
  | "standalone"
  | "fullscreen"
  | "minimal-ui" {
  if (window.matchMedia("(display-mode: fullscreen)").matches) {
    return "fullscreen";
  }
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "standalone";
  }
  if (window.matchMedia("(display-mode: minimal-ui)").matches) {
    return "minimal-ui";
  }
  return "browser";
}
