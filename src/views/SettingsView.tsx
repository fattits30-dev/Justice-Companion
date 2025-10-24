import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.tsx";

/**
 * SettingsView - Universal AI Provider Configuration
 *
 * Supports: OpenAI, Groq, Anthropic, Google, Cohere, Mistral
 *
 * People-friendly. No corporate BS.
 */

type AIProvider =
  | "openai"
  | "groq"
  | "anthropic"
  | "google"
  | "cohere"
  | "mistral";

interface ProviderConfig {
  name: string;
  description: string;
  requiresOrganization?: boolean;
  defaultModel: string;
  models: string[];
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  docsUrl: string;
}

const PROVIDERS: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    description: "GPT-4, GPT-3.5, and DALL-E models",
    requiresOrganization: true,
    defaultModel: "gpt-4-turbo-preview",
    models: [
      "gpt-4-turbo-preview",
      "gpt-4",
      "gpt-3.5-turbo",
      "gpt-3.5-turbo-16k",
    ],
    apiKeyLabel: "OpenAI API Key",
    apiKeyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  groq: {
    name: "Groq",
    description: "Fast inference with Llama, Mixtral, and Gemma models",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma-7b-it",
    ],
    apiKeyLabel: "Groq API Key",
    apiKeyPlaceholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude 3 models (Opus, Sonnet, Haiku)",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ],
    apiKeyLabel: "Anthropic API Key",
    apiKeyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    name: "Google AI",
    description: "Gemini models",
    defaultModel: "gemini-pro",
    models: ["gemini-pro", "gemini-pro-vision"],
    apiKeyLabel: "Google AI API Key",
    apiKeyPlaceholder: "AIza...",
    docsUrl: "https://makersuite.google.com/app/apikey",
  },
  cohere: {
    name: "Cohere",
    description: "Command and Embed models",
    defaultModel: "command",
    models: ["command", "command-light", "command-nightly"],
    apiKeyLabel: "Cohere API Key",
    apiKeyPlaceholder: "cohere-...",
    docsUrl: "https://dashboard.cohere.com/api-keys",
  },
  mistral: {
    name: "Mistral AI",
    description: "Mistral and Mixtral models",
    defaultModel: "mistral-medium",
    models: ["mistral-medium", "mistral-small", "mistral-tiny"],
    apiKeyLabel: "Mistral API Key",
    apiKeyPlaceholder: "mistral-...",
    docsUrl: "https://console.mistral.ai/api-keys",
  },
};

