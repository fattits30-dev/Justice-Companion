/**
 * AI Provider Types
 * 
 * Defines supported AI providers and their metadata.
 * NOTE: AI features are deferred to v2.0 - this file provides type stubs.
 */

export type AIProviderType = 
  | "openai"
  | "anthropic"
  | "ollama"
  | "lmstudio"
  | "custom"
  | "huggingface"
  | "qwen"
  | "google"
  | "cohere"
  | "together"
  | "anyscale"
  | "mistral"
  | "perplexity";

export interface AIProviderMetadata {
  name: string;
  description: string;
  requiresApiKey: boolean;
  requiresEndpoint: boolean;
  defaultEndpoint?: string;
  defaultModel?: string;
  models: string[];
  availableModels?: string[];
  maxContextTokens?: number;
  supportsStreaming?: boolean;
}

/**
 * Metadata for supported AI providers
 * Used in Settings UI for provider selection
 */
export const AI_PROVIDER_METADATA: Record<AIProviderType, AIProviderMetadata> = {
  openai: {
    name: "OpenAI",
    description: "GPT-4 and GPT-3.5 models via OpenAI API",
    requiresApiKey: true,
    requiresEndpoint: false,
    defaultModel: "gpt-4",
    models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    availableModels: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
    maxContextTokens: 128000,
    supportsStreaming: true,
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude models via Anthropic API",
    requiresApiKey: true,
    requiresEndpoint: false,
    defaultModel: "claude-3-sonnet",
    models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    availableModels: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    maxContextTokens: 200000,
    supportsStreaming: true,
  },
  ollama: {
    name: "Ollama",
    description: "Local models via Ollama (privacy-first)",
    requiresApiKey: false,
    requiresEndpoint: true,
    defaultEndpoint: "http://localhost:11434",
    defaultModel: "llama2",
    models: ["llama2", "mistral", "codellama"],
    availableModels: ["llama2", "mistral", "codellama"],
    supportsStreaming: true,
  },
  lmstudio: {
    name: "LM Studio",
    description: "Local models via LM Studio",
    requiresApiKey: false,
    requiresEndpoint: true,
    defaultEndpoint: "http://localhost:1234/v1",
    models: [],
    availableModels: [],
    supportsStreaming: true,
  },
  custom: {
    name: "Custom",
    description: "Custom OpenAI-compatible endpoint",
    requiresApiKey: true,
    requiresEndpoint: true,
    models: [],
    availableModels: [],
    supportsStreaming: true,
  },
  huggingface: {
    name: "Hugging Face",
    description: "Models via Hugging Face Inference API",
    requiresApiKey: true,
    requiresEndpoint: false,
    models: [],
    availableModels: [],
    supportsStreaming: false,
  },
  qwen: {
    name: "Qwen",
    description: "Alibaba Qwen models",
    requiresApiKey: true,
    requiresEndpoint: false,
    models: [],
    availableModels: [],
    supportsStreaming: true,
  },
  google: {
    name: "Google",
    description: "Gemini models via Google AI",
    requiresApiKey: true,
    requiresEndpoint: false,
    defaultModel: "gemini-pro",
    models: ["gemini-pro", "gemini-pro-vision"],
    availableModels: ["gemini-pro", "gemini-pro-vision"],
    maxContextTokens: 32000,
    supportsStreaming: true,
  },
  cohere: {
    name: "Cohere",
    description: "Command models via Cohere API",
    requiresApiKey: true,
    requiresEndpoint: false,
    models: ["command", "command-light"],
    availableModels: ["command", "command-light"],
    supportsStreaming: true,
  },
  together: {
    name: "Together AI",
    description: "Open-source models via Together AI",
    requiresApiKey: true,
    requiresEndpoint: false,
    models: [],
    availableModels: [],
    supportsStreaming: true,
  },
  anyscale: {
    name: "Anyscale",
    description: "Models via Anyscale Endpoints",
    requiresApiKey: true,
    requiresEndpoint: false,
    models: [],
    availableModels: [],
    supportsStreaming: true,
  },
  mistral: {
    name: "Mistral AI",
    description: "Mistral models via Mistral API",
    requiresApiKey: true,
    requiresEndpoint: false,
    defaultModel: "mistral-medium",
    models: ["mistral-tiny", "mistral-small", "mistral-medium"],
    availableModels: ["mistral-tiny", "mistral-small", "mistral-medium"],
    maxContextTokens: 32000,
    supportsStreaming: true,
  },
  perplexity: {
    name: "Perplexity",
    description: "Online LLMs via Perplexity API",
    requiresApiKey: true,
    requiresEndpoint: false,
    models: ["pplx-7b-online", "pplx-70b-online"],
    availableModels: ["pplx-7b-online", "pplx-70b-online"],
    supportsStreaming: true,
  },
};
