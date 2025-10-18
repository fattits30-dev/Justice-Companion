/**
 * Shared Settings Component Library
 *
 * Reusable UI components for settings pages. These components provide consistent
 * styling and behavior across all settings sections in the application.
 *
 * Components:
 * - SettingsSection: Container for grouped settings with icon, title, and description
 * - SettingItem: Read-only setting item with label and value
 * - ToggleSetting: Toggle switch for boolean settings
 * - SelectSetting: Dropdown select for choice-based settings
 *
 * @module SettingsComponents
 */

import type { ComponentType, ReactNode } from 'react';

/**
 * Props for SettingsSection component
 */
export interface SettingsSectionProps {
  /** Icon component to display in the section header */
  icon: ComponentType<{ className?: string }>;
  /** Section title */
  title: string;
  /** Section description */
  description: string;
  /** Child components to render in the section */
  children: ReactNode;
}

/**
 * SettingsSection Component
 *
 * Container for a group of related settings. Displays a header with icon, title,
 * and description, followed by the child settings components.
 *
 * @example
 * ```tsx
 * <SettingsSection
 *   icon={User}
 *   title="Profile"
 *   description="Manage your profile information"
 * >
 *   <SettingItem label="Name" value="John Doe" />
 *   <ToggleSetting label="Public profile" enabled={true} onChange={setPublic} />
 * </SettingsSection>
 * ```
 */
export function SettingsSection({
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
 * Props for SettingItem component
 */
export interface SettingItemProps {
  /** Setting label */
  label: string;
  /** Setting value to display */
  value: string;
  /** Optional action button text */
  action?: string;
  /** Optional action button click handler */
  onAction?: () => void;
  /** Whether to style the value as informational (blue text) */
  info?: boolean;
}

/**
 * SettingItem Component
 *
 * Displays a read-only setting with a label and value. Optionally includes
 * an action button for performing operations related to the setting.
 *
 * @example
 * ```tsx
 * <SettingItem label="Version" value="1.0.0" />
 * <SettingItem label="Email" value="user@example.com" action="Change" onAction={changeEmail} />
 * <SettingItem label="Data sources" value="legislation.gov.uk" info />
 * ```
 */
export function SettingItem({
  label,
  value,
  action,
  onAction,
  info,
}: SettingItemProps): JSX.Element {
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
 * Props for ToggleSetting component
 */
export interface ToggleSettingProps {
  /** Setting label */
  label: string;
  /** Whether the toggle is enabled */
  enabled: boolean;
  /** Callback when toggle state changes */
  onChange?: (enabled: boolean) => void;
}

/**
 * ToggleSetting Component
 *
 * Toggle switch for boolean settings. Displays a label and an accessible
 * toggle button that changes state when clicked.
 *
 * @example
 * ```tsx
 * <ToggleSetting
 *   label="Dark mode"
 *   enabled={darkMode}
 *   onChange={setDarkMode}
 * />
 * ```
 */
export function ToggleSetting({ label, enabled, onChange }: ToggleSettingProps): JSX.Element {
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
 * Props for SelectSetting component
 */
export interface SelectSettingProps {
  /** Setting label */
  label: string;
  /** Currently selected value */
  value: string;
  /** Callback when selection changes */
  onChange?: (value: string) => void;
  /** Available options for the select dropdown */
  options: Array<{ value: string; label: string }>;
}

/**
 * SelectSetting Component
 *
 * Dropdown select for choice-based settings. Displays a label and a select
 * dropdown with provided options.
 *
 * @example
 * ```tsx
 * <SelectSetting
 *   label="Font size"
 *   value={fontSize}
 *   onChange={setFontSize}
 *   options={[
 *     { value: 'small', label: 'Small' },
 *     { value: 'medium', label: 'Medium' },
 *     { value: 'large', label: 'Large' },
 *   ]}
 * />
 * ```
 */
export function SelectSetting({
  label,
  value,
  onChange,
  options,
}: SelectSettingProps): JSX.Element {
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
