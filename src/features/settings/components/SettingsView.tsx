import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonText } from '@/components/ui/Skeleton';
import { LoadingSpinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import type { Consent, ConsentType } from '@/models/Consent';
import type { UserProfile } from '@/models/UserProfile';
import {
  Bell,
  Brain,
  Briefcase,
  CheckCircle2,
  Database,
  Info,
  Lock,
  Settings,
  Shield,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { OpenAISettings } from './OpenAISettings';

export function SettingsView(): JSX.Element {
  const toast = useToast();
  const { user } = useAuth();

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Consent Management
  const [consents, setConsents] = useState<Consent[]>([]);
  const [isLoadingConsents, setIsLoadingConsents] = useState(false);

  // RAG toggle state - persisted in localStorage
  const [ragEnabled, setRagEnabled] = useState(() => {
    const saved = localStorage.getItem('ragEnabled');
    return saved !== null ? (JSON.parse(saved) as boolean) : true; // Default: enabled
  });

  // Notification toggles
  const [chatNotifications, setChatNotifications] = useState(() => {
    const saved = localStorage.getItem('chatNotifications');
    return saved !== null ? (JSON.parse(saved) as boolean) : true;
  });

  const [caseUpdates, setCaseUpdates] = useState(() => {
    const saved = localStorage.getItem('caseUpdates');
    return saved !== null ? (JSON.parse(saved) as boolean) : true;
  });

  const [documentAnalysisNotif, setDocumentAnalysisNotif] = useState(() => {
    const saved = localStorage.getItem('documentAnalysisNotif');
    return saved !== null ? (JSON.parse(saved) as boolean) : false;
  });

  // Privacy toggle
  const [encryptData, setEncryptData] = useState(() => {
    const saved = localStorage.getItem('encryptData');
    return saved !== null ? (JSON.parse(saved) as boolean) : true;
  });

  // Appearance settings
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? (JSON.parse(saved) as boolean) : true;
  });

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize');
    return saved ?? 'medium';
  });

  // Voice Input settings
  const [selectedMicrophone, setSelectedMicrophone] = useState(() => {
    const saved = localStorage.getItem('selectedMicrophone');
    return saved ?? 'default';
  });

  const [speechLanguage, setSpeechLanguage] = useState(() => {
    const saved = localStorage.getItem('speechLanguage');
    return saved ?? 'en-GB';
  });

  const [autoTranscribe, setAutoTranscribe] = useState(() => {
    const saved = localStorage.getItem('autoTranscribe');
    return saved !== null ? (JSON.parse(saved) as boolean) : true;
  });

  // Export & Backup settings
  const [exportLocation, setExportLocation] = useState(() => {
    const saved = localStorage.getItem('exportLocation');
    return saved ?? 'Downloads';
  });

  const [autoBackupFrequency, setAutoBackupFrequency] = useState(() => {
    const saved = localStorage.getItem('autoBackupFrequency');
    return saved ?? 'daily';
  });

  // Accessibility settings
  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('highContrast');
    return saved !== null ? (JSON.parse(saved) as boolean) : false;
  });

  const [screenReaderSupport, setScreenReaderSupport] = useState(() => {
    const saved = localStorage.getItem('screenReaderSupport');
    return saved !== null ? (JSON.parse(saved) as boolean) : true;
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

  // Clear data confirmation
  const [clearDataConfirmOpen, setClearDataConfirmOpen] = useState(false);

  // Refs for timeout cleanup (prevent memory leaks)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user profile and consents on mount
  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      if (!window.justiceAPI) {
        setIsLoadingProfile(false);
        return;
      }

      setIsLoadingProfile(true);
      try {
        const result = await window.justiceAPI.getUserProfile();
        if (result.success && result.data) {
          setUserProfile(result.data);
          setEditedName(result.data.name ?? '');
          setEditedEmail(result.data.email ?? '');
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void loadProfile();
    void loadConsents();

    // Cleanup timeouts on unmount to prevent memory leaks
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
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

  const handleSaveProfile = async (): Promise<void> => {
    if (!window.justiceAPI) {
      return;
    }

    setIsSavingProfile(true);
    try {
      const result = await window.justiceAPI.updateUserProfile({
        name: editedName,
        email: editedEmail,
      });

      if (result.success && result.data) {
        setUserProfile(result.data);
        setIsEditingProfile(false);
        setShowSaveSuccess(true);
        // Clear any existing timeout before setting new one
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
        successTimeoutRef.current = setTimeout(() => setShowSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    setPasswordError(null);

    // Validation
    if (!oldPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (newPassword.length < 12) {
      setPasswordError('New password must be at least 12 characters');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setPasswordError('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError('Password must contain at least one number');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const result = await window.justiceAPI.changePassword(oldPassword, newPassword);

      if (result.success) {
        toast.success('Password changed successfully! Please login again.');
        // Reset form
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setIsChangingPassword(false);
        // User will be logged out automatically
      } else {
        setPasswordError(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

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

  // Tab content components
  const AccountTab = (): JSX.Element => (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
        {/* Profile Section */}
        <SettingsSection icon={User} title="Profile" description="Manage your personal information">
          {isLoadingProfile ? (
            <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
              <SkeletonText lines={2} />
              <span className="sr-only">Loading profile...</span>
            </div>
          ) : isEditingProfile ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white mb-1">Name</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                  placeholder="Enter your name"
                  disabled={isSavingProfile}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white mb-1">Email</label>
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                  placeholder="Enter your email"
                  disabled={isSavingProfile}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleSaveProfile()}
                  disabled={isSavingProfile}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditingProfile(false);
                    setEditedName(userProfile?.name ?? '');
                    setEditedEmail(userProfile?.email ?? '');
                  }}
                  disabled={isSavingProfile}
                  className="flex-1 px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <SettingItem
                label="Name"
                value={userProfile?.name ?? 'Not set'}
                action="Edit"
                onAction={() => setIsEditingProfile(true)}
              />
              <SettingItem
                label="Email"
                value={userProfile?.email ?? 'Not set'}
                action="Edit"
                onAction={() => setIsEditingProfile(true)}
              />
            </>
          )}
        </SettingsSection>

        {/* Account Security */}
        <SettingsSection
          icon={Shield}
          title="Account Security"
          description="Manage your account password"
        >
          {user && <SettingItem label="Username" value={user.username} info />}
          {!isChangingPassword ? (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="w-full px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-medium"
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-3">
              {passwordError && (
                <div className="px-3 py-2 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg text-xs">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-white mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                  placeholder="Enter current password"
                  disabled={isSubmittingPassword}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                  placeholder="At least 12 characters"
                  disabled={isSubmittingPassword}
                />
                <p className="text-xs text-slate-300 mt-1">
                  12+ chars, uppercase, lowercase, number
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-white mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
                  placeholder="Re-enter new password"
                  disabled={isSubmittingPassword}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleChangePassword()}
                  disabled={isSubmittingPassword}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingPassword ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span>Changing...</span>
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsChangingPassword(false);
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setPasswordError(null);
                  }}
                  disabled={isSubmittingPassword}
                  className="flex-1 px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </SettingsSection>

        {/* Consent Management */}
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
              {['data_processing', 'encryption', 'ai_processing', 'marketing'].map((type) => {
                const consentType = type as ConsentType;
                const consent = consents.find((c) => c.consentType === consentType && !c.revokedAt);
                const isRequired = consentType === 'data_processing';

                return (
                  <div
                    key={consentType}
                    className="flex items-center justify-between py-2 border-b border-blue-800/20 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-white capitalize">
                          {consentType.replace('_', ' ')}
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
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
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
          <ToggleSetting label="Case updates" enabled={caseUpdates} onChange={setCaseUpdates} />
          <ToggleSetting
            label="Document analysis complete"
            enabled={documentAnalysisNotif}
            onChange={setDocumentAnalysisNotif}
          />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          icon={Settings}
          title="Appearance"
          description="Customize the interface look and feel"
        >
          <ToggleSetting label="Dark mode" enabled={darkMode} onChange={setDarkMode} />
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
            onClick={() => {
              // TODO: Implement keyboard shortcuts dialog
            }}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/30 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-all text-xs font-medium"
          >
            Keyboard Shortcuts
          </button>
        </SettingsSection>
      </div>
    </div>
  );

  const DataPrivacyTab = (): JSX.Element => (
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
            onClick={() => {
              // TODO: Implement restore from backup functionality
            }}
            className="w-full px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-medium"
          >
            Restore from Backup
          </button>
        </SettingsSection>
      </div>
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
              content: <DataPrivacyTab />,
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
