import { useToast } from '@/hooks/useToast';
import { secureStorage } from '@/services/SecureStorageService';
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error';

interface OpenAISettingsProps {
  onConfigSaved?: () => void;
}

export function OpenAISettings({ onConfigSaved }: OpenAISettingsProps): JSX.Element {
  const toast = useToast();

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo'>('gpt-4o');
  const [organization, setOrganization] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // UI state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConfigured, setHasConfigured] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState<string | null>(null);

  // Load saved configuration on mount
  useEffect(() => {
    const loadSavedConfig = async (): Promise<void> => {
      try {
        // Initialize secure storage first
        await secureStorage.init();

        // Load API key, model, and organization from secure storage
        const savedApiKey = await secureStorage.getApiKey('openai_api_key');
        const savedModel = await secureStorage.getApiKey('openai_model');
        const savedOrganization = await secureStorage.getApiKey('openai_organization');

        if (savedApiKey) {
          setHasConfigured(true);
          setMaskedApiKey(maskApiKey(savedApiKey));
          setModel((savedModel as 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo') ?? 'gpt-4o');
          if (savedOrganization) {
            setOrganization(savedOrganization);
          }
        }
      } catch (error) {
        console.error('[OpenAISettings] Failed to load saved configuration:', error);
        toast.error('Failed to load saved API key configuration');
      }
    };

    void loadSavedConfig();
  }, [toast]);

  const maskApiKey = (key: string): string => {
    if (key.length < 8) {
      return key;
    }
    const prefix = key.substring(0, 8);
    return `${prefix}${'•'.repeat(32)}`;
  };

  const validateApiKey = (key: string): boolean => {
    // OpenAI API keys start with "sk-" or "sk-proj-"
    if (!key.startsWith('sk-')) {
      toast.error('API key must start with "sk-" or "sk-proj-"');
      return false;
    }

    if (key.length < 20) {
      toast.error('API key appears to be too short');
      return false;
    }

    return true;
  };

  const handleTestConnection = async (): Promise<void> => {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }

    if (!validateApiKey(apiKey)) {
      return;
    }

    setConnectionStatus('testing');
    setConnectionError(null);

    try {
      const response = await window.justiceAPI.testAIConnection({
        apiKey,
        model,
      });

      if (response.success) {
        if (response.connected) {
          setConnectionStatus('connected');
          setConnectionError(null);
          toast.success(`Connected to OpenAI successfully! (${response.model ?? model})`);
        } else {
          setConnectionStatus('error');
          setConnectionError(response.error ?? 'Connection failed');
          toast.error(`Connection failed: ${response.error ?? 'Unknown error'}`);
        }
      } else {
        setConnectionStatus('error');
        setConnectionError(response.error ?? 'Connection failed');
        toast.error(`Connection failed: ${response.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      setConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectionError(errorMessage);
      toast.error(`Connection test failed: ${errorMessage}`);
    }
  };

  const handleSaveConfiguration = async (): Promise<void> => {
    if (!apiKey) {
      toast.error('Please enter an API key');
      return;
    }

    if (!validateApiKey(apiKey)) {
      return;
    }

    setIsSaving(true);

    try {
      // Save to OpenAI service
      const response = await window.justiceAPI.configureAI({
        apiKey,
        model,
        organization: organization ?? undefined,
      });

      if (response.success) {
        // Save to secure storage (OS-native encryption)
        await secureStorage.setApiKey('openai_api_key', apiKey);
        await secureStorage.setApiKey('openai_model', model);
        if (organization) {
          await secureStorage.setApiKey('openai_organization', organization);
        } else {
          await secureStorage.deleteApiKey('openai_organization');
        }

        setHasConfigured(true);
        setMaskedApiKey(maskApiKey(apiKey));
        setApiKey(''); // Clear the input field for security
        setConnectionStatus('idle');

        toast.success('OpenAI configuration saved successfully!');
        onConfigSaved?.();
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save configuration: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearConfiguration = async (): Promise<void> => {
    if (
       
      !window.confirm(
        'Are you sure you want to clear your OpenAI configuration? This will remove your API key.',
      )
    ) {
      return;
    }

    try {
      // Delete from secure storage
      await secureStorage.deleteApiKey('openai_api_key');
      await secureStorage.deleteApiKey('openai_model');
      await secureStorage.deleteApiKey('openai_organization');

      setApiKey('');
      setModel('gpt-4o');
      setOrganization('');
      setHasConfigured(false);
      setMaskedApiKey(null);
      setConnectionStatus('idle');
      setConnectionError(null);

      toast.success('OpenAI configuration cleared');
    } catch (error) {
      console.error('[OpenAISettings] Failed to clear configuration:', error);
      toast.error('Failed to clear API key configuration');
    }
  };

  const getStatusIcon = (): JSX.Element => {
    switch (connectionStatus) {
      case 'testing':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-300" />;
    }
  };

  const getStatusText = (): string => {
    switch (connectionStatus) {
      case 'testing':
        return 'Testing connection...';
      case 'connected':
        return 'Connected successfully';
      case 'error':
        return `Error: ${connectionError ?? 'Connection failed'}`;
      default:
        return 'Not tested';
    }
  };

  const getStatusColor = (): string => {
    switch (connectionStatus) {
      case 'testing':
        return 'text-blue-300';
      case 'connected':
        return 'text-green-300';
      case 'error':
        return 'text-red-300';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Information Banner */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Brain className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-blue-200 mb-1">
              <strong>OpenAI API Configuration</strong>
            </p>
            <p className="text-xs text-blue-300">
              Provide your own OpenAI API key to enable AI-powered legal assistance. Your key is
              stored securely and never shared.
            </p>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
            >
              Get API Key from OpenAI
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Current Configuration Status */}
      {hasConfigured && maskedApiKey && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-xs font-medium text-green-200">API Key Configured</p>
                <p className="text-xs text-green-300 font-mono">{maskedApiKey}</p>
              </div>
            </div>
            <button
              onClick={() => void handleClearConfiguration()}
              className="px-3 py-1.5 text-xs text-red-300 hover:text-red-200 font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* API Key Input */}
      <div>
        <label className="block text-xs font-medium text-white mb-1">
          OpenAI API Key <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 pr-10 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-3 focus:ring-blue-500 font-mono"
            placeholder="sk-proj-••••••••••••••••••••••••••••••••"
            disabled={isSaving}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700/50 rounded transition-colors"
            title={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            {showApiKey ? (
              <EyeOff className="w-4 h-4 text-slate-300" />
            ) : (
              <Eye className="w-4 h-4 text-slate-300" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-300 mt-1">
          Get your API key from{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            platform.openai.com/api-keys
          </a>
        </p>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-xs font-medium text-white mb-1">
          Model <span className="text-red-400">*</span>
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo')}
          className="w-full px-3 py-2 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
          disabled={isSaving}
        >
          <option value="gpt-4o">GPT-4o (Recommended - Most capable)</option>
          <option value="gpt-4o-mini">GPT-4o Mini (Faster, lower cost)</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Lowest cost)</option>
        </select>
        <p className="text-xs text-slate-300 mt-1">
          GPT-4o provides the best quality for legal assistance. See{' '}
          <a
            href="https://openai.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            pricing details
          </a>
        </p>
      </div>

      {/* Organization ID (Optional) */}
      <div>
        <label className="block text-xs font-medium text-white mb-1">
          Organization ID <span className="text-slate-300">(Optional)</span>
        </label>
        <input
          type="text"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-slate-800/50 border border-blue-700/30 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-3 focus:ring-blue-500 font-mono"
          placeholder="org-••••••••••••••••••••••••"
          disabled={isSaving}
        />
        <p className="text-xs text-slate-300 mt-1">
          Only needed if your API key belongs to an organization
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-slate-800/50 border border-blue-700/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div>
            <p className="text-xs font-medium text-white">Connection Status</p>
            <p className={`text-xs ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => void handleTestConnection()}
          disabled={!apiKey || isSaving || connectionStatus === 'testing'}
          className="flex-1 px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {connectionStatus === 'testing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              Test Connection
            </>
          )}
        </button>

        <button
          onClick={() => void handleSaveConfiguration()}
          disabled={!apiKey || isSaving}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Save Configuration
            </>
          )}
        </button>
      </div>

      {/* Pricing Information */}
      <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-amber-200 mb-1">
              <strong>Pay-Per-Use Model</strong>
            </p>
            <p className="text-xs text-amber-300">
              OpenAI charges based on usage (tokens processed). Typical cost for legal Q&A is
              $1-6/month. You control spending via OpenAI's usage dashboard.
            </p>
            <a
              href="https://openai.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-2 transition-colors"
            >
              View Pricing Details
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Brain className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-slate-300">
              <strong>Security:</strong> Your API key is encrypted using OS-native encryption
              (Windows DPAPI, macOS Keychain, Linux libsecret) and stored securely on your device.
              It's never sent to any server except OpenAI's official API. Always keep your API key
              confidential.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
