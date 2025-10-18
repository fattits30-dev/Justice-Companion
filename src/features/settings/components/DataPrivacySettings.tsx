/**
 * DataPrivacySettings Component
 *
 * Manages data privacy and GDPR compliance settings for the user.
 * All settings are persisted to localStorage.
 *
 * Features:
 * - Toggle data encryption
 * - Configure export location and backup frequency
 * - Clear all user data (GDPR Right to Erasure)
 * - Export user data (GDPR Right to Data Portability)
 * - Confirmation dialogs for destructive operations
 *
 * @component
 */

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Database, Lock } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

/**
 * Toast interface for showing notifications
 */
interface Toast {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

/**
 * Props for DataPrivacySettings component
 */
interface DataPrivacySettingsProps {
  /** Toast instance for showing notifications */
  toast: Toast;
}

/**
 * Props for SettingsSection helper component
 */
interface SettingsSectionProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * Helper component for settings section container
 */
function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: SettingsSectionProps): JSX.Element {
  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-blue-950/50 border border-blue-800/30 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-blue-800/30 bg-slate-900/50">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white truncate">{title}</h2>
          <p className="text-xs text-blue-300 truncate">{description}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

/**
 * Props for ToggleSetting helper component
 */
interface ToggleSettingProps {
  label: string;
  enabled: boolean;
  onChange?: (enabled: boolean) => void;
}

/**
 * Helper component for toggle switch settings
 */
function ToggleSetting({ label, enabled, onChange }: ToggleSettingProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 border-b border-blue-800/20 last:border-0">
      <div className="text-xs font-medium text-white">{label}</div>
      <button
        onClick={() => onChange?.(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-blue-600' : 'bg-slate-700'
        }`}
        aria-label={`Toggle ${label}`}
        aria-pressed={enabled}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Props for SelectSetting helper component
 */
interface SelectSettingProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

/**
 * Helper component for select dropdown settings
 */
function SelectSetting({ label, value, onChange, options }: SelectSettingProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 border-b border-blue-800/20 last:border-0">
      <div className="text-xs font-medium text-white flex-shrink-0 mr-3">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="px-2 py-1 text-xs bg-slate-800/50 border border-blue-700/30 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Props for SettingItem helper component
 */
interface SettingItemProps {
  label: string;
  value: string;
  action?: string;
  onAction?: () => void;
  info?: boolean;
}

/**
 * Helper component for read-only setting items with optional action button
 */
function SettingItem({ label, value, action, onAction, info }: SettingItemProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 border-b border-blue-800/20 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white mb-0.5">{label}</div>
        <div className={`text-xs truncate ${info ? 'text-blue-400' : 'text-blue-300'}`}>
          {value}
        </div>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="px-3 py-1.5 text-xs text-blue-300 hover:text-blue-200 font-medium transition-colors flex-shrink-0"
        >
          {action}
        </button>
      )}
    </div>
  );
}

/**
 * DataPrivacySettings Component
 *
 * Provides UI for managing data privacy settings including:
 * - Data encryption toggle
 * - Export location and backup frequency
 * - Clear all data (GDPR Right to Erasure - Article 17)
 * - Export user data (GDPR Right to Data Portability - Article 20)
 *
 * All settings are automatically persisted to localStorage.
 */
export function DataPrivacySettings({ toast }: DataPrivacySettingsProps): JSX.Element {
  // Privacy settings - persisted to localStorage via useLocalStorage hook
  const [encryptData, setEncryptData] = useLocalStorage('encryptData', true);
  const [exportLocation, setExportLocation] = useLocalStorage('exportLocation', 'Downloads');
  const [autoBackupFrequency, setAutoBackupFrequency] = useLocalStorage('autoBackupFrequency', 'daily');

  // UI state (not persisted)
  const [clearDataConfirmOpen, setClearDataConfirmOpen] = useState(false);

  // Refs for timeout cleanup (prevent memory leaks)
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle clearing all user data (GDPR Right to Erasure)
   * Deletes all cases, conversations, and application data
   */
  const handleClearAllData = async (): Promise<void> => {
    try {
      toast.info('Clearing all data...');

      // Get all cases
      const casesResponse = await window.justiceAPI.getAllCases();
      if (casesResponse.success && casesResponse.data.length > 0) {
        // Delete each case (should cascade delete evidence)
        for (const caseItem of casesResponse.data) {
          await window.justiceAPI.deleteCase(caseItem.id);
        }
      }

      // Get all conversations
      const conversationsResponse = await window.justiceAPI.getAllConversations();
      if (conversationsResponse.success && conversationsResponse.data.length > 0) {
        // Delete each conversation
        for (const conversation of conversationsResponse.data) {
          await window.justiceAPI.deleteConversation(conversation.id);
        }
      }

      // Clear localStorage settings (except RAG and notification preferences)
      // We keep user preferences but clear application data
      localStorage.removeItem('recentSearches');
      localStorage.removeItem('draftMessages');

      toast.success('All data cleared successfully!');
      setClearDataConfirmOpen(false);

      // Reload page to reset all state
      reloadTimeoutRef.current = setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast.error('Failed to clear all data. Please try again.');
    }
  };

  /**
   * Handle exporting user data (GDPR Right to Data Portability)
   * Downloads all user data as a JSON file
   */
  const handleExportData = async (): Promise<void> => {
    try {
      toast.info('Exporting your data...');

      const result = await window.justiceAPI.exportUserData();
      if (result.success && result.data) {
        // Create a blob from the data
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        // Create download link
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `justice-companion-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Data exported successfully!');
      } else {
        toast.error('Failed to export data');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export data. Please try again.');
    }
  };

  return (
    <>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
          {/* Privacy & Security */}
          <SettingsSection
            icon={Lock}
            title="Privacy & Security"
            description="Your data privacy and security settings"
          >
            <SettingItem
              label="Local data storage"
              value="All data stored locally on your device"
              info
            />
            <ToggleSetting
              label="Encrypt sensitive data"
              enabled={encryptData}
              onChange={setEncryptData}
            />
          </SettingsSection>

          {/* Data Management */}
          <SettingsSection
            icon={Database}
            title="Data Management"
            description="Manage your stored data"
          >
            <SettingItem label="Database location" value="AppData/justice-companion" info />
            <button
              onClick={() => setClearDataConfirmOpen(true)}
              className="w-full px-3 py-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-600/30 transition-all text-xs font-medium"
            >
              Clear All Data
            </button>
          </SettingsSection>

          {/* Export & Backup */}
          <SettingsSection
            icon={Database}
            title="Export & Backup"
            description="Configure data export and backup options"
          >
            <SettingItem
              label="Export location"
              value={exportLocation}
              action="Change"
              onAction={() => setExportLocation('Custom/Path')}
            />
            <SelectSetting
              label="Auto-backup"
              value={autoBackupFrequency}
              onChange={setAutoBackupFrequency}
              options={[
                { value: 'never', label: 'Never' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
            />
            <button
              onClick={() => void handleExportData()}
              className="w-full px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-medium"
            >
              Export My Data (GDPR)
            </button>
          </SettingsSection>

          {/* GDPR Information */}
          <SettingsSection
            icon={Lock}
            title="Your Privacy Rights"
            description="GDPR compliance and data protection"
          >
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
              <p className="text-xs text-blue-200 mb-2">
                <strong>Your Rights (GDPR):</strong>
              </p>
              <ul className="text-xs text-blue-200 space-y-1 list-disc list-inside">
                <li>
                  <strong>Right to Data Portability (Article 20):</strong> Export your data in a
                  machine-readable format
                </li>
                <li>
                  <strong>Right to Erasure (Article 17):</strong> Request deletion of all your
                  personal data
                </li>
                <li>
                  All data is stored locally and encrypted on your device
                </li>
              </ul>
            </div>
          </SettingsSection>
        </div>
      </div>

      {/* Clear Data Confirmation Dialog */}
      <ConfirmDialog
        isOpen={clearDataConfirmOpen}
        title="Clear All Data"
        message="Are you sure you want to clear all data? This will permanently delete all cases, conversations, documents, and user data. This action cannot be undone."
        confirmText="Clear All Data"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => void handleClearAllData()}
        onCancel={() => setClearDataConfirmOpen(false)}
      />
    </>
  );
}
