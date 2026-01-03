/**
 * LocalSettingsView - Settings for Local-First Mode
 *
 * Includes:
 * - AI Provider configuration (API key input)
 * - Export/Import functionality
 * - PIN management
 * - Theme settings
 * - Data management
 */

import {
  AlertTriangle,
  Brain,
  Check,
  Download,
  HardDrive,
  Info,
  Key,
  Lock,
  Moon,
  Palette,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useLocalAuth } from "../contexts/LocalAuthContext";
import {
  downloadBackup,
  importFromFile,
  getBackupInfo,
  deleteAllData,
  getStorageEstimate,
} from "../lib/storage";
import { getLocalApiClient } from "../lib/api/local";

type ThemeMode = "light" | "dark" | "system";

type TabId = "ai-provider" | "backup" | "security" | "appearance" | "about";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: "ai-provider", label: "AI Provider", icon: Brain },
  { id: "backup", label: "Backup & Restore", icon: HardDrive },
  { id: "security", label: "Security", icon: Lock },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "about", label: "About", icon: Info },
];

export function LocalSettingsView() {
  const [activeTab, setActiveTab] = useState<TabId>("ai-provider");
  const [theme, setTheme] = useState<ThemeMode>("dark");

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-gray-900/80 backdrop-blur-md">
        <div className="px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <Badge variant="info" className="ml-2">
              Local Mode
            </Badge>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2" role="tablist">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all shrink-0
                    ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50"
                        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-6 flex justify-center">
          <div className="w-full max-w-4xl">
            {activeTab === "ai-provider" && <AIProviderTab />}
            {activeTab === "backup" && <BackupTab />}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "appearance" && (
              <AppearanceTab theme={theme} setTheme={setTheme} />
            )}
            {activeTab === "about" && <AboutTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AI Provider Tab - Configure OpenAI/Anthropic API keys
 */
function AIProviderTab() {
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  // Load current config
  useEffect(() => {
    const loadConfig = async () => {
      const localApi = getLocalApiClient();
      const response = await localApi.settings.getAIConfig();
      if (response.success) {
        const activeProvider = response.data.activeProvider;
        if (activeProvider) {
          setProvider(activeProvider);
          setModel(
            activeProvider === "openai"
              ? response.data.openai.model
              : response.data.anthropic.model
          );
          setHasExistingKey(
            activeProvider === "openai"
              ? response.data.openai.hasApiKey
              : response.data.anthropic.hasApiKey
          );
        }
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);

    try {
      const localApi = getLocalApiClient();
      await localApi.settings.setAIConfig({
        provider,
        apiKey: apiKey || undefined,
        model,
        enabled: true,
      });
      setHasExistingKey(!!apiKey || hasExistingKey);
      setApiKey(""); // Clear the input after saving
      setTestResult({ success: true, message: "Configuration saved!" });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const localApi = getLocalApiClient();
      const response = await localApi.settings.testConnection(provider);

      if (response.success) {
        if (response.data.connected) {
          setTestResult({ success: true, message: "Connection successful!" });
        } else {
          setTestResult({
            success: false,
            message: response.data.error || "Connection failed",
          });
        }
      } else {
        setTestResult({
          success: false,
          message: response.error.message || "Connection failed",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const openaiModels = [
    { value: "gpt-4o-mini", label: "GPT-4o Mini (Recommended)" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ];

  const anthropicModels = [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (Recommended)" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku (Fast)" },
  ];

  const models = provider === "openai" ? openaiModels : anthropicModels;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">AI Provider</h2>
        <p className="text-white/60">
          Configure your AI provider for chat and analysis. Your API key is
          encrypted and stored locally.
        </p>
      </div>

      {/* Provider Selection */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Select Provider
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setProvider("openai");
                  setModel("gpt-4o-mini");
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  provider === "openai"
                    ? "bg-gradient-to-br from-green-600 to-green-700 border-green-400 shadow-lg"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="text-2xl mb-2">🤖</div>
                <div className="text-white font-medium">OpenAI</div>
                <div className="text-sm text-white/60">GPT-4o, GPT-4</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("anthropic");
                  setModel("claude-sonnet-4-20250514");
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  provider === "anthropic"
                    ? "bg-gradient-to-br from-orange-600 to-orange-700 border-orange-400 shadow-lg"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="text-2xl mb-2">🧠</div>
                <div className="text-white font-medium">Anthropic</div>
                <div className="text-sm text-white/60">Claude Sonnet, Haiku</div>
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label
              htmlFor="api-key"
              className="block text-sm font-medium text-white mb-2"
            >
              API Key
              {hasExistingKey && (
                <span className="ml-2 text-green-400">(Key saved)</span>
              )}
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasExistingKey
                    ? "Enter new key to replace existing"
                    : provider === "openai"
                      ? "sk-..."
                      : "sk-ant-..."
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                {showKey ? <X className="w-5 h-5" /> : <Key className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-2 text-sm text-white/50">
              Get your API key from{" "}
              <a
                href={
                  provider === "openai"
                    ? "https://platform.openai.com/api-keys"
                    : "https://console.anthropic.com/settings/keys"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                {provider === "openai" ? "OpenAI Dashboard" : "Anthropic Console"}
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label
              htmlFor="model"
              className="block text-sm font-medium text-white mb-2"
            >
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 [&>option]:text-gray-900 [&>option]:bg-white"
            >
              {models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 ${
                testResult.success
                  ? "bg-green-900/50 text-green-300 border border-green-700"
                  : "bg-red-900/50 text-red-300 border border-red-700"
              }`}
            >
              {testResult.success ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white flex-1"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Configuration
            </Button>

            <Button
              onClick={handleTest}
              disabled={isTesting || !hasExistingKey}
              variant="secondary"
              className="border-white/20 text-white hover:bg-white/5"
            >
              {isTesting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Test Connection"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="bg-cyan-900/20 border-cyan-500/30">
        <div className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-white/80">
            <p className="font-medium text-white">Your data stays private</p>
            <p className="mt-1">
              API calls are made directly from your device to the AI provider.
              Your conversations are encrypted and stored only on your device.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Backup Tab - Export/Import functionality
 */
function BackupTab() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupInfo, setBackupInfo] = useState<{
    lastBackup: Date | null;
    counts: Record<string, number>;
  } | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    available: number;
    percentUsed: number;
  } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadInfo = async () => {
      const info = await getBackupInfo();
      setBackupInfo(info);
      const storage = await getStorageEstimate();
      setStorageInfo(storage);
    };
    loadInfo();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      await downloadBackup({ preserveEncryption: true });
      setMessage({ type: "success", text: "Backup downloaded successfully!" });
      // Refresh backup info
      const info = await getBackupInfo();
      setBackupInfo(info);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Export failed",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {return;}

    setIsImporting(true);
    setMessage(null);

    try {
      const result = await importFromFile(file);

      if (result.success) {
        const total = Object.values(result.imported).reduce((a, b) => a + b, 0);
        setMessage({
          type: "success",
          text: `Imported ${total} items successfully!`,
        });
        // Refresh backup info
        const info = await getBackupInfo();
        setBackupInfo(info);
      } else {
        setMessage({
          type: "error",
          text: result.errors.join(", ") || "Import failed",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Import failed",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) {return "0 B";}
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Backup & Restore</h2>
        <p className="text-white/60">
          Export your data to a file or restore from a previous backup.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-900/50 text-green-300 border border-green-700"
              : "bg-red-900/50 text-red-300 border border-red-700"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Export/Import Actions */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Export Data</h3>
          <p className="text-white/60 text-sm">
            Download all your data as a JSON file. This includes cases, notes,
            conversations, and settings.
          </p>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Backup
              </>
            )}
          </Button>

          {backupInfo?.lastBackup && (
            <p className="text-sm text-white/50">
              Last backup: {new Date(backupInfo.lastBackup).toLocaleString()}
            </p>
          )}
        </div>
      </Card>

      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Import Data</h3>
          <p className="text-white/60 text-sm">
            Restore from a previously exported backup file. This will replace all
            existing data.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-file"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            variant="secondary"
            className="w-full border-white/20 text-white hover:bg-white/5"
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Backup
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Storage Info */}
      {storageInfo && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Storage Usage
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Used</span>
                <span className="text-white">{formatBytes(storageInfo.used)}</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(storageInfo.percentUsed, 100)}%` }}
                />
              </div>
              {backupInfo && (
                <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                  <div>
                    <span className="text-white/60">Cases</span>
                    <span className="ml-2 text-white">{backupInfo.counts.cases || 0}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Notes</span>
                    <span className="ml-2 text-white">{backupInfo.counts.notes || 0}</span>
                  </div>
                  <div>
                    <span className="text-white/60">Conversations</span>
                    <span className="ml-2 text-white">
                      {backupInfo.counts.conversations || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60">Messages</span>
                    <span className="ml-2 text-white">{backupInfo.counts.messages || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Security Tab - PIN management
 */
function SecurityTab() {
  const { changePin, lock } = useLocalAuth();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChangePin = async () => {
    setMessage(null);

    if (!currentPin || !newPin || !confirmPin) {
      setMessage({ type: "error", text: "All fields are required" });
      return;
    }

    if (newPin !== confirmPin) {
      setMessage({ type: "error", text: "New PINs do not match" });
      return;
    }

    if (newPin.length < 4) {
      setMessage({ type: "error", text: "PIN must be at least 4 characters" });
      return;
    }

    setIsChanging(true);

    try {
      await changePin(currentPin, newPin);
      setMessage({ type: "success", text: "PIN changed successfully!" });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to change PIN",
      });
    } finally {
      setIsChanging(false);
    }
  };

  const handleLock = async () => {
    await lock();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Security</h2>
        <p className="text-white/60">Manage your PIN and security settings</p>
      </div>

      {/* Encryption Status */}
      <Card className="bg-gradient-to-br from-green-900/30 to-primary-900/30 border-green-500/20">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Encryption Active</h3>
              <p className="text-sm text-white/60">
                Your data is protected with AES-256-GCM encryption
              </p>
            </div>
            <Badge variant="success" className="ml-auto">
              Secure
            </Badge>
          </div>
        </div>
      </Card>

      {/* Change PIN */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Change PIN</h3>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-900/50 text-green-300 border border-green-700"
                  : "bg-red-900/50 text-red-300 border border-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Current PIN
            </label>
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter current PIN"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              New PIN
            </label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter new PIN"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Confirm New PIN
            </label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Confirm new PIN"
            />
          </div>

          <Button
            onClick={handleChangePin}
            disabled={isChanging}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
          >
            {isChanging ? "Changing..." : "Change PIN"}
          </Button>
        </div>
      </Card>

      {/* Lock App */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Lock App</h3>
          <p className="text-white/60 text-sm mb-4">
            Lock the app immediately. You'll need to enter your PIN to unlock.
          </p>
          <Button
            onClick={handleLock}
            variant="secondary"
            className="border-white/20 text-white hover:bg-white/5"
          >
            <Lock className="w-4 h-4" />
            Lock Now
          </Button>
        </div>
      </Card>

      {/* Delete All Data */}
      <Card className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/20">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
          </div>

          <p className="text-white/80 text-sm">
            Permanently delete all your data. This action cannot be undone.
          </p>

          <Button
            onClick={async () => {
              if (
                confirm(
                  "Are you sure? This will delete ALL your data permanently."
                )
              ) {
                await deleteAllData();
                window.location.reload();
              }
            }}
            variant="secondary"
            className="border-red-500 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
            Delete All Data
          </Button>
        </div>
      </Card>
    </div>
  );
}

/**
 * Appearance Tab
 */
function AppearanceTab({
  theme,
  setTheme,
}: {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}) {
  const themeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Appearance</h2>
        <p className="text-white/60">Customize the look of Justice Companion</p>
      </div>

      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isActive
                        ? "bg-gradient-to-br from-cyan-500 to-blue-500 border-cyan-400 shadow-lg"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-6 h-6 text-white mx-auto mb-2" />
                    <div className="text-sm font-medium text-white">
                      {option.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * About Tab
 */
function AboutTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">About</h2>
        <p className="text-white/60">Version information and legal notices</p>
      </div>

      <Card className="bg-gradient-to-br from-gray-900 via-primary-900/50 to-gray-900 border-white/10">
        <div className="p-6 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white">Justice Companion</h3>
            <p className="text-white/60">Local-First Legal Case Management</p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white">
            <span className="text-sm font-medium">Version 1.0.0</span>
            <Badge variant="info">Local Mode</Badge>
          </div>
        </div>
      </Card>

      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-3">
          <h3 className="text-lg font-semibold text-white mb-4">Features</h3>

          <div className="space-y-2 text-white/80">
            <p>✓ All data stored locally on your device</p>
            <p>✓ PIN-based encryption (AES-256-GCM)</p>
            <p>✓ Direct AI provider integration</p>
            <p>✓ No account or server required</p>
            <p>✓ Export/import for backup</p>
          </div>
        </div>
      </Card>

      <div className="text-center text-white/40 text-sm">
        <p>&copy; 2025 Justice Companion. All rights reserved.</p>
        <p className="mt-1">Built with privacy and security in mind.</p>
      </div>
    </div>
  );
}
