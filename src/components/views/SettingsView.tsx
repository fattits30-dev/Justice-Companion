import { useState, useEffect } from 'react';
import { User, Bell, Lock, Database, Info, Brain } from 'lucide-react';

export function SettingsView(): JSX.Element {
  // RAG toggle state - persisted in localStorage
  const [ragEnabled, setRagEnabled] = useState(() => {
    const saved = localStorage.getItem('ragEnabled');
    return saved !== null ? JSON.parse(saved) : true; // Default: enabled
  });

  // Persist RAG setting to localStorage
  useEffect(() => {
    localStorage.setItem('ragEnabled', JSON.stringify(ragEnabled));
  }, [ragEnabled]);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-blue-200">Manage your Justice Companion preferences</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Profile Section */}
          <SettingsSection
            icon={User}
            title="Profile"
            description="Manage your personal information"
          >
            <SettingItem label="Name" value="Legal User" action="Edit" />
            <SettingItem label="Email" value="Not set" action="Add" />
          </SettingsSection>

          {/* AI & Legal Data Section */}
          <SettingsSection
            icon={Brain}
            title="AI & Legal Data"
            description="Configure AI assistant and legal information sources"
          >
            <ToggleSetting
              label="Enhanced legal responses (RAG)"
              enabled={ragEnabled}
              onChange={setRagEnabled}
            />
            <SettingItem
              label="Data sources"
              value="legislation.gov.uk, caselaw.nationalarchives.gov.uk"
              info
            />
            <SettingItem
              label="Response mode"
              value="Information only - never legal advice"
              info
            />
          </SettingsSection>

          {/* Notifications Section */}
          <SettingsSection
            icon={Bell}
            title="Notifications"
            description="Control how you receive updates"
          >
            <ToggleSetting label="Chat notifications" enabled={true} />
            <ToggleSetting label="Case updates" enabled={true} />
            <ToggleSetting label="Document analysis complete" enabled={false} />
          </SettingsSection>

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
            <ToggleSetting label="Encrypt sensitive data" enabled={true} />
          </SettingsSection>

          {/* Data Management */}
          <SettingsSection
            icon={Database}
            title="Data Management"
            description="Manage your stored data"
          >
            <SettingItem label="Database location" value="AppData/justice-companion" info />
            <button className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-600/30 transition-all text-sm font-medium">
              Clear All Data
            </button>
          </SettingsSection>

          {/* About */}
          <SettingsSection
            icon={Info}
            title="About"
            description="Application information"
          >
            <SettingItem label="Version" value="1.0.0" />
            <SettingItem label="Build" value="Development" />
            <SettingItem
              label="License"
              value="MIT License - Free and open source"
              info
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsSection({ icon: Icon, title, description, children }: SettingsSectionProps): JSX.Element {
  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-blue-950/50 border border-blue-800/30 rounded-xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-blue-600/20 rounded-lg">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
          <p className="text-sm text-blue-300">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface SettingItemProps {
  label: string;
  value: string;
  action?: string;
  info?: boolean;
}

function SettingItem({ label, value, action, info }: SettingItemProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-3 border-b border-blue-800/20 last:border-0">
      <div className="flex-1">
        <div className="text-sm font-medium text-white mb-1">{label}</div>
        <div className={`text-sm ${info ? 'text-blue-400' : 'text-blue-300'}`}>{value}</div>
      </div>
      {action && (
        <button className="px-4 py-2 text-sm text-blue-300 hover:text-blue-200 font-medium transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}

interface ToggleSettingProps {
  label: string;
  enabled: boolean;
  onChange?: (enabled: boolean) => void;
}

function ToggleSetting({ label, enabled, onChange }: ToggleSettingProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-3 border-b border-blue-800/20 last:border-0">
      <div className="text-sm font-medium text-white">{label}</div>
      <button
        onClick={() => onChange?.(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
