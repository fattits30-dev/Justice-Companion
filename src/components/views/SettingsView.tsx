import { useState, useEffect } from 'react';
import { User, Bell, Lock, Database, Info, Brain, Briefcase } from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';
import { useToast } from '../../hooks/useToast';
import type { UserProfile } from '../../models/UserProfile';

export function SettingsView(): JSX.Element {
  const toast = useToast();

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // RAG toggle state - persisted in localStorage
  const [ragEnabled, setRagEnabled] = useState(() => {
    const saved = localStorage.getItem('ragEnabled');
    return saved !== null ? JSON.parse(saved) : true; // Default: enabled
  });

  // Notification toggles
  const [chatNotifications, setChatNotifications] = useState(() => {
    const saved = localStorage.getItem('chatNotifications');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [caseUpdates, setCaseUpdates] = useState(() => {
    const saved = localStorage.getItem('caseUpdates');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [documentAnalysisNotif, setDocumentAnalysisNotif] = useState(() => {
    const saved = localStorage.getItem('documentAnalysisNotif');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Privacy toggle
  const [encryptData, setEncryptData] = useState(() => {
    const saved = localStorage.getItem('encryptData');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Appearance settings
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize');
    return saved || 'medium';
  });

  // Voice Input settings
  const [selectedMicrophone, setSelectedMicrophone] = useState(() => {
    const saved = localStorage.getItem('selectedMicrophone');
    return saved || 'default';
  });

  const [speechLanguage, setSpeechLanguage] = useState(() => {
    const saved = localStorage.getItem('speechLanguage');
    return saved || 'en-GB';
  });

  const [autoTranscribe, setAutoTranscribe] = useState(() => {
    const saved = localStorage.getItem('autoTranscribe');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Export & Backup settings
  const [exportLocation, setExportLocation] = useState(() => {
    const saved = localStorage.getItem('exportLocation');
    return saved || 'Downloads';
  });

  const [autoBackupFrequency, setAutoBackupFrequency] = useState(() => {
    const saved = localStorage.getItem('autoBackupFrequency');
    return saved || 'daily';
  });

  // Accessibility settings
  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('highContrast');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [screenReaderSupport, setScreenReaderSupport] = useState(() => {
    const saved = localStorage.getItem('screenReaderSupport');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Advanced AI settings
  const [responseLength, setResponseLength] = useState(() => {
    const saved = localStorage.getItem('responseLength');
    return saved || 'balanced';
  });

  const [citationDetail, setCitationDetail] = useState(() => {
    const saved = localStorage.getItem('citationDetail');
    return saved || 'detailed';
  });

  const [jurisdiction, setJurisdiction] = useState(() => {
    const saved = localStorage.getItem('jurisdiction');
    return saved || 'uk-england-wales';
  });

  // Case Management settings
  const [defaultCaseType, setDefaultCaseType] = useState(() => {
    const saved = localStorage.getItem('defaultCaseType');
    return saved || 'general';
  });

  const [autoArchiveDays, setAutoArchiveDays] = useState(() => {
    const saved = localStorage.getItem('autoArchiveDays');
    return saved || '90';
  });

  const [caseNumberFormat, setCaseNumberFormat] = useState(() => {
    const saved = localStorage.getItem('caseNumberFormat');
    return saved || 'YYYY-NNNN';
  });

  // Clear data confirmation
  const [clearDataConfirmOpen, setClearDataConfirmOpen] = useState(false);

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!window.justiceAPI) {
        return;
      }

      try {
        const result = await window.justiceAPI.getUserProfile();
        if (result.success && result.data) {
          setUserProfile(result.data);
          setEditedName(result.data.name || '');
          setEditedEmail(result.data.email || '');
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    loadProfile();
  }, []);

  // Persist RAG setting to localStorage
  useEffect(() => {
    localStorage.setItem('ragEnabled', JSON.stringify(ragEnabled));
  }, [ragEnabled]);

  // Persist notification settings
  useEffect(() => {
    localStorage.setItem('chatNotifications', JSON.stringify(chatNotifications));
  }, [chatNotifications]);

  useEffect(() => {
    localStorage.setItem('caseUpdates', JSON.stringify(caseUpdates));
  }, [caseUpdates]);

  useEffect(() => {
    localStorage.setItem('documentAnalysisNotif', JSON.stringify(documentAnalysisNotif));
  }, [documentAnalysisNotif]);

  // Persist privacy settings
  useEffect(() => {
    localStorage.setItem('encryptData', JSON.stringify(encryptData));
  }, [encryptData]);

  // Persist appearance settings
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  // Persist voice input settings
  useEffect(() => {
    localStorage.setItem('selectedMicrophone', selectedMicrophone);
  }, [selectedMicrophone]);

  useEffect(() => {
    localStorage.setItem('speechLanguage', speechLanguage);
  }, [speechLanguage]);

  useEffect(() => {
    localStorage.setItem('autoTranscribe', JSON.stringify(autoTranscribe));
  }, [autoTranscribe]);

  // Persist export & backup settings
  useEffect(() => {
    localStorage.setItem('exportLocation', exportLocation);
  }, [exportLocation]);

  useEffect(() => {
    localStorage.setItem('autoBackupFrequency', autoBackupFrequency);
  }, [autoBackupFrequency]);

  // Persist accessibility settings
  useEffect(() => {
    localStorage.setItem('highContrast', JSON.stringify(highContrast));
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('screenReaderSupport', JSON.stringify(screenReaderSupport));
  }, [screenReaderSupport]);

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

  const handleSaveProfile = async () => {
    if (!window.justiceAPI) {
      return;
    }

    try {
      const result = await window.justiceAPI.updateUserProfile({
        name: editedName,
        email: editedEmail,
      });

      if (result.success && result.data) {
        setUserProfile(result.data);
        setIsEditingProfile(false);
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleClearAllData = async () => {
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
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast.error('Failed to clear all data. Please try again.');
    }
  };

  return (
    <div className="flex-1 overflow-hidden p-6 flex flex-col">
      {/* Success Message */}
      {showSaveSuccess && (
        <div className="mb-4 p-3 bg-green-600/20 border border-green-500/30 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-4 fade-in">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-300 text-sm font-medium">Profile updated successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm text-blue-200">Manage your preferences</p>
      </div>

      {/* Settings Grid - Fills remaining space with scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-4 pb-4">
          {/* Profile Section */}
          <SettingsSection
            icon={User}
            title="Profile"
            description="Manage your personal information"
          >
            {isEditingProfile ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Name</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Email</label>
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingProfile(false);
                      setEditedName(userProfile?.name || '');
                      setEditedEmail(userProfile?.email || '');
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <SettingItem
                  label="Name"
                  value={userProfile?.name || 'Not set'}
                  action="Edit"
                  onAction={() => setIsEditingProfile(true)}
                />
                <SettingItem
                  label="Email"
                  value={userProfile?.email || 'Not set'}
                  action="Edit"
                  onAction={() => setIsEditingProfile(true)}
                />
              </>
            )}
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
            <ToggleSetting
              label="Chat notifications"
              enabled={chatNotifications}
              onChange={setChatNotifications}
            />
            <ToggleSetting
              label="Case updates"
              enabled={caseUpdates}
              onChange={setCaseUpdates}
            />
            <ToggleSetting
              label="Document analysis complete"
              enabled={documentAnalysisNotif}
              onChange={setDocumentAnalysisNotif}
            />
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

          {/* Appearance */}
          <SettingsSection
            icon={User}
            title="Appearance"
            description="Customize the interface look and feel"
          >
            <ToggleSetting
              label="Dark mode"
              enabled={darkMode}
              onChange={setDarkMode}
            />
            <SelectSetting
              label="Font size"
              value={fontSize}
              onChange={setFontSize}
              options={[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ]}
            />
          </SettingsSection>

          {/* Voice Input */}
          <SettingsSection
            icon={Bell}
            title="Voice Input"
            description="Configure speech recognition settings"
          >
            <SelectSetting
              label="Microphone"
              value={selectedMicrophone}
              onChange={setSelectedMicrophone}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'system', label: 'System Default' },
              ]}
            />
            <SelectSetting
              label="Language"
              value={speechLanguage}
              onChange={setSpeechLanguage}
              options={[
                { value: 'en-GB', label: 'English (UK)' },
                { value: 'en-US', label: 'English (US)' },
              ]}
            />
            <ToggleSetting
              label="Auto-transcribe"
              enabled={autoTranscribe}
              onChange={setAutoTranscribe}
            />
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
              onClick={() => console.log('Restore from backup')}
              className="w-full px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-medium"
            >
              Restore from Backup
            </button>
          </SettingsSection>

          {/* Accessibility */}
          <SettingsSection
            icon={Lock}
            title="Accessibility"
            description="Enhance usability and accessibility"
          >
            <ToggleSetting
              label="High contrast mode"
              enabled={highContrast}
              onChange={setHighContrast}
            />
            <ToggleSetting
              label="Screen reader support"
              enabled={screenReaderSupport}
              onChange={setScreenReaderSupport}
            />
            <button
              onClick={() => console.log('View keyboard shortcuts')}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/30 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-all text-xs font-medium"
            >
              Keyboard Shortcuts
            </button>
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

      {/* Clear Data Confirmation Dialog */}
      <ConfirmDialog
        isOpen={clearDataConfirmOpen}
        title="Clear All Data"
        message="Are you sure you want to clear all data? This will permanently delete all cases, conversations, documents, and user data. This action cannot be undone."
        confirmText="Clear All Data"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleClearAllData}
        onCancel={() => setClearDataConfirmOpen(false)}
      />
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
        <div className={`text-xs truncate ${info ? 'text-blue-400' : 'text-blue-300'}`}>{value}</div>
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
        className="px-2 py-1 text-xs bg-slate-800/50 border border-blue-700/30 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 flex-shrink-0"
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
