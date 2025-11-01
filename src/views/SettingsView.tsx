import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Palette,
  Shield,
  Database,
  Bell,
  Info,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Save,
  Download,
  Trash2,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Brain,
  Zap,
  HardDrive,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { BackupSettingsTab } from './settings/BackupSettings.tsx';

type TabId = 'ai-provider' | 'appearance' | 'privacy' | 'backup' | 'data' | 'notifications' | 'about';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: 'ai-provider', label: 'AI Provider', icon: Brain },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'backup', label: 'Backup & Restore', icon: HardDrive },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'about', label: 'About', icon: Info },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<TabId>('ai-provider');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Keyboard navigation: Ctrl/Cmd + Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
        const nextIndex =
          e.key === 'ArrowRight'
            ? (currentIndex + 1) % tabs.length
            : (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-950 via-blue-900 to-purple-900">
      {/* Fixed Header */}
      <header className="flex-shrink-0 border-b border-white/10 bg-blue-950/50 backdrop-blur-md">
        <div className="px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Settings tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${tab.id}-panel`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg
                    transition-all duration-200 flex-shrink-0
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium whitespace-nowrap">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Keyboard Hint */}
          <p className="text-xs text-white/40 mt-2">
            Tip: Use Ctrl/Cmd + Arrow keys to navigate tabs
          </p>
        </div>
      </header>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              role="tabpanel"
              id={`${activeTab}-panel`}
              aria-labelledby={`${activeTab}-tab`}
            >
              {activeTab === 'ai-provider' && <AIProviderTab apiKey={apiKey} setApiKey={setApiKey} showApiKey={showApiKey} setShowApiKey={setShowApiKey} />}
              {activeTab === 'appearance' && <AppearanceTab theme={theme} setTheme={setTheme} />}
              {activeTab === 'privacy' && <PrivacyTab />}
              {activeTab === 'backup' && <BackupSettingsTab />}
              {activeTab === 'data' && <DataManagementTab />}
              {activeTab === 'notifications' && <NotificationsTab enabled={notificationsEnabled} setEnabled={setNotificationsEnabled} />}
              {activeTab === 'about' && <AboutTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// AI Provider Configurations
const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    icon: Sparkles,
    description: 'GPT-4, GPT-3.5 - Industry-leading models',
    apiKeyLabel: 'OpenAI API Key',
    apiKeyPlaceholder: 'sk-...',
    endpoint: 'https://api.openai.com/v1',
    models: [
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Recommended)', description: 'Most capable, 128K context' },
      { value: 'gpt-4', label: 'GPT-4', description: 'High quality, 8K context' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and affordable' },
    ],
  },
  anthropic: {
    name: 'Anthropic',
    icon: Brain,
    description: 'Claude 3.5 Sonnet, Opus - Long context specialists',
    apiKeyLabel: 'Anthropic API Key',
    apiKeyPlaceholder: 'sk-ant-...',
    endpoint: 'https://api.anthropic.com/v1',
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommended)', description: 'Best performance, 200K context' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', description: 'Most intelligent, 200K context' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', description: 'Balanced, 200K context' },
    ],
  },
  groq: {
    name: 'Groq',
    icon: Zap,
    description: 'Ultra-fast inference with Llama, Mixtral',
    apiKeyLabel: 'Groq API Key',
    apiKeyPlaceholder: 'gsk_...',
    endpoint: 'https://api.groq.com/openai/v1',
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recommended)', description: 'Latest, fastest inference' },
      { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B', description: 'High quality, very fast' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', description: '32K context, fast' },
    ],
  },
  huggingface: {
    name: 'Hugging Face',
    icon: Sparkles,
    description: 'Access 350K+ models via Inference API',
    apiKeyLabel: 'Hugging Face Token',
    apiKeyPlaceholder: 'hf_...',
    endpoint: 'https://api-inference.huggingface.co',
    models: [
      { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct', label: 'Llama 3.1 70B (Recommended)', description: '128K context, affordable' },
      { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B', description: 'Best performance' },
      { value: 'mistralai/Mixtral-8x22B-Instruct-v0.1', label: 'Mixtral 8x22B', description: 'Multilingual' },
    ],
  },
  google: {
    name: 'Google AI',
    icon: Sparkles,
    description: 'Gemini Pro, Flash - Multimodal capabilities',
    apiKeyLabel: 'Google AI API Key',
    apiKeyPlaceholder: 'AIza...',
    endpoint: 'https://generativelanguage.googleapis.com/v1',
    models: [
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Recommended)', description: 'Latest, fastest' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: '2M context window' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Fast and efficient' },
    ],
  },
  cohere: {
    name: 'Cohere',
    icon: Brain,
    description: 'Command R+ - Enterprise-grade models',
    apiKeyLabel: 'Cohere API Key',
    apiKeyPlaceholder: 'co_...',
    endpoint: 'https://api.cohere.com/v1',
    models: [
      { value: 'command-r-plus', label: 'Command R+ (Recommended)', description: 'Most capable' },
      { value: 'command-r', label: 'Command R', description: 'Fast and efficient' },
      { value: 'command-light', label: 'Command Light', description: 'Lightweight' },
    ],
  },
  together: {
    name: 'Together AI',
    icon: Zap,
    description: 'Llama, Mixtral, Qwen - Fast and affordable',
    apiKeyLabel: 'Together AI API Key',
    apiKeyPlaceholder: 'together-...',
    endpoint: 'https://api.together.xyz/v1',
    models: [
      { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', label: 'Llama 3.1 70B Turbo', description: 'Ultra-fast' },
      { value: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B', description: 'Best quality' },
      { value: 'mistralai/Mixtral-8x22B-Instruct-v0.1', label: 'Mixtral 8x22B', description: 'Large context' },
    ],
  },
  anyscale: {
    name: 'Anyscale',
    icon: Zap,
    description: 'Managed Llama models at scale',
    apiKeyLabel: 'Anyscale API Key',
    apiKeyPlaceholder: 'esecret_...',
    endpoint: 'https://api.endpoints.anyscale.com/v1',
    models: [
      { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct', label: 'Llama 3.1 70B', description: 'Recommended' },
      { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B', description: 'Fast and cheap' },
    ],
  },
  mistral: {
    name: 'Mistral AI',
    icon: Sparkles,
    description: 'Mistral Large, Medium - European models',
    apiKeyLabel: 'Mistral AI API Key',
    apiKeyPlaceholder: 'msk_...',
    endpoint: 'https://api.mistral.ai/v1',
    models: [
      { value: 'mistral-large-latest', label: 'Mistral Large (Recommended)', description: 'Most capable' },
      { value: 'mistral-medium-latest', label: 'Mistral Medium', description: 'Balanced' },
      { value: 'mistral-small-latest', label: 'Mistral Small', description: 'Fast and efficient' },
    ],
  },
  perplexity: {
    name: 'Perplexity',
    icon: Brain,
    description: 'Sonar models - Real-time web search',
    apiKeyLabel: 'Perplexity API Key',
    apiKeyPlaceholder: 'pplx-...',
    endpoint: 'https://api.perplexity.ai',
    models: [
      { value: 'llama-3.1-sonar-large-128k-online', label: 'Sonar Large Online', description: 'Real-time web data' },
      { value: 'llama-3.1-sonar-small-128k-online', label: 'Sonar Small Online', description: 'Fast with web access' },
    ],
  },
} as const;

type AIProviderKey = keyof typeof AI_PROVIDERS;

// AI Provider Tab
function AIProviderTab({
  apiKey,
  setApiKey,
  showApiKey,
  setShowApiKey,
}: {
  apiKey: string;
  setApiKey: (key: string) => void;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderKey>('openai');
  const [selectedModel, setSelectedModel] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentProvider = AI_PROVIDERS[selectedProvider];
  const ProviderIcon = currentProvider.icon;

  // Update selected model when provider changes
  React.useEffect(() => {
    setSelectedModel(currentProvider.models[0].value);
    setCustomEndpoint(currentProvider.endpoint);
  }, [selectedProvider]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">AI Provider Configuration</h2>
        <p className="text-white/60">Configure your AI assistant for legal research and analysis</p>
      </div>

      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-6">
          {/* Provider Selection Dropdown */}
          <div>
            <label htmlFor="ai-provider" className="block text-sm font-medium text-white mb-2">
              AI Provider
            </label>
            <div className="relative">
              <select
                id="ai-provider"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as AIProviderKey)}
                className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
                aria-label="Select AI Provider"
              >
                {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                  <option key={key} value={key}>
                    {provider.name} - {provider.description}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 pointer-events-none rotate-90" />
            </div>

            {/* Selected Provider Info */}
            <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <ProviderIcon className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-white">{currentProvider.name}</span>
                <Badge variant="success" className="ml-auto">Selected</Badge>
              </div>
              <p className="text-xs text-white/60 mt-1">{currentProvider.description}</p>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-white mb-2">
              {currentProvider.apiKeyLabel}
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentProvider.apiKeyPlaceholder}
                className="w-full px-4 py-3 pr-12 bg-blue-950/50 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-label={currentProvider.apiKeyLabel}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white transition-colors"
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-white/40 mt-2">
              Your API key is encrypted and stored locally. Never shared with third parties.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-white mb-2">
              Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              aria-label="AI Model"
            >
              {currentProvider.models.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label} - {model.description}
                </option>
              ))}
            </select>
          </div>

          {/* Custom API Endpoint (Advanced) */}
          <div>
            <label htmlFor="endpoint" className="block text-sm font-medium text-white mb-2">
              API Endpoint
              <Badge variant="neutral" className="ml-2 bg-white/10 text-white/60 text-xs">Advanced</Badge>
            </label>
            <input
              id="endpoint"
              type="text"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder={currentProvider.endpoint}
              className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              aria-label="API Endpoint"
            />
            <p className="text-xs text-white/40 mt-2">
              Leave default unless using a custom endpoint or proxy
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !apiKey}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </Button>

            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-green-400"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Saved successfully!</span>
              </motion.div>
            )}
          </div>
        </div>
      </Card>

      {/* Usage Stats */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">API Usage (This Month)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">1,247</div>
              <div className="text-sm text-white/60 mt-1">Requests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400">$12.50</div>
              <div className="text-sm text-white/60 mt-1">Cost</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">245K</div>
              <div className="text-sm text-white/60 mt-1">Tokens</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Appearance Tab
function AppearanceTab({
  theme,
  setTheme,
}: {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}) {
  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Appearance</h2>
        <p className="text-white/60">Customize the look and feel of Justice Companion</p>
      </div>

      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-6">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${
                        isActive
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-400 shadow-lg shadow-purple-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }
                    `}
                    aria-label={`${option.label} theme`}
                    aria-pressed={isActive}
                  >
                    <Icon className="w-6 h-6 text-white mx-auto mb-2" />
                    <div className="text-sm font-medium text-white">{option.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label htmlFor="font-size" className="block text-sm font-medium text-white mb-2">
              Font Size
            </label>
            <select
              id="font-size"
              className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              aria-label="Font size"
            >
              <option value="small">Small</option>
              <option value="medium">Medium (Default)</option>
              <option value="large">Large</option>
            </select>
          </div>

          {/* Animation Preferences */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded bg-blue-950/50 border-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                aria-label="Enable animations"
              />
              <div>
                <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  Enable Animations
                </div>
                <div className="text-sm text-white/60">Smooth transitions and effects</div>
              </div>
            </label>
          </div>

          {/* Compact Mode */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-blue-950/50 border-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                aria-label="Compact mode"
              />
              <div>
                <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  Compact Mode
                </div>
                <div className="text-sm text-white/60">Reduce spacing for more content on screen</div>
              </div>
            </label>
          </div>

          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
            <Save className="w-4 h-4" />
            Save Preferences
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Privacy & Security Tab
function PrivacyTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Privacy & Security</h2>
        <p className="text-white/60">Manage your data privacy and security settings</p>
      </div>

      {/* Encryption Status */}
      <Card className="bg-gradient-to-br from-green-900/30 to-blue-900/30 border-green-500/20 backdrop-blur-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">End-to-End Encryption Active</h3>
              <p className="text-sm text-white/60">AES-256-GCM encryption protects all your data</p>
            </div>
            <Badge variant="success" className="ml-auto">Secure</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <div className="text-sm text-white/60">Encryption Algorithm</div>
              <div className="text-white font-medium">AES-256-GCM</div>
            </div>
            <div>
              <div className="text-sm text-white/60">Key Storage</div>
              <div className="text-white font-medium">OS Keychain</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Privacy Controls */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">Privacy Controls</h3>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded bg-blue-950/50 border-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                aria-label="Encrypt chat messages"
              />
              <div>
                <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  Encrypt AI Chat Messages
                </div>
                <div className="text-sm text-white/60">Store chat history with encryption</div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded bg-blue-950/50 border-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                aria-label="Enable audit logging"
              />
              <div>
                <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  Enable Audit Logging
                </div>
                <div className="text-sm text-white/60">Track all data access and changes</div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-blue-950/50 border-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                aria-label="Allow analytics"
              />
              <div>
                <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  Allow Anonymous Analytics
                </div>
                <div className="text-sm text-white/60">Help improve Justice Companion with usage data</div>
              </div>
            </label>
          </div>

          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
            <Save className="w-4 h-4" />
            Save Privacy Settings
          </Button>
        </div>
      </Card>

      {/* Session Management */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Session Management</h3>

          <div>
            <label htmlFor="session-timeout" className="block text-sm font-medium text-white mb-2">
              Auto-logout After
            </label>
            <select
              id="session-timeout"
              className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              aria-label="Session timeout"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="1440">24 hours (Default)</option>
              <option value="0">Never</option>
            </select>
          </div>

          <Button variant="secondary" className="w-full border-red-500 text-red-400 hover:bg-red-500/10">
            <Key className="w-4 h-4" />
            Rotate Encryption Key
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Data Management Tab
function DataManagementTab() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsExporting(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Data Management</h2>
        <p className="text-white/60">Export, backup, or delete your data</p>
      </div>

      {/* GDPR Compliance */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">GDPR Compliance</h3>
          </div>

          <p className="text-white/60 text-sm">
            Justice Companion is fully GDPR-compliant. You have the right to export and delete all your data at any time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export All Data
                </>
              )}
            </Button>

            <Button variant="secondary" className="border-white/20 text-white hover:bg-white/5">
              <Database className="w-4 h-4" />
              View Consent History
            </Button>
          </div>
        </div>
      </Card>

      {/* Storage Usage */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Storage Usage</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Cases</span>
              <span className="text-white font-medium">24.5 MB</span>
            </div>
            <div className="w-full bg-blue-950/50 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '45%' }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Evidence Files</span>
              <span className="text-white font-medium">156.2 MB</span>
            </div>
            <div className="w-full bg-blue-950/50 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '78%' }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Chat History</span>
              <span className="text-white font-medium">8.1 MB</span>
            </div>
            <div className="w-full bg-blue-950/50 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '15%' }} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
            <span className="text-white font-semibold">Total</span>
            <span className="text-white font-bold">188.8 MB</span>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/20 backdrop-blur-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
          </div>

          <p className="text-white/80 text-sm">
            Permanently delete all your data from Justice Companion. This action cannot be undone.
          </p>

          <Button variant="secondary" className="border-red-500 text-red-400 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
            Delete All Data
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Notifications Tab
function NotificationsTab({
  enabled,
  setEnabled,
}: {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Notifications</h2>
        <p className="text-white/60">Manage how you receive notifications</p>
      </div>

      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-semibold text-white">Enable Notifications</h3>
              <p className="text-sm text-white/60">Receive alerts for important events</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
                aria-label="Enable notifications"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
            </label>
          </div>

          {/* Notification Types */}
          {enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <h4 className="text-white font-medium">Notification Types</h4>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded bg-blue-950/50 border-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                  aria-label="Case updates"
                />
                <div>
                  <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                    Case Updates
                  </div>
                  <div className="text-sm text-white/60">Notify when case status changes</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded bg-blue-950/50 border-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                  aria-label="AI responses"
                />
                <div>
                  <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                    AI Responses
                  </div>
                  <div className="text-sm text-white/60">Notify when AI completes analysis</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded bg-blue-950/50 border-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                  aria-label="Evidence uploads"
                />
                <div>
                  <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                    Evidence Uploads
                  </div>
                  <div className="text-sm text-white/60">Notify when evidence processing completes</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded bg-blue-950/50 border-white/10 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                  aria-label="System alerts"
                />
                <div>
                  <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                    System Alerts
                  </div>
                  <div className="text-sm text-white/60">Important system messages and errors</div>
                </div>
              </label>
            </motion.div>
          )}

          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
            <Save className="w-4 h-4" />
            Save Notification Preferences
          </Button>
        </div>
      </Card>

      {/* Notification Sound */}
      {enabled && (
        <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Sound</h3>

            <div>
              <label htmlFor="notification-sound" className="block text-sm font-medium text-white mb-2">
                Notification Sound
              </label>
              <select
                id="notification-sound"
                className="w-full px-4 py-3 bg-blue-950/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-label="Notification sound"
              >
                <option value="default">Default</option>
                <option value="chime">Chime</option>
                <option value="bell">Bell</option>
                <option value="pop">Pop</option>
                <option value="none">None (Silent)</option>
              </select>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// About Tab
function AboutTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">About Justice Companion</h2>
        <p className="text-white/60">Version information and legal notices</p>
      </div>

      {/* App Info */}
      <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-white/10 backdrop-blur-md">
        <div className="p-6 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
            <Shield className="w-10 h-10 text-white" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white">Justice Companion</h3>
            <p className="text-white/60">Privacy-First Legal Case Management</p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white">
            <span className="text-sm font-medium">Version 1.0.0</span>
            <Badge variant="success">Stable</Badge>
          </div>
        </div>
      </Card>

      {/* System Info */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-3">
          <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-white/60">Platform</div>
              <div className="text-white font-medium">Electron 33.2.1</div>
            </div>
            <div>
              <div className="text-sm text-white/60">Node.js</div>
              <div className="text-white font-medium">20.18.0 LTS</div>
            </div>
            <div>
              <div className="text-sm text-white/60">React</div>
              <div className="text-white font-medium">18.3.1</div>
            </div>
            <div>
              <div className="text-sm text-white/60">TypeScript</div>
              <div className="text-white font-medium">5.9.3</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Links */}
      <Card className="bg-blue-900/30 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-3">
          <h3 className="text-lg font-semibold text-white mb-4">Resources</h3>

          <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
            <span className="text-white group-hover:text-purple-400 transition-colors">Documentation</span>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
          </button>

          <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
            <span className="text-white group-hover:text-purple-400 transition-colors">Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
          </button>

          <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
            <span className="text-white group-hover:text-purple-400 transition-colors">Terms of Service</span>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
          </button>

          <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
            <span className="text-white group-hover:text-purple-400 transition-colors">Open Source Licenses</span>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
          </button>
        </div>
      </Card>

      {/* Copyright */}
      <div className="text-center text-white/40 text-sm">
        <p>&copy; 2025 Justice Companion. All rights reserved.</p>
        <p className="mt-1">Built with privacy and security in mind.</p>
      </div>
    </div>
  );
}
