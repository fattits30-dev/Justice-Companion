/**
 * NotificationSettings Component
 *
 * Manages notification preferences for the user.
 * All settings are persisted to localStorage.
 *
 * Features:
 * - Toggle chat notifications
 * - Toggle case update notifications
 * - Toggle document analysis notifications
 * - Automatic localStorage persistence
 *
 * @component
 */

import { Bell } from 'lucide-react';
import { type ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

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
 * Helper component for notification section container
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
 * NotificationSettings Component
 *
 * Provides UI for managing notification preferences including:
 * - Chat notifications (default: enabled)
 * - Case update notifications (default: enabled)
 * - Document analysis notifications (default: disabled)
 *
 * All settings are automatically persisted to localStorage.
 */
export function NotificationSettings(): JSX.Element {
  // Notification toggle states - all persisted to localStorage via useLocalStorage hook
  const [chatNotifications, setChatNotifications] = useLocalStorage('chatNotifications', true);
  const [caseUpdates, setCaseUpdates] = useLocalStorage('caseUpdates', true);
  const [documentAnalysisNotif, setDocumentAnalysisNotif] = useLocalStorage('documentAnalysisNotif', false);

  return (
    <SettingsSection
      icon={Bell}
      title="Notifications"
      description="Control how you receive updates"
    >
      <ToggleSetting
        label="Chat notifications"
        enabled={chatNotifications}
        onChange={setChatNotifications}
      />
      <ToggleSetting label="Case updates" enabled={caseUpdates} onChange={setCaseUpdates} />
      <ToggleSetting
        label="Document analysis complete"
        enabled={documentAnalysisNotif}
        onChange={setDocumentAnalysisNotif}
      />
    </SettingsSection>
  );
}
