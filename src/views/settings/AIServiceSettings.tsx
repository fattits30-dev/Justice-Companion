/**
 * AI Service Settings Tab
 * =======================
 * Configure AI providers (HuggingFace, OpenAI, Ollama, etc.)
 */

import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Cpu,
  Info,
  Key,
  Play,
  RefreshCw,
  Save,
  Server,
  Settings,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { apiClient } from "../../lib/apiClient.ts";

// Types
interface ProviderMetadata {
  name: string;
  description?: string;
  default_model: string;
  available_models: string[];
  requires_api_key?: boolean;
  supports_streaming: boolean;
  default_endpoint: string;
}

export function AIServiceSettingsTab() {
  const [providers, setProviders] = useState<Record<string, ProviderMetadata>>(
    {}
  );
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [endpoint, setEndpoint] = useState("");

  // Status state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Feedback state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load data callback
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load providers metadata
      const providersRes = await apiClient.aiConfig.listProviders();
      if (providersRes.success && providersRes.data) {
        setProviders(providersRes.data);

        // Set default selected provider if none selected
        if (!selectedProvider) {
          const providerKeys = Object.keys(providersRes.data);
          if (providerKeys.length > 0) {
            // Prefer active provider if known, otherwise first one
            setSelectedProvider(providerKeys[0]);
          }
        }
      }

      // Load active provider
      const activeRes = await apiClient.aiConfig.getActive();
      if (activeRes.success && activeRes.data) {
        setActiveProvider(activeRes.data.provider);
        if (!selectedProvider) {
          setSelectedProvider(activeRes.data.provider);
        }
      }
    } catch (err) {
      console.error("Failed to load AI settings:", err);
      setError("Failed to load AI settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedProvider]);

  // Load provider config callback
  const loadProviderConfig = useCallback(async (provider: string) => {
    try {
      const res = await apiClient.aiConfig.get(provider);
      if (res.success && res.data) {
        const requiresKey = providers[provider]?.requires_api_key !== false;
        setApiKey(requiresKey ? res.data.api_key || "" : "");
        setModel(res.data.model || providers[provider].default_model);
        setEndpoint(
          res.data.endpoint || providers[provider].default_endpoint || ""
        );
      } else {
        // Defaults
        const requiresKey = providers[provider]?.requires_api_key !== false;
        setApiKey(requiresKey ? "" : "");
        setModel(providers[provider].default_model);
        setEndpoint(providers[provider].default_endpoint || "");
      }
    } catch (err) {
      console.error(`Failed to load config for ${provider}:`, err);
      // Fallback to defaults
      setApiKey("");
      setModel(providers[provider]?.default_model || "");
      setEndpoint(providers[provider]?.default_endpoint || "");
    }
  }, [providers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When selected provider changes, update form fields
  useEffect(() => {
    if (selectedProvider && providers[selectedProvider]) {
      loadProviderConfig(selectedProvider);
    }
  }, [selectedProvider, providers, loadProviderConfig]);

  const handleSave = async () => {
    if (!selectedProvider) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const requiresKey = currentProviderMeta?.requires_api_key !== false;
      const payload: {
        api_key?: string;
        model: string;
        endpoint?: string;
        enabled: boolean;
      } = {
        model: model,
        endpoint: endpoint || undefined,
        enabled: true,
      };

      if (requiresKey) {
        payload.api_key = apiKey;
      }

      const res = await apiClient.aiConfig.configure(selectedProvider, payload);

      if (res.success) {
        setSuccessMessage("Settings saved successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error?.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError("An error occurred while saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedProvider) {
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // First save current settings to ensure we test what's in the form
      await handleSave();

      const res = await apiClient.aiConfig.test(selectedProvider);
      setTestResult({
        success: res.success,
        message: res.success
          ? "Connection successful!"
          : (typeof res.error === "string" ? res.error : res.error?.message) || "Connection failed",
      });
    } catch (err) {
      console.error("Test failed:", err);
      setTestResult({
        success: false,
        message: "Test request failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedProvider) {
      return;
    }

    setIsActivating(true);
    try {
      const res = await apiClient.aiConfig.activate(selectedProvider);
      if (res.success) {
        setActiveProvider(selectedProvider);
        setSuccessMessage(`Activated ${providers[selectedProvider].name}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(res.error?.message || "Failed to activate provider");
      }
    } catch (err) {
      console.error("Activation failed:", err);
      setError("An error occurred while activating provider");
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading && Object.keys(providers).length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  const currentProviderMeta = selectedProvider
    ? providers[selectedProvider]
    : null;

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          AI Provider Settings
        </h2>
        <p className="text-white/60">
          Configure and switch between different AI providers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Provider List */}
        <div className="md:col-span-1 space-y-2">
          {Object.entries(providers).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setSelectedProvider(key)}
              className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                selectedProvider === key
                  ? "bg-purple-500/20 border-purple-500 text-white"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="font-medium">{meta.name}</span>
              {activeProvider === key && (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              )}
            </button>
          ))}
        </div>

        {/* Configuration Area */}
        <div className="md:col-span-3 space-y-6">
          {currentProviderMeta ? (
            <>
              <Card className="bg-white/5 border-white/10 backdrop-blur-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Brain className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {currentProviderMeta.name}
                      </h3>
                      <p className="text-sm text-white/60">
                        {currentProviderMeta.description}
                      </p>
                    </div>
                  </div>

                  {activeProvider === selectedProvider ? (
                    <Badge
                      variant="success"
                      className="bg-green-500/20 text-green-400 border-green-500/30"
                    >
                      Active Provider
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleActivate}
                      disabled={isActivating}
                      className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    >
                      {isActivating ? "Activating..." : "Set as Active"}
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* API Key Field */}
                  {currentProviderMeta.requires_api_key !== false && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          API Key
                        </label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={`Enter your ${currentProviderMeta.name} API Key`}
                          className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-mono text-sm"
                        />
                      </div>
                    )}

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Model
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        list="model-options"
                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-mono text-sm"
                      />
                      <datalist id="model-options">
                        {currentProviderMeta.available_models.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>
                    <p className="text-xs text-white/40">
                      Default: {currentProviderMeta.default_model}
                    </p>
                  </div>

                  {/* Endpoint Configuration (for Ollama/Custom) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      API Endpoint{" "}
                      {selectedProvider !== "ollama" && "(Optional)"}
                    </label>
                    <input
                      type="text"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder={
                        currentProviderMeta.default_endpoint ||
                        "https://api.example.com/v1"
                      }
                      className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-mono text-sm"
                    />
                    {selectedProvider === "ollama" && (
                      <p className="text-xs text-white/40">
                        Usually http://localhost:11434/v1 for local Ollama
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Settings
                    </Button>

                    <Button
                      onClick={handleTest}
                      disabled={isTesting}
                      variant="secondary"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      {isTesting ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                  </div>

                  {/* Feedback Messages */}
                  {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-200 text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {successMessage}
                    </div>
                  )}

                  {testResult && (
                    <div
                      className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                        testResult.success
                          ? "bg-blue-500/20 border border-blue-500/30 text-blue-200"
                          : "bg-red-500/20 border border-red-500/30 text-red-200"
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0" />
                      )}
                      {testResult.message}
                    </div>
                  )}
                </div>
              </Card>

              {/* Info Card */}
              <Card className="bg-blue-500/10 border-blue-500/20 p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-200 font-medium mb-1">
                      Provider Information
                    </p>
                    <p className="text-blue-200/70">
                      {selectedProvider === "ollama"
                        ? "Ollama runs locally on your machine. Ensure Ollama is running and accessible."
                        : "API keys are stored securely using encryption. Your keys never leave your device except to communicate with the provider."}
                    </p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-white/40">
              <Settings className="w-12 h-12 mb-4 opacity-50" />
              <p>Select a provider to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}