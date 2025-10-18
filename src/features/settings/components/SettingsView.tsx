import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/hooks/useToast';
import { Brain, Briefcase, Info, Lock, Settings, Sparkles, User } from 'lucide-react';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { AppearanceSettings } from './AppearanceSettings';
import { ConsentSettings } from './ConsentSettings';
import { DataPrivacySettings } from './DataPrivacySettings';
import { NotificationSettings } from './NotificationSettings';
import { OpenAISettings } from './OpenAISettings';
import { ProfileSettings } from './ProfileSettings';

export function SettingsView(): JSX.Element {
  const toast = useToast();

  // RAG toggle state - persisted in localStorage
  const [ragEnabled, setRagEnabled] = useState(() => {
    const saved = localStorage.getItem('ragEnabled');
    return saved !== null ? (JSON.parse(saved) as boolean) : true; // Default: enabled
  });

  // Advanced AI settings
  const [responseLength, setResponseLength] = useState(() => {
    const saved = localStorage.getItem('responseLength');
    return saved ?? 'balanced';
  });

  const [citationDetail, setCitationDetail] = useState(() => {
    const saved = localStorage.getItem('citationDetail');
    return saved ?? 'detailed';
  });

  const [jurisdiction, setJurisdiction] = useState(() => {
    const saved = localStorage.getItem('jurisdiction');
    return saved ?? 'uk-england-wales';
  });

  // Case Management settings
  const [defaultCaseType, setDefaultCaseType] = useState(() => {
    const saved = localStorage.getItem('defaultCaseType');
    return saved ?? 'general';
  });

  const [autoArchiveDays, setAutoArchiveDays] = useState(() => {
    const saved = localStorage.getItem('autoArchiveDays');
    return saved ?? '90';
  });

  const [caseNumberFormat, setCaseNumberFormat] = useState(() => {
    const saved = localStorage.getItem('caseNumberFormat');
    return saved ?? 'YYYY-NNNN';
  });

  // Persist RAG setting to localStorage
  useEffect(() => {
    localStorage.setItem('ragEnabled', JSON.stringify(ragEnabled));
  }, [ragEnabled]);

  // Persist advanced AI settings
  useEffect(() => {
    localStorage.setItem('responseLength', responseLength);
  }, [responseLength]);

  useEffect(() => {
    localStorage.setItem('citationDetail', citationDetail);
  }, [citationDetail]);

  useEffect(() => {
    localStorage.setItem('jurisdiction', jurisdiction);
  }, [jurisdiction]);

  // Persist case management settings
  useEffect(() => {
    localStorage.setItem('defaultCaseType', defaultCaseType);
  }, [defaultCaseType]);

  useEffect(() => {
    localStorage.setItem('autoArchiveDays', autoArchiveDays);
  }, [autoArchiveDays]);

  useEffect(() => {
    localStorage.setItem('caseNumberFormat', caseNumberFormat);
  }, [caseNumberFormat]);

  // Tab content components
  const AccountTab = (): JSX.Element => (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
        <ProfileSettings toast={toast} />
        <ConsentSettings toast={toast} />
      </div>
    </div>
  );

  const AIConfigTab = (): JSX.Element => (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
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
          <SettingItem label="Response mode" value="Information only - never legal advice" info />
        </SettingsSection>

        {/* OpenAI Provider Configuration */}
        <SettingsSection
          icon={Sparkles}
          title="AI Provider Configuration"
          description="Configure OpenAI API for AI-powered assistance"
        >
          <OpenAISettings onConfigSaved={() => toast.success('OpenAI configured successfully!')} />
        </SettingsSection>

        {/* Advanced AI */}
        <SettingsSection
          icon={Brain}
          title="Advanced AI"
          description="Fine-tune AI response behavior"
        >
          <SelectSetting
            label="Response length"
            value={responseLength}
            onChange={setResponseLength}
            options={[
              { value: 'concise', label: 'Concise' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'detailed', label: 'Detailed' },
            ]}
          />
          <SelectSetting
            label="Citation detail"
            value={citationDetail}
            onChange={setCitationDetail}
            options={[
              { value: 'minimal', label: 'Minimal' },
              { value: 'detailed', label: 'Detailed' },
              { value: 'comprehensive', label: 'Comprehensive' },
            ]}
          />
          <SelectSetting
            label="Jurisdiction"
            value={jurisdiction}
            onChange={setJurisdiction}
            options={[
              { value: 'uk-england-wales', label: 'England & Wales' },
              { value: 'uk-scotland', label: 'Scotland' },
              { value: 'uk-northern-ireland', label: 'Northern Ireland' },
            ]}
          />
        </SettingsSection>
      </div>
    </div>
  );

  const PreferencesTab = (): JSX.Element => (
    <div className="space-y-6">
      <NotificationSettings />
      <AppearanceSettings />
    </div>
  );

  const CaseManagementTab = (): JSX.Element => (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
        {/* Case Management */}
        <SettingsSection
          icon={Briefcase}
          title="Case Management"
          description="Configure case handling preferences"
        >
          <SelectSetting
            label="Default case type"
            value={defaultCaseType}
            onChange={setDefaultCaseType}
            options={[
              { value: 'general', label: 'General' },
              { value: 'employment', label: 'Employment' },
              { value: 'family', label: 'Family' },
              { value: 'housing', label: 'Housing' },
              { value: 'immigration', label: 'Immigration' },
            ]}
          />
          <SelectSetting
            label="Auto-archive after"
            value={autoArchiveDays}
            onChange={setAutoArchiveDays}
            options={[
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: '180', label: '180 days' },
              { value: 'never', label: 'Never' },
            ]}
          />
          <SelectSetting
            label="Case numbering"
            value={caseNumberFormat}
            onChange={setCaseNumberFormat}
            options={[
              { value: 'YYYY-NNNN', label: 'YYYY-NNNN' },
              { value: 'NNNN-YYYY', label: 'NNNN-YYYY' },
              { value: 'SEQUENTIAL', label: 'Sequential' },
            ]}
          />
        </SettingsSection>
      </div>
    </div>
  );

  const AboutTab = (): JSX.Element => (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
        {/* About */}
        <SettingsSection icon={Info} title="About" description="Application information">
          <SettingItem label="Version" value="1.0.0" />
          <SettingItem label="Build" value="Development" />
          <SettingItem label="License" value="MIT License - Free and open source" info />
        </SettingsSection>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-hidden p-6 flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-blue-200">Manage your preferences</p>
      </div>

      {/* Tabbed Settings - Fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          defaultTab="account"
          tabs={[
            {
              id: 'account',
              label: 'Account',
              icon: User,
              content: <AccountTab />,
            },
            {
              id: 'ai',
              label: 'AI Configuration',
              icon: Brain,
              content: <AIConfigTab />,
            },
            {
              id: 'preferences',
              label: 'Preferences',
              icon: Settings,
              content: <PreferencesTab />,
            },
            {
              id: 'privacy',
              label: 'Data & Privacy',
              icon: Lock,
              content: <DataPrivacySettings toast={toast} />,
            },
            {
              id: 'cases',
              label: 'Case Management',
              icon: Briefcase,
              content: <CaseManagementTab />,
            },
            {
              id: 'about',
              label: 'About',
              icon: Info,
              content: <AboutTab />,
            },
          ]}
        />
      </div>
    </div>
  );
}

interface SettingsSectionProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
}

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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">{children}</div>
    </div>
  );
}

interface SettingItemProps {
  label: string;
  value: string;
  action?: string;
  onAction?: () => void;
  info?: boolean;
}

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

interface ToggleSettingProps {
  label: string;
  enabled: boolean;
  onChange?: (enabled: boolean) => void;
}

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

interface SelectSettingProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

function SelectSetting({ label, value, onChange, options }: SelectSettingProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-2 border-b border-blue-800/20 last:border-0">
      <div className="text-xs font-medium text-white flex-shrink-0 mr-3">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="px-2 py-1 text-xs bg-slate-800/50 border border-blue-700/30 rounded text-white focus:outline-none focus:ring-3 focus:ring-blue-500 flex-shrink-0"
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