export function SettingsView() {
  const { user } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("groq");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [organization, setOrganization] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [testMessage, setTestMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const currentProvider = PROVIDERS[selectedProvider];

  // Load saved configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Check if API key exists in SecureStorage
        const hasKey = await window.justiceAPI.secureStorageHas(
          `${selectedProvider}_api_key`,
        );
        if (hasKey.success && hasKey.data) {
          setApiKey("••••••••••••••••"); // Show masked value
        } else {
          setApiKey("");
        }

        // Load model
        const modelResult = await window.justiceAPI.secureStorageGet(
          `${selectedProvider}_model`,
        );
        if (modelResult.success && modelResult.data) {
          setModel(modelResult.data);
        } else {
          setModel(currentProvider.defaultModel);
        }

        // Load organization (OpenAI only)
        if (currentProvider.requiresOrganization) {
          const orgResult = await window.justiceAPI.secureStorageGet(
            `${selectedProvider}_organization`,
          );
          if (orgResult.success && orgResult.data) {
            setOrganization(orgResult.data);
          }
        }
      } catch (error) {
        console.error("[SettingsView] Failed to load config:", error);
      }
    };

    loadConfig();
  }, [selectedProvider, currentProvider]);

  const handleSave = async () => {
    setSaveMessage(null);
    setIsSaving(true);

    try {
      // Validate API key
      if (!apiKey || apiKey === "••••••••••••••••") {
        throw new Error("Please enter a valid API key");
      }

      // Call ai:configure IPC
      const result = await window.justiceAPI.configureAI({
        apiKey,
        provider: selectedProvider,
        model,
        organization: organization || undefined,
      });

      if (result.success) {
        setSaveMessage({
          type: "success",
          text: `${currentProvider.name} API key saved!`,
        });
        setApiKey("••••••••••••••••"); // Mask the key
      } else {
        throw new Error(result.error || "Failed to save configuration");
      }
    } catch (error) {
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save API key",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setTestMessage(null);
    setIsTesting(true);

    try {
      // TODO: Implement ai:testConnection IPC handler
      // For now, just check if key exists
      const hasKey = await window.justiceAPI.secureStorageHas(
        `${selectedProvider}_api_key`,
      );

      if (hasKey.success && hasKey.data) {
        setTestMessage({ type: "success", text: "API key is configured!" });
      } else {
        setTestMessage({
          type: "error",
          text: "No API key configured. Save your key first.",
        });
      }
    } catch (error) {
      setTestMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Configure your AI assistant</p>
        </div>

        {/* People-friendly reminder */}
        <div className="mb-8 bg-primary-900/30 border-l-4 border-primary-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-primary-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold text-primary-200 mb-1">
                Your API keys stay private
              </p>
              <p className="text-sm text-primary-100/80">
                All API keys are encrypted and stored locally on YOUR computer.
                We don't send them anywhere except to the AI provider you
                choose.
              </p>
            </div>
          </div>
        </div>

        {/* AI Provider Selection */}
        <div className="bg-primary-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Choose Your AI Provider
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {(Object.keys(PROVIDERS) as AIProvider[]).map((provider) => {
              const config = PROVIDERS[provider];
              const isSelected = selectedProvider === provider;

              return (
                <button
                  key={provider}
                  onClick={() => setSelectedProvider(provider)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? "border-primary-500 bg-primary-500/20"
                      : "border-gray-700 bg-primary-900 hover:border-gray-600"
                  }`}
                >
                  <div className="font-semibold mb-1">{config.name}</div>
                  <div className="text-sm text-gray-400">
                    {config.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* API Key Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {currentProvider.apiKeyLabel}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentProvider.apiKeyPlaceholder}
                className="w-full bg-primary-900 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                Get your API key from{" "}
                <a
                  href={currentProvider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 underline"
                >
                  {currentProvider.name} dashboard
                </a>
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-primary-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary-500"
              >
                {currentProvider.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Organization (OpenAI only) */}
            {currentProvider.requiresOrganization && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Organization ID (Optional)
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="org-..."
                  className="w-full bg-primary-900 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>
            )}

            {/* Save Message */}
            {saveMessage && (
              <div
                className={`p-3 rounded-lg ${
                  saveMessage.type === "success"
                    ? "bg-green-900/30 border border-green-700 text-green-200"
                    : "bg-red-900/30 border border-red-700 text-red-200"
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            {/* Test Message */}
            {testMessage && (
              <div
                className={`p-3 rounded-lg ${
                  testMessage.type === "success"
                    ? "bg-green-900/30 border border-green-700 text-green-200"
                    : "bg-red-900/30 border border-red-700 text-red-200"
                }`}
              >
                {testMessage.text}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {isSaving ? "Saving..." : "Save Configuration"}
              </button>
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="px-6 py-3 bg-primary-700 hover:bg-primary-600 disabled:bg-primary-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {isTesting ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Settings (Future) */}
        <div className="bg-primary-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={user?.username || ""}
                disabled
                className="w-full bg-primary-900 border border-gray-700 rounded-lg p-3 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full bg-primary-900 border border-gray-700 rounded-lg p-3 text-gray-500 cursor-not-allowed"
              />
            </div>
            <p className="text-sm text-gray-500">Profile updates coming soon</p>
          </div>
        </div>

        {/* About */}
        <div className="bg-primary-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">
            About Justice Companion
          </h2>
          <p className="text-gray-400 mb-4">
            Justice Companion helps you organize your legal case and understand
            UK employment law. It's built for real people dealing with real
            problems—not lawyers in fancy suits.
          </p>
          <p className="text-sm text-gray-500">
            Version 1.0.0 • Built with privacy first • All your data stays on
            YOUR computer
          </p>
        </div>
      </div>
    </div>
  );
}
