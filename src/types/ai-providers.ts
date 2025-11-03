/**
 * AI Provider Type Definitions
 *
 * Supports 10 AI providers:
 * - OpenAI, Anthropic, Hugging Face, Qwen, Google, Cohere, Together, Anyscale, Mistral, Perplexity
 */

export type AIProviderType =
  | 'openai'
  | 'anthropic'
  | 'huggingface'
  | 'qwen'
  | 'google'
  | 'cohere'
  | 'together'
  | 'anyscale'
  | 'mistral'
  | 'perplexity';

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
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderMetadata {
  name: string;
  defaultEndpoint: string;
  supportsStreaming: boolean;
  defaultModel: string;
  maxContextTokens: number;
}

/**
 * Provider Metadata Configurations
 */
export const AI_PROVIDER_METADATA: Record<AIProviderType, AIProviderMetadata> = {
  openai: {
    name: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1',
    supportsStreaming: true,
    defaultModel: 'gpt-4-turbo',
    maxContextTokens: 128000,
  },
  anthropic: {
    name: 'Anthropic',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    supportsStreaming: true,
    defaultModel: 'claude-3-5-sonnet-20241022',
    maxContextTokens: 200000,
  },
  huggingface: {
    name: 'Hugging Face',
    defaultEndpoint: 'https://api-inference.huggingface.co',
    supportsStreaming: true,
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    maxContextTokens: 128000,
  },
  qwen: {
    name: 'Qwen 2.5-72B',
    defaultEndpoint: 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1',
    supportsStreaming: true,
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    maxContextTokens: 32768,
  },
  google: {
    name: 'Google AI',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1',
    supportsStreaming: true,
    defaultModel: 'gemini-2.0-flash-exp',
    maxContextTokens: 1000000,
  },
  cohere: {
    name: 'Cohere',
    defaultEndpoint: 'https://api.cohere.com/v1',
    supportsStreaming: true,
    defaultModel: 'command-r-plus',
    maxContextTokens: 128000,
  },
  together: {
    name: 'Together AI',
    defaultEndpoint: 'https://api.together.xyz/v1',
    supportsStreaming: true,
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    maxContextTokens: 32768,
  },
  anyscale: {
    name: 'Anyscale',
    defaultEndpoint: 'https://api.endpoints.anyscale.com/v1',
    supportsStreaming: true,
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    maxContextTokens: 32768,
  },
  mistral: {
    name: 'Mistral AI',
    defaultEndpoint: 'https://api.mistral.ai/v1',
    supportsStreaming: true,
    defaultModel: 'mistral-large-latest',
    maxContextTokens: 128000,
  },
  perplexity: {
    name: 'Perplexity',
    defaultEndpoint: 'https://api.perplexity.ai',
    supportsStreaming: true,
    defaultModel: 'llama-3.1-sonar-large-128k-online',
    maxContextTokens: 128000,
  },
};
