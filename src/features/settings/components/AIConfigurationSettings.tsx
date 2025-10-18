/**
 * AIConfigurationSettings Component
 *
 * Manages AI configuration settings including RAG (Retrieval-Augmented Generation),
 * response preferences, citation detail, jurisdiction, and OpenAI API configuration.
 * All settings are persisted to localStorage.
 *
 * Features:
 * - Toggle RAG (Enhanced legal responses)
 * - Configure response length (concise, balanced, detailed)
 * - Configure citation detail level (minimal, detailed, comprehensive)
 * - Select legal jurisdiction (England & Wales, Scotland, Northern Ireland)
 * - OpenAI API configuration
 * - Read-only legal data source information
 *
 * @component
 */

import { SettingsSection, SettingItem, ToggleSetting, SelectSetting } from '@/components/ui/SettingsComponents';
import { Brain, Sparkles } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { OpenAISettings } from './OpenAISettings';

/**
 * Toast notification interface for displaying success messages
 */
interface Toast {
  success: (message: string) => void;
}

/**
 * Props for AIConfigurationSettings component
 */
interface AIConfigurationSettingsProps {
  /** Toast notification handler */
  toast: Toast;
}

/**
 * AIConfigurationSettings Component
 *
 * Provides UI for managing AI configuration including:
 * - RAG (Retrieval-Augmented Generation) toggle (default: enabled)
 * - Response length selection (concise/balanced/detailed)
 * - Citation detail level (minimal/detailed/comprehensive)
 * - Legal jurisdiction selection (England & Wales/Scotland/Northern Ireland)
 * - OpenAI API configuration
 *
 * All settings are automatically persisted to localStorage.
 */
export function AIConfigurationSettings({ toast }: AIConfigurationSettingsProps): JSX.Element {
  // RAG toggle state - persisted in localStorage
  const [ragEnabled, setRagEnabled] = useLocalStorage('ragEnabled', true);

  // Advanced AI settings - persisted in localStorage
  const [responseLength, setResponseLength] = useLocalStorage('responseLength', 'balanced');
  const [citationDetail, setCitationDetail] = useLocalStorage('citationDetail', 'detailed');
  const [jurisdiction, setJurisdiction] = useLocalStorage('jurisdiction', 'uk-england-wales');

  return (
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
}
