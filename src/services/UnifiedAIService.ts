/**
 * UnifiedAIService - Multi-Provider AI Service
 *
 * Supports 10 AI providers with unified interface:
 * - OpenAI, Anthropic, Qwen, Hugging Face, Google, Cohere, Together, Anyscale, Mistral, Perplexity
 *
 * Features:
 * - Streaming responses with token-by-token delivery
 * - Provider auto-detection and configuration
 * - OpenAI-compatible API for most providers
 * - Secure API key management
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { HfInference } from '@huggingface/inference';
import type {
  AIProviderConfig,
  AIProviderType,
  ChatMessage,
  StreamingCallbacks,
} from '../types/ai-providers.ts';
import { AI_PROVIDER_METADATA } from '../types/ai-providers.ts';
import { errorLogger } from '../utils/error-logger.ts';
import type {
  CaseAnalysisRequest,
  CaseAnalysisResponse,
  EvidenceAnalysisRequest,
  EvidenceAnalysisResponse,
  DocumentDraftRequest,
  DocumentDraftResponse,
} from '../types/ai-analysis.ts';
import {
  buildCaseAnalysisPrompt,
  buildEvidenceAnalysisPrompt,
  buildDocumentDraftPrompt,
} from '../core/ai/prompts/analysis-prompts.ts';

export class UnifiedAIService {
  private config: AIProviderConfig;
  private client: OpenAI | Anthropic | HfInference | null = null;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize the appropriate API client based on provider
   */
  private initializeClient(): void {
    const { provider, apiKey, endpoint } = this.config;
    const metadata = AI_PROVIDER_METADATA[provider];
    const baseURL = endpoint || metadata.defaultEndpoint;

    switch (provider) {
      case 'anthropic':
        this.client = new Anthropic({
          apiKey,
          baseURL,
        });
        break;

      case 'openai':
      case 'together':
      case 'anyscale':
      case 'mistral':
      case 'perplexity':
      case 'huggingface':
        // These providers use OpenAI-compatible API
        this.client = new OpenAI({
          apiKey,
          baseURL,
          dangerouslyAllowBrowser: false,
        });
        break;

      case 'google':
        // Google Gemini requires special handling - use OpenAI-compatible wrapper for now
        this.client = new OpenAI({
          apiKey,
          baseURL: `${baseURL}/models`,
          dangerouslyAllowBrowser: false,
        });
        break;

      case 'cohere':
        // Cohere uses OpenAI-compatible API
        this.client = new OpenAI({
          apiKey,
          baseURL,
          dangerouslyAllowBrowser: false,
        });
        break;

      case 'qwen':
        // Qwen 2.5-72B uses HuggingFace Inference API
        this.client = new HfInference(apiKey);
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Update service configuration and reinitialize client
   */
  updateConfig(config: AIProviderConfig): void {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.config.apiKey.length > 0;
  }

  /**
   * Get current provider type
   */
  getProvider(): AIProviderType {
    return this.config.provider;
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Stream chat completion with token-by-token delivery
   *
   * @param messages - Chat history (system, user, assistant messages)
   * @param callbacks - Streaming callbacks
   */
  async streamChat(messages: ChatMessage[], callbacks: StreamingCallbacks): Promise<void> {
    if (!this.client) {
      callbacks.onError(new Error(`${this.config.provider} client not configured`));
      return;
    }

    try {
      // Handle Anthropic differently (uses different SDK)
      if (this.config.provider === 'anthropic') {
        await this.streamAnthropicChat(messages, callbacks);
        return;
      }

      // Handle Qwen (HuggingFace Inference API)
      if (this.config.provider === 'qwen') {
        await this.streamQwenChat(messages, callbacks);
        return;
      }

      // All other providers use OpenAI-compatible streaming
      await this.streamOpenAICompatibleChat(messages, callbacks);
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'UnifiedAIService',
        provider: this.config.provider,
        model: this.config.model,
        operation: 'streamChat',
      });
      callbacks.onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Stream chat for Anthropic (Claude) - uses different API format
   */
  private async streamAnthropicChat(
    messages: ChatMessage[],
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const client = this.client as Anthropic;
    let fullResponse = '';

    // Anthropic requires system message separate
    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const stream = await client.messages.create({
      model: this.config.model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature || 0.7,
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const token = event.delta.text;
        fullResponse += token;
        callbacks.onToken(token);
      }
    }

    callbacks.onComplete(fullResponse);
  }

  /**
   * Stream chat for Qwen using HuggingFace Inference API
   */
  private async streamQwenChat(
    messages: ChatMessage[],
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const client = this.client as HfInference;
    let fullResponse = '';

    try {
      const stream = client.chatCompletionStream({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: this.config.temperature || 0.3,
        max_tokens: this.config.maxTokens || 2048,
        top_p: this.config.topP || 0.9,
      });

      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
          const token = chunk.choices[0].delta?.content || '';
          if (token) {
            fullResponse += token;
            callbacks.onToken(token);
          }
        }
      }

      callbacks.onComplete(fullResponse);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Qwen streaming error'));
    }
  }

  /**
   * Stream chat for OpenAI-compatible providers
   * (OpenAI, Together, Anyscale, Mistral, Perplexity, Hugging Face, Google, Cohere)
   */
  private async streamOpenAICompatibleChat(
    messages: ChatMessage[],
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const client = this.client as OpenAI;
    let fullResponse = '';

    const stream = await client.chat.completions.create({
      model: this.config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 2048,
      top_p: this.config.topP || 0.9,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullResponse += token;
        callbacks.onToken(token);
      }
    }

    callbacks.onComplete(fullResponse);
  }

  /**
   * Non-streaming chat completion (fallback)
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.client) {
      throw new Error(`${this.config.provider} client not configured`);
    }

    try {
      // Handle Anthropic differently
      if (this.config.provider === 'anthropic') {
        return await this.chatAnthropicNonStreaming(messages);
      }

      // Handle Qwen (HuggingFace Inference API)
      if (this.config.provider === 'qwen') {
        return await this.chatQwenNonStreaming(messages);
      }

      // All other providers use OpenAI-compatible API
      return await this.chatOpenAICompatibleNonStreaming(messages);
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'UnifiedAIService',
        provider: this.config.provider,
        model: this.config.model,
        operation: 'chat',
      });
      throw error;
    }
  }

  /**
   * Non-streaming chat for Anthropic
   */
  private async chatAnthropicNonStreaming(messages: ChatMessage[]): Promise<string> {
    const client = this.client as Anthropic;

    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await client.messages.create({
      model: this.config.model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature || 0.7,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.type === 'text' ? textContent.text : '';
  }

  /**
   * Non-streaming chat for Qwen using HuggingFace Inference API
   */
  private async chatQwenNonStreaming(messages: ChatMessage[]): Promise<string> {
    const client = this.client as HfInference;

    try {
      console.warn('[UnifiedAIService] Calling HuggingFace Inference API...');
      console.warn('[UnifiedAIService] Model:', this.config.model);
      console.warn('[UnifiedAIService] Endpoint:', this.config.endpoint || 'default');
      console.warn('[UnifiedAIService] Message count:', messages.length);

      const response = await client.chatCompletion({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: this.config.temperature || 0.3,
        max_tokens: this.config.maxTokens || 2048,
        top_p: this.config.topP || 0.9,
      });

      console.warn('[UnifiedAIService] Response received successfully');
      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('[UnifiedAIService] HuggingFace API Error Details:');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error status:', error.status || 'N/A');
      console.error('Error response:', error.response?.data || error.response || 'N/A');
      console.error('Full error:', error);
      throw new Error(`Failed to perform inference: ${error.message}${error.status ? ` (HTTP ${error.status})` : ''}`);
    }
  }

  /**
   * Non-streaming chat for OpenAI-compatible providers
   */
  private async chatOpenAICompatibleNonStreaming(messages: ChatMessage[]): Promise<string> {
    const client = this.client as OpenAI;

    const completion = await client.chat.completions.create({
      model: this.config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 2048,
      top_p: this.config.topP || 0.9,
    });

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities() {
    const metadata = AI_PROVIDER_METADATA[this.config.provider];
    return {
      name: metadata.name,
      supportsStreaming: metadata.supportsStreaming,
      maxContextTokens: metadata.maxContextTokens,
      currentModel: this.config.model,
      endpoint: this.config.endpoint || metadata.defaultEndpoint,
    };
  }

  /**
   * Analyze a case and provide structured legal analysis
   */
  async analyzeCase(request: CaseAnalysisRequest): Promise<CaseAnalysisResponse> {
    if (!this.client) {
      throw new Error(`${this.config.provider} client not configured`);
    }

    try {
      const prompt = buildCaseAnalysisPrompt(request);
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await this.chat(messages);

      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;

      const analysis: CaseAnalysisResponse = JSON.parse(jsonStr);
      return analysis;
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'UnifiedAIService',
        provider: this.config.provider,
        operation: 'analyzeCase',
        caseId: request.caseId,
      });
      throw new Error('Failed to analyze case. Please try again.');
    }
  }

  /**
   * Analyze evidence and identify gaps
   */
  async analyzeEvidence(request: EvidenceAnalysisRequest): Promise<EvidenceAnalysisResponse> {
    if (!this.client) {
      throw new Error(`${this.config.provider} client not configured`);
    }

    try {
      const prompt = buildEvidenceAnalysisPrompt(request);
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await this.chat(messages);

      // Extract JSON from response
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;

      const analysis: EvidenceAnalysisResponse = JSON.parse(jsonStr);
      return analysis;
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'UnifiedAIService',
        provider: this.config.provider,
        operation: 'analyzeEvidence',
        caseId: request.caseId,
      });
      throw new Error('Failed to analyze evidence. Please try again.');
    }
  }

  /**
   * Draft a legal document
   */
  async draftDocument(request: DocumentDraftRequest): Promise<DocumentDraftResponse> {
    if (!this.client) {
      throw new Error(`${this.config.provider} client not configured`);
    }

    try {
      const prompt = buildDocumentDraftPrompt(request);
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await this.chat(messages);

      // Extract JSON from response
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;

      const draft: DocumentDraftResponse = JSON.parse(jsonStr);
      return draft;
    } catch (error) {
      errorLogger.logError(error instanceof Error ? error : new Error(String(error)), {
        service: 'UnifiedAIService',
        provider: this.config.provider,
        operation: 'draftDocument',
        documentType: request.documentType,
      });
      throw new Error('Failed to draft document. Please try again.');
    }
  }
}
