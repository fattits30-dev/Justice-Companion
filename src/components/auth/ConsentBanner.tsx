import type { ConsentType } from '@/models/Consent';
import { useEffect, useState } from 'react';

/**
 * GDPR Consent Banner
 *
 * Shows on first login/registration to collect required consents.
 * Implements GDPR Article 7 (Conditions for consent).
 */

interface ConsentBannerProps {
  onComplete: () => void;
}

export function ConsentBanner({ onComplete }: ConsentBannerProps): JSX.Element {
  const [consents, setConsents] = useState({
    data_processing: false,
    encryption: false,
    ai_processing: false,
    marketing: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if required consents are already granted
  useEffect(() => {
    const checkConsents = async (): Promise<void> => {
      try {
        const result = await window.justiceAPI.hasConsent('data_processing');
        if (result.success && result.data) {
          // User already has required consent - skip banner
          onComplete();
        }
      } catch (err) {
        console.error('Failed to check existing consents:', err);
      }
    };

    void checkConsents(); // Async call in useEffect - errors handled internally
  }, [onComplete]);

  const handleSubmit = async (): Promise<void> => {
    setError(null);

    // Validate required consents
    if (!consents.data_processing) {
      setError('Data processing consent is required to use this application');
      return;
    }

    setIsSubmitting(true);

    try {
      // Grant all selected consents
      for (const [consentType, granted] of Object.entries(consents)) {
        if (granted) {
          const result = await window.justiceAPI.grantConsent(consentType as ConsentType);
          if (!result.success) {
            throw new Error(`Failed to grant ${consentType} consent`);
          }
        }
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save consents');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 py-4 md:px-8 z-50">
      <div className="bg-slate-900 border border-blue-800/30 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-4 md:px-6 md:py-6 border-b border-blue-800/30">
          <h2 className="text-xl md:text-2xl font-semibold text-white">Privacy & Consent</h2>
          <p className="text-sm md:text-base text-slate-300 mt-1 md:mt-2">
            Before you start using Justice Companion, we need your consent for data processing.
          </p>
        </div>

        {/* Content */}
        <div className="px-4 py-4 md:px-6 md:py-6 space-y-4 md:space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Data Processing (Required) */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consents.data_processing}
                onChange={(e) =>
                  setConsents((prev) => ({ ...prev, data_processing: e.target.checked }))
                }
                className="mt-1 h-5 w-5 rounded border-blue-700 bg-slate-800 text-blue-600 focus:ring-3 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">Data Processing</span>
                  <span className="text-xs bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded">
                    Required
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  I consent to the local processing of my case data, notes, and legal information on
                  this device. This is required for the application to function.
                </p>
              </div>
            </label>
          </div>

          {/* Encryption (Recommended) */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consents.encryption}
                onChange={(e) => setConsents((prev) => ({ ...prev, encryption: e.target.checked }))}
                className="mt-1 h-5 w-5 rounded border-blue-700 bg-slate-800 text-blue-600 focus:ring-3 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">Encryption</span>
                  <span className="text-xs bg-green-900/50 text-green-200 px-2 py-0.5 rounded">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  I consent to encryption of sensitive data (case descriptions, evidence content,
                  personal information) using AES-256-GCM. Recommended for security.
                </p>
              </div>
            </label>
          </div>

          {/* AI Processing (Optional) */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consents.ai_processing}
                onChange={(e) =>
                  setConsents((prev) => ({ ...prev, ai_processing: e.target.checked }))
                }
                className="mt-1 h-5 w-5 rounded border-blue-700 bg-slate-800 text-blue-600 focus:ring-3 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">AI Processing</span>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                    Optional
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  I consent to using AI features for legal research, case analysis, and document
                  drafting. AI processing happens locally if using local models, or via your
                  configured AI provider.
                </p>
              </div>
            </label>
          </div>

          {/* Marketing (Optional) */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consents.marketing}
                onChange={(e) => setConsents((prev) => ({ ...prev, marketing: e.target.checked }))}
                className="mt-1 h-5 w-5 rounded border-blue-700 bg-slate-800 text-blue-600 focus:ring-3 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">Marketing Communications</span>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                    Optional
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  I consent to receive updates, tips, and feature announcements about Justice
                  Companion. You can withdraw this consent at any time.
                </p>
              </div>
            </label>
          </div>

          {/* GDPR Notice */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <p className="text-xs text-blue-200">
              <strong>Your Rights (GDPR Articles 7 & 17):</strong>
              <br />
              • You can withdraw consent at any time via Settings
              <br />
              • You can export all your data (Right to Data Portability)
              <br />
              • You can delete all your data (Right to be Forgotten)
              <br />• All data is stored locally on your device only
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 md:px-6 md:py-6 border-t border-blue-800/30 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !consents.data_processing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 md:px-6 rounded-lg transition-colors duration-200 text-sm md:text-base"
          >
            {isSubmitting ? 'Saving...' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
