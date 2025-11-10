/**
 * AI Provider Type Definitions
 *
 * Supports 10 AI providers:
 * - OpenAI, Anthropic, Hugging Face, Qwen, Google, Cohere, Together, Anyscale, Mistral, Perplexity
 */

export type AIProviderType =
  | "openai"
  | "anthropic"
  | "huggingface"
  | "qwen"
  | "google"
  | "cohere"
  | "together"
  | "anyscale"
  | "mistral"
  | "perplexity";

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  endpoint?: string; // Optional custom endpoint
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface StreamingCallbacks {
  onToken: (token: string) => void;
  onThinking?: (thinking: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
  onFunctionCall?: (name: string, args: any, result: any) => void;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProviderMetadata {
  name: string;
  defaultEndpoint: string;
  supportsStreaming: boolean;
  defaultModel: string;
  maxContextTokens: number;
  availableModels: string[];
}

/**
 * Provider Metadata Configurations
 */
export const AI_PROVIDER_METADATA: Record<AIProviderType, AIProviderMetadata> =
  {
    openai: {
      name: "OpenAI",
      defaultEndpoint: "https://api.openai.com/v1",
      supportsStreaming: true,
      defaultModel: "gpt-4-turbo",
      maxContextTokens: 128000,
      availableModels: [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4-turbo-preview",
        "gpt-4-0125-preview",
        "gpt-4-1106-preview",
        "gpt-4",
        "gpt-4-0613",
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-0125",
        "gpt-3.5-turbo-1106",
        "gpt-3.5-turbo-16k",
        "gpt-3.5-turbo-instruct",
      ],
    },
    anthropic: {
      name: "Anthropic",
      defaultEndpoint: "https://api.anthropic.com/v1",
      supportsStreaming: true,
      defaultModel: "claude-3-5-sonnet-20241022",
      maxContextTokens: 200000,
      availableModels: [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
        "claude-3-5-sonnet-latest",
        "claude-3-5-haiku-latest",
        "claude-2.1",
        "claude-2.0",
        "claude-instant-1.2",
      ],
    },
    huggingface: {
      name: "Hugging Face",
      defaultEndpoint: "https://api-inference.huggingface.co",
      supportsStreaming: true,
      defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct",
      maxContextTokens: 128000,
      availableModels: [
        // Meta Llama models
        "meta-llama/Meta-Llama-3.1-405B-Instruct",
        "meta-llama/Meta-Llama-3.1-70B-Instruct",
        "meta-llama/Meta-Llama-3.1-8B-Instruct",
        "meta-llama/Meta-Llama-3-70B-Instruct",
        "meta-llama/Meta-Llama-3-8B-Instruct",
        "meta-llama/Llama-2-70b-chat-hf",
        "meta-llama/Llama-2-13b-chat-hf",
        "meta-llama/Llama-2-7b-chat-hf",

        // Mistral models
        "mistralai/Mistral-7B-Instruct-v0.3",
        "mistralai/Mistral-7B-Instruct-v0.2",
        "mistralai/Mistral-7B-Instruct-v0.1",
        "mistralai/Mixtral-8x7B-Instruct-v0.1",

        // Qwen models
        "Qwen/Qwen2.5-72B-Instruct",
        "Qwen/Qwen2.5-32B-Instruct",
        "Qwen/Qwen2.5-14B-Instruct",
        "Qwen/Qwen2.5-7B-Instruct",
        "Qwen/Qwen2-72B-Instruct",
        "Qwen/Qwen2-7B-Instruct",
        "Qwen/Qwen1.5-110B-Chat",
        "Qwen/Qwen1.5-72B-Chat",
        "Qwen/Qwen1.5-32B-Chat",
        "Qwen/Qwen1.5-14B-Chat",
        "Qwen/Qwen1.5-7B-Chat",

        // Google models
        "google/gemma-2-27b-it",
        "google/gemma-2-9b-it",
        "google/gemma-7b-it",
        "google/gemma-2b-it",

        // Microsoft models
        "microsoft/DialoGPT-large",
        "microsoft/DialoGPT-medium",
        "microsoft/DialoGPT-small",

        // Cohere models
        "CohereForAI/c4ai-command-r-plus",
        "CohereForAI/c4ai-command-r-v01",
        "CohereForAI/c4ai-command-r-plus-4bit",

        // Other popular models
        "HuggingFaceH4/zephyr-7b-beta",
        "HuggingFaceH4/zephyr-7b-gemma-v0.1",
        "NousResearch/Nous-Hermes-2-Mistral-7B-DPO",
        "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
        "teknium/OpenHermes-2.5-Mistral-7B",
        "openchat/openchat-3.5-0106",
        "Phind/Phind-CodeLlama-34B-v2",
        "codellama/CodeLlama-34b-Instruct-hf",
        "codellama/CodeLlama-13b-Instruct-hf",
        "codellama/CodeLlama-7b-Instruct-hf",
      ],
    },
    qwen: {
      name: "Qwen 2.5-72B",
      defaultEndpoint:
        "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1",
      supportsStreaming: true,
      defaultModel: "Qwen/Qwen2.5-72B-Instruct",
      maxContextTokens: 32768,
      availableModels: [
        "Qwen/Qwen2.5-72B-Instruct",
        "Qwen/Qwen2.5-32B-Instruct",
        "Qwen/Qwen2.5-14B-Instruct",
        "Qwen/Qwen2.5-7B-Instruct",
        "Qwen/Qwen2-72B-Instruct",
        "Qwen/Qwen2-7B-Instruct",
        "Qwen/Qwen1.5-110B-Chat",
        "Qwen/Qwen1.5-72B-Chat",
        "Qwen/Qwen1.5-32B-Chat",
        "Qwen/Qwen1.5-14B-Chat",
        "Qwen/Qwen1.5-7B-Chat",
      ],
    },
    google: {
      name: "Google AI",
      defaultEndpoint: "https://generativelanguage.googleapis.com/v1",
      supportsStreaming: true,
      defaultModel: "gemini-2.0-flash-exp",
      maxContextTokens: 1000000,
      availableModels: [
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro-latest",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-1.5-pro-001",
        "gemini-1.5-flash-001",
        "gemini-pro",
        "gemini-pro-vision",
        "gemini-1.0-pro",
        "gemini-1.0-pro-vision-001",
        "text-bison-001",
        "chat-bison-001",
        "palm-2-codechat-bison",
        "palm-2-chat-bison",
        "palm-2-codechat-bison-32k",
        "palm-2-chat-bison-32k",
      ],
    },
    cohere: {
      name: "Cohere",
      defaultEndpoint: "https://api.cohere.com/v1",
      supportsStreaming: true,
      defaultModel: "command-r-plus",
      maxContextTokens: 128000,
      availableModels: [
        "command-r-plus",
        "command-r",
        "command-r-plus-08-2024",
        "command-r-08-2024",
        "command-r-plus-04-2024",
        "command-r-03-2024",
        "command-light",
        "command",
        "command-nightly",
        "base",
        "base-light",
      ],
    },
    together: {
      name: "Together AI",
      defaultEndpoint: "https://api.together.xyz/v1",
      supportsStreaming: true,
      defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      maxContextTokens: 32768,
      availableModels: [
        // Meta Llama models
        "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        "meta-llama/Meta-Llama-3-70B-Instruct",
        "meta-llama/Meta-Llama-3-8B-Instruct",
        "meta-llama/Llama-2-70b-chat-hf",
        "meta-llama/Llama-2-13b-chat-hf",
        "meta-llama/Llama-2-7b-chat-hf",

        // Mistral models
        "mistralai/Mistral-7B-Instruct-v0.3",
        "mistralai/Mistral-7B-Instruct-v0.2",
        "mistralai/Mistral-7B-Instruct-v0.1",
        "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "mistralai/Mixtral-8x22B-Instruct-v0.1",

        // Qwen models
        "Qwen/Qwen2.5-72B-Instruct",
        "Qwen/Qwen2.5-32B-Instruct",
        "Qwen/Qwen2.5-14B-Instruct",
        "Qwen/Qwen2.5-7B-Instruct",

        // Google models
        "google/gemma-2-27b-it",
        "google/gemma-2-9b-it",
        "google/gemma-7b-it",

        // Other models
        "codellama/CodeLlama-34b-Instruct-hf",
        "codellama/CodeLlama-13b-Instruct-hf",
        "codellama/CodeLlama-7b-Instruct-hf",
        "NousResearch/Nous-Hermes-2-Mistral-7B-DPO",
        "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
        "teknium/OpenHermes-2.5-Mistral-7B",
        "openchat/openchat-3.5-0106",
        "Phind/Phind-CodeLlama-34B-v2",
        "HuggingFaceH4/zephyr-7b-beta",
      ],
    },
    anyscale: {
      name: "Anyscale",
      defaultEndpoint: "https://api.endpoints.anyscale.com/v1",
      supportsStreaming: true,
      defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct",
      maxContextTokens: 32768,
      availableModels: [
        "meta-llama/Meta-Llama-3.1-70B-Instruct",
        "meta-llama/Meta-Llama-3.1-8B-Instruct",
        "meta-llama/Meta-Llama-3-70B-Instruct",
        "meta-llama/Meta-Llama-3-8B-Instruct",
        "meta-llama/Llama-2-70b-chat-hf",
        "meta-llama/Llama-2-13b-chat-hf",
        "meta-llama/Llama-2-7b-chat-hf",
        "codellama/CodeLlama-34b-Instruct-hf",
        "codellama/CodeLlama-13b-Instruct-hf",
        "codellama/CodeLlama-7b-Instruct-hf",
        "mistralai/Mistral-7B-Instruct-v0.3",
        "mistralai/Mistral-7B-Instruct-v0.1",
        "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "Qwen/Qwen2.5-72B-Instruct",
        "Qwen/Qwen2.5-32B-Instruct",
        "google/gemma-2-9b-it",
        "google/gemma-7b-it",
      ],
    },
    mistral: {
      name: "Mistral AI",
      defaultEndpoint: "https://api.mistral.ai/v1",
      supportsStreaming: true,
      defaultModel: "mistral-large-latest",
      maxContextTokens: 128000,
      availableModels: [
        "mistral-large-latest",
        "mistral-medium-latest",
        "mistral-small-latest",
        "mistral-tiny",
        "mistral-embed",
        "mistral-7b-instruct",
        "mistral-7b-instruct-v0.2",
        "mistral-7b-instruct-v0.3",
        "mixtral-8x7b-instruct",
        "mixtral-8x7b-instruct-v0.1",
        "mixtral-8x22b-instruct",
        "mixtral-8x22b-instruct-v0.1",
      ],
    },
    perplexity: {
      name: "Perplexity",
      defaultEndpoint: "https://api.perplexity.ai",
      supportsStreaming: true,
      defaultModel: "llama-3.1-sonar-large-128k-online",
      maxContextTokens: 128000,
      availableModels: [
        "llama-3.1-sonar-large-128k-online",
        "llama-3.1-sonar-small-128k-online",
        "llama-3.1-sonar-huge-128k-online",
        "llama-3.1-sonar-large-128k-chat",
        "llama-3.1-sonar-small-128k-chat",
        "llama-3.1-8b-instruct",
        "llama-3.1-70b-instruct",
        "codellama-34b-instruct",
        "mistral-7b-instruct",
        "mixtral-8x7b-instruct",
        "pplx-7b-online",
        "pplx-70b-online",
        "pplx-7b-chat",
        "pplx-70b-chat",
        "text-davinci-003",
        "text-davinci-002",
        "text-curie-001",
        "text-babbage-001",
        "text-ada-001",
      ],
    },
  };
