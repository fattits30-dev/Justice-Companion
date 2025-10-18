/**
 * ConsentSettings Component
 *
 * Manages GDPR data processing consents for the user.
 * Allows granting and revoking consents while protecting required consents.
 *
 * Features:
 * - Load and display all consent types
 * - Grant new consents
 * - Revoke existing consents (except required)
 * - GDPR compliance notice
 * - Loading states
 *
 * @component
 */

import { SkeletonText } from '@/components/ui/Skeleton';
import type { Consent, ConsentType } from '@/models/Consent';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Toast interface for showing notifications
 */
interface Toast {
  success: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Props for ConsentSettings component
 */
interface ConsentSettingsProps {
  /** Toast instance for showing notifications */
  toast: Toast;
}

/**
 * All available consent types in the application
 */
const CONSENT_TYPES: ConsentType[] = [
  'data_processing',
  'encryption',
  'ai_processing',
  'marketing'
];

/**
 * Helper component for consent section container
 */
function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="bg-slate-900/30 border border-blue-700/20 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <Icon size={20} />
        <div>
          <h3 className="text-base font-medium text-white">{title}</h3>
          <p className="text-xs text-slate-300 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * ConsentSettings Component
 *
 * Provides UI for managing GDPR consents including:
 * - Viewing all consent types
 * - Granting consents
 * - Revoking consents (with protection for required consents)
 * - Loading states
 * - Error handling
 */
export function ConsentSettings({ toast }: ConsentSettingsProps): JSX.Element {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [isLoadingConsents, setIsLoadingConsents] = useState(false);

  /**
   * Load user consents from the API
   */
  const loadConsents = async (): Promise<void> => {
    setIsLoadingConsents(true);
    try {
      const result = await window.justiceAPI.getUserConsents();
      if (result.success) {
        setConsents(result.data);
      }
    } catch (error) {
      console.error('Failed to load consents:', error);
      toast.error('Failed to load consents');
    } finally {
      setIsLoadingConsents(false);
    }
  };

  /**
   * Grant a new consent
   *
   * @param consentType - The type of consent to grant
   */
  const handleGrantConsent = async (consentType: ConsentType): Promise<void> => {
    try {
      const result = await window.justiceAPI.grantConsent(consentType);
      if (result.success) {
        toast.success('Consent granted successfully');
        await loadConsents(); // Reload consents
      } else {
        toast.error('Failed to grant consent');
      }
    } catch (error) {
      console.error('Failed to grant consent:', error);
      toast.error('Failed to grant consent');
    }
  };

  /**
   * Revoke an existing consent
   *
   * @param consentType - The type of consent to revoke
   */
  const handleRevokeConsent = async (consentType: ConsentType): Promise<void> => {
    try {
      const result = await window.justiceAPI.revokeConsent(consentType);
      if (result.success) {
        toast.success('Consent revoked successfully');
        await loadConsents(); // Reload consents
      } else {
        toast.error('Failed to revoke consent');
      }
    } catch (error) {
      console.error('Failed to revoke consent:', error);
      toast.error('Failed to revoke consent');
    }
  };

  // Load consents on mount
  useEffect(() => {
    void loadConsents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SettingsSection
      icon={CheckCircle2}
      title="Consent Management"
      description="Manage your GDPR data processing consents"
    >
      {isLoadingConsents ? (
        <div className="space-y-3">
          <SkeletonText lines={3} />
        </div>
      ) : (
        <div className="space-y-3">
          {CONSENT_TYPES.map((consentType) => {
            const consent = consents.find((c) => c.consentType === consentType && !c.revokedAt);
            const isRequired = consentType === 'data_processing';

            return (
              <div
                key={consentType}
                className="flex items-center justify-between py-2 border-b border-blue-800/20 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-white">
                      {consentType.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                    </div>
                    {isRequired && (
                      <span className="text-xs bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {consent ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 size={12} />
                        Granted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-300">
                        <XCircle size={12} />
                        Not granted
                      </span>
                    )}
                  </div>
                </div>
                {consent ? (
                  <button
                    onClick={() => void handleRevokeConsent(consentType)}
                    disabled={isRequired}
                    className="px-3 py-1.5 text-xs text-red-300 hover:text-red-200 font-medium transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRequired ? 'Cannot revoke' : 'Revoke'}
                  </button>
                ) : (
                  <button
                    onClick={() => void handleGrantConsent(consentType)}
                    className="px-3 py-1.5 text-xs text-green-300 hover:text-green-200 font-medium transition-colors flex-shrink-0"
                  >
                    Grant
                  </button>
                )}
              </div>
            );
          })}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
            <p className="text-xs text-blue-200">
              <strong>Your Rights (GDPR):</strong> You can withdraw consent at any time except
              for required consents. Revoking data processing consent will prevent the app from
              functioning.
            </p>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
