/**
 * CaseManagementSettings Component
 *
 * Manages case handling preferences and configuration settings.
 * All settings are persisted to localStorage.
 *
 * Features:
 * - Configure default case type (general, employment, family, housing, immigration)
 * - Set auto-archive period (30/90/180 days, or never)
 * - Choose case numbering format (YYYY-NNNN, NNNN-YYYY, Sequential)
 *
 * @component
 */

import { SettingsSection, SelectSetting } from '@/components/ui/SettingsComponents';
import { Briefcase } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

/**
 * CaseManagementSettings Component
 *
 * Provides UI for managing case handling preferences including:
 * - Default case type selection (default: 'general')
 * - Auto-archive period (default: '90' days)
 * - Case numbering format (default: 'YYYY-NNNN')
 *
 * All settings are automatically persisted to localStorage.
 */
export function CaseManagementSettings(): JSX.Element {
  // Case Management settings - persisted in localStorage
  const [defaultCaseType, setDefaultCaseType] = useLocalStorage('defaultCaseType', 'general');
  const [autoArchiveDays, setAutoArchiveDays] = useLocalStorage('autoArchiveDays', '90');
  const [caseNumberFormat, setCaseNumberFormat] = useLocalStorage('caseNumberFormat', 'YYYY-NNNN');

  return (
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
}
