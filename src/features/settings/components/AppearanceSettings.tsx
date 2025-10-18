/**
 * AppearanceSettings Component
 *
 * Manages appearance, voice input, and accessibility settings for the user.
 * All settings are persisted to localStorage.
 *
 * Features:
 * - Toggle dark mode
 * - Configure font size
 * - Voice input settings (microphone, language, auto-transcribe)
 * - Accessibility settings (high contrast, screen reader support)
 * - Keyboard shortcuts reference
 *
 * @component
 */

import { Bell, Settings, Lock } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

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
 * AppearanceSettings Component
 *
 * Provides UI for managing appearance, voice input, and accessibility settings including:
 * - Dark mode toggle (default: enabled)
 * - Font size selection (small/medium/large)
 * - Microphone selection for voice input
 * - Speech recognition language
 * - Auto-transcribe toggle
 * - High contrast mode
 * - Screen reader support
 *
 * All settings are automatically persisted to localStorage.
 */
export function AppearanceSettings(): JSX.Element {
  // Appearance settings - persisted to localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? (JSON.parse(saved) as boolean) : true;
  });

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize');
    return saved ?? 'medium';
  });

  // Voice input settings - persisted to localStorage
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

  // Accessibility settings - persisted to localStorage
  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('highContrast');
    return saved !== null ? (JSON.parse(saved) as boolean) : false;
  });

  const [screenReaderSupport, setScreenReaderSupport] = useState(() => {
    const saved = localStorage.getItem('screenReaderSupport');
    return saved !== null ? (JSON.parse(saved) as boolean) : true;
  });

  // Persist appearance settings to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  // Persist voice input settings to localStorage
  useEffect(() => {
    localStorage.setItem('selectedMicrophone', selectedMicrophone);
  }, [selectedMicrophone]);

  useEffect(() => {
    localStorage.setItem('speechLanguage', speechLanguage);
  }, [speechLanguage]);

  useEffect(() => {
    localStorage.setItem('autoTranscribe', JSON.stringify(autoTranscribe));
  }, [autoTranscribe]);

  // Persist accessibility settings to localStorage
  useEffect(() => {
    localStorage.setItem('highContrast', JSON.stringify(highContrast));
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('screenReaderSupport', JSON.stringify(screenReaderSupport));
  }, [screenReaderSupport]);

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
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
              { value: 'system', label: 'System' },
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
              /* TODO: Implement keyboard shortcuts dialog */
            }}
            className="w-full px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-medium"
          >
            Keyboard Shortcuts
          </button>
        </SettingsSection>
      </div>
    </div>
  );
}
