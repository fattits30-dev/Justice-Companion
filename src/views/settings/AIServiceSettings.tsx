/**
 * AI Service Settings Tab
 * =======================
 * Configure HuggingFace token and AI preferences.
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Zap,
  Scale,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { Card } from "../../components/ui/Card.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { apiClient } from "../../lib/apiClient.ts";

type ModelPreference = "fast" | "balanced" | "thorough";

interface AIServiceHealth {
  status: string;
  service: string;
  version: string;
  hf_connected: boolean;
}

interface ModelOption {
  id: ModelPreference;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  speed: string;
  quality: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "fast",
    name: "Fast",
    description: "Quick responses for simple questions",
    icon: Zap,
    speed: "~2-3s",
    quality: "Good",
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Best mix of speed and quality",
    icon: Scale,
    speed: "~5-8s",
    quality: "Great",
  },
  {
    id: "thorough",
    name: "Thorough",
    description: "Detailed analysis for complex cases",
    icon: Sparkles,
    speed: "~10-15s",
    quality: "Best",
  },
];

export function AIServiceSettingsTab() {
  const [modelPreference, setModelPreference] =
    useState<ModelPreference>("balanced");
  const [aiHealth, setAiHealth] = useState<AIServiceHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Token state
  const [hfToken, setHfToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenSuccess, setTokenSuccess] = useState(false);
  const [tokenError, setTokenError] = useState("");

  // Check AI service health on mount
  useEffect(() => {
    checkAIHealth();
    // Load saved preference
    const saved = localStorage.getItem("ai_model_preference");
    if (saved && ["fast", "balanced", "thorough"].includes(saved)) {
      setModelPreference(saved as ModelPreference);
    }
  }, []);

  const checkAIHealth = async () => {
    setIsChecking(true);
    try {
      // Call ai-service directly for health check
      const response = await fetch("http://localhost:8001/health");
      if (response.ok) {
        const data = await response.json();
        setAiHealth(data);
      } else {
        setAiHealth(null);
      }
    } catch (error) {
      console.error("Failed to check AI health:", error);
      setAiHealth(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSavePreference = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem("ai_model_preference", modelPreference);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToken = async () => {
    if (!hfToken.trim()) {
      setTokenError("Please enter a token");
      return;
    }

    if (!hfToken.startsWith("hf_")) {
      setTokenError("Token should start with 'hf_'");
      return;
    }

    setTokenSaving(true);
    setTokenError("");

    try {
      // Save token via backend API
      const response = await apiClient.aiConfig.updateApiKey(
        "huggingface",
        hfToken,
      );

      if (response.success) {
        setTokenSuccess(true);
        setHfToken(""); // Clear for security
        setTimeout(() => setTokenSuccess(false), 3000);
        // Refresh health check
        await checkAIHealth();
      } else {
        setTokenError(response.error?.message || "Failed to save token");
      }
    } catch (error: unknown) {
      console.error("Failed to save token:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save token";
      setTokenError(errorMessage);
    } finally {
      setTokenSaving(false);
    }
  };

  const isConnected = aiHealth?.status === "healthy" && aiHealth?.hf_connected;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          AI Assistant Settings
        </h2>
        <p className="text-white/60">
          Configure HuggingFace Pro for intelligent legal assistance
        </p>
      </div>

      {/* Connection Status Card */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI Service Status
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkAIHealth}
              disabled={isChecking}
              className="text-white/60 hover:text-white"
            >
              <RefreshCw
                className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-medium">Connected</span>
                </div>
                <Badge
                  variant="success"
                  className="bg-green-500/20 text-green-400"
                >
                  HuggingFace Pro Active
                </Badge>
              </>
            ) : aiHealth ? (
              <>
                <div className="flex items-center gap-2 text-yellow-400">
                  <XCircle className="w-6 h-6" />
                  <span className="font-medium">Limited</span>
                </div>
                <Badge
                  variant="warning"
                  className="bg-yellow-500/20 text-yellow-400"
                >
                  HuggingFace Not Connected
                </Badge>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-6 h-6" />
                  <span className="font-medium">Offline</span>
                </div>
                <Badge variant="danger" className="bg-red-500/20 text-red-400">
                  AI Service Unavailable
                </Badge>
              </>
            )}
          </div>

          {aiHealth && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-white/40">Service</span>
                  <p className="text-white font-medium">{aiHealth.service}</p>
                </div>
                <div>
                  <span className="text-white/40">Version</span>
                  <p className="text-white font-medium">{aiHealth.version}</p>
                </div>
                <div>
                  <span className="text-white/40">Provider</span>
                  <p className="text-white font-medium">HuggingFace Pro</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* HuggingFace Token Configuration */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              HuggingFace API Token
            </h3>
            <a
              href="https://huggingface.co/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              Get Token <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-white/60 text-sm mb-4">
            Enter your HuggingFace Pro API token to enable AI features.
            {isConnected && (
              <span className="text-green-400 ml-2">
                Token is currently configured.
              </span>
            )}
          </p>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type={showToken ? "text" : "password"}
                value={hfToken}
                onChange={(e) => {
                  setHfToken(e.target.value);
                  setTokenError("");
                }}
                placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <Button
              onClick={handleSaveToken}
              disabled={tokenSaving || !hfToken.trim()}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6"
            >
              {tokenSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Save Token"
              )}
            </Button>
          </div>

          {tokenError && (
            <p className="text-red-400 text-sm mt-2">{tokenError}</p>
          )}

          {tokenSuccess && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-400 text-sm mt-2 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Token saved successfully!
            </motion.p>
          )}
        </div>
      </Card>

      {/* Model Preference Selection */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            Response Preference
          </h3>
          <p className="text-white/60 text-sm mb-4">
            Choose how the AI balances speed vs. thoroughness
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODEL_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = modelPreference === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setModelPreference(option.id)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all text-left
                    ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }
                  `}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="selectedModel"
                      className="absolute inset-0 rounded-lg border-2 border-purple-500"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.4,
                      }}
                    />
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <Icon
                      className={`w-5 h-5 ${isSelected ? "text-purple-400" : "text-white/60"}`}
                    />
                    <span
                      className={`font-semibold ${isSelected ? "text-white" : "text-white/80"}`}
                    >
                      {option.name}
                    </span>
                  </div>

                  <p className="text-sm text-white/60 mb-3">
                    {option.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-white/40">
                      Speed:{" "}
                      <span className="text-white/70">{option.speed}</span>
                    </span>
                    <span className="text-white/40">
                      Quality:{" "}
                      <span className="text-white/70">{option.quality}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 mt-6">
            <Button
              onClick={handleSavePreference}
              disabled={isSaving}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preference"
              )}
            </Button>

            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-green-400"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Saved!</span>
              </motion.div>
            )}
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <div className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-200 font-medium mb-1">
              About the AI Assistant
            </p>
            <p className="text-blue-200/70">
              Justice Companion uses privacy-focused AI powered by HuggingFace
              Pro. All processing is done securely - your case data never leaves
              your control. The AI provides legal information and document
              assistance, not legal advice.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
