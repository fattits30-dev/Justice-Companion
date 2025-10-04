import { errorLogger } from '../utils/error-logger';
import {
  DEFAULT_AI_CONFIG,
  buildSystemPrompt,
  extractSources,
} from '../types/ai';
import type {
  AIConfig,
  AIStatus,
  ChatMessage,
  AIChatRequest,
  AIResponse,
} from '../types/ai';

/**
 * AIService - Handles communication with LM Studio (local LLM)
 *
 * LM Studio runs as HTTP server with OpenAI-compatible API at http://localhost:1234/v1
 * This service makes fetch requests to that endpoint.
 */
export class AIService {
  private config: AIConfig;

  constructor(config?: Partial<AIConfig>) {
    this.config = {
      ...DEFAULT_AI_CONFIG,
      ...config,
    } as AIConfig;
  }

  /**
   * Check if LM Studio is running and accessible
   */
  async checkConnection(): Promise<AIStatus> {
    try {
      const response = await fetch(`${this.config.endpoint}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        errorLogger.logError('LM Studio connection failed', {
          status: response.status,
          endpoint: this.config.endpoint,
        });

        return {
          connected: false,
          endpoint: this.config.endpoint,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const modelName = data.data?.[0]?.id || 'unknown';

      errorLogger.logError('LM Studio connection successful', {
        type: 'info',
        endpoint: this.config.endpoint,
        model: modelName,
      });

      return {
        connected: true,
        endpoint: this.config.endpoint,
        model: modelName,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      errorLogger.logError('LM Studio connection check failed', {
        error: errorMessage,
        endpoint: this.config.endpoint,
      });

      return {
        connected: false,
        endpoint: this.config.endpoint,
        error: errorMessage,
      };
    }
  }

  /**
   * Send chat completion request to LM Studio
   * Non-streaming version
   */
  async chat(request: AIChatRequest): Promise<AIResponse> {
    try {
      // Check connection first
      const status = await this.checkConnection();
      if (!status.connected) {
        return {
          success: false,
          error: `LM Studio not connected: ${status.error}`,
          code: 'LM_STUDIO_OFFLINE',
        };
      }

      // Build messages array
      const messages: ChatMessage[] = [];

      // Add system prompt if context provided
      if (request.context) {
        const systemPrompt = buildSystemPrompt(request.context);
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      // Add user messages
      messages.push(...request.messages);

      // Prepare request body (OpenAI-compatible)
      const requestBody = {
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: request.config?.temperature ?? this.config.temperature,
        max_tokens: request.config?.maxTokens ?? this.config.maxTokens,
        stream: false,
      };

      errorLogger.logError('Sending chat request to LM Studio', {
        type: 'info',
        messageCount: messages.length,
        hasContext: !!request.context,
      });

      // Send request
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000), // 60 second timeout for generation
      });

      if (!response.ok) {
        const errorText = await response.text();
        errorLogger.logError('LM Studio chat request failed', {
          status: response.status,
          error: errorText,
        });

        return {
          success: false,
          error: `LM Studio error: ${response.status} - ${errorText}`,
          code: 'LM_STUDIO_ERROR',
        };
      }

      const data = await response.json();

      // Extract assistant response
      const assistantMessage = data.choices?.[0]?.message?.content;
      if (!assistantMessage) {
        errorLogger.logError('LM Studio returned empty response', { data });
        return {
          success: false,
          error: 'LM Studio returned empty response',
          code: 'EMPTY_RESPONSE',
        };
      }

      // Extract sources if context was provided
      const sources = request.context
        ? extractSources(assistantMessage, request.context)
        : [];

      const tokensUsed = data.usage?.total_tokens || 0;

      errorLogger.logError('LM Studio chat successful', {
        type: 'info',
        tokensUsed,
        sourcesFound: sources.length,
      });

      return {
        success: true,
        message: {
          role: 'assistant',
          content: assistantMessage,
          timestamp: new Date().toISOString(),
        },
        sources,
        tokensUsed,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      errorLogger.logError(error as Error, {
        context: 'AIService.chat',
        request: {
          messageCount: request.messages.length,
          hasContext: !!request.context,
        },
      });

      return {
        success: false,
        error: errorMessage,
        code: 'EXCEPTION',
      };
    }
  }

  /**
   * Send streaming chat completion request to LM Studio
   * Calls onToken for each generated token
   * Calls onThinkToken for tokens inside <think> tags (optional)
   * Calls onSources after completion with extracted legal citations
   */
  async streamChat(
    request: AIChatRequest,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onThinkToken?: (token: string) => void,
    onSources?: (sources: string[]) => void
  ): Promise<void> {
    try {
      // Check connection first
      const status = await this.checkConnection();
      if (!status.connected) {
        onError(`LM Studio not connected: ${status.error}`);
        return;
      }

      // Build messages array (same as non-streaming)
      const messages: ChatMessage[] = [];

      if (request.context) {
        const systemPrompt = buildSystemPrompt(request.context);
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      messages.push(...request.messages);

      // Prepare request body with streaming enabled
      const requestBody = {
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: request.config?.temperature ?? this.config.temperature,
        max_tokens: request.config?.maxTokens ?? this.config.maxTokens,
        stream: true, // Enable streaming
      };

      errorLogger.logError('Starting streaming chat with LM Studio', {
        type: 'info',
      });

      // Send streaming request
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        errorLogger.logError('LM Studio streaming request failed', {
          status: response.status,
          error: errorText,
        });
        onError(`LM Studio error: ${response.status} - ${errorText}`);
        return;
      }

      // Read stream
      const reader = response.body?.getReader();
      if (!reader) {
        onError('Failed to get response stream reader');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let tokenCount = 0;
      let insideThinkTag = false; // Track if we're inside <think> tags
      let thinkBuffer = ''; // Buffer to detect <think> opening/closing
      let accumulatedContent = ''; // Track full response for source extraction

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          errorLogger.logError('Stream reading complete', {
            type: 'info',
            tokenCount,
          });
          break;
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines (SSE format: "data: {...}\n\n")
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6); // Remove "data: " prefix

            if (jsonStr === '[DONE]') {
              continue;
            }

            try {
              const data = JSON.parse(jsonStr);
              const token = data.choices?.[0]?.delta?.content;

              if (token) {
                // Simple <think> tag filtering: accumulate in buffer to detect tags
                thinkBuffer += token;

                // Check for tag transitions
                if (thinkBuffer.includes('<think>')) {
                  insideThinkTag = true;
                  // Extract content before tag and send it
                  const beforeTag = thinkBuffer.split('<think>')[0];
                  if (beforeTag) {
                    tokenCount++;
                    onToken(beforeTag);
                  }
                  // Keep content after tag for next iteration
                  thinkBuffer = thinkBuffer.split('<think>').pop() || '';
                }

                if (thinkBuffer.includes('</think>')) {
                  insideThinkTag = false;
                  // Extract content after closing tag
                  const afterTag = thinkBuffer.split('</think>').pop() || '';
                  thinkBuffer = afterTag;
                  // Don't send yet - will send in next iteration if more content
                }

                // Send token immediately based on context
                if (insideThinkTag) {
                  // Send think content to onThinkToken callback if provided
                  if (thinkBuffer && onThinkToken) {
                    onThinkToken(thinkBuffer);
                    thinkBuffer = '';
                  }
                } else if (thinkBuffer) {
                  // Send display content to onToken callback
                  tokenCount++;
                  onToken(thinkBuffer);
                  accumulatedContent += thinkBuffer; // Track full response
                  thinkBuffer = '';
                }
              } else {
                // Log why no token
                errorLogger.logError('SSE chunk has no content', {
                  type: 'info',
                  delta: data.choices?.[0]?.delta,
                  fullData: data,
                });
              }
            } catch (parseError) {
              errorLogger.logError('Failed to parse SSE data', {
                line,
                error: parseError,
              });
            }
          }
        }
      }

      // Extract sources after streaming completes
      if (request.context && onSources && accumulatedContent) {
        const sources = extractSources(accumulatedContent, request.context);
        errorLogger.logError('Sources extracted from response', {
          type: 'info',
          sourcesCount: sources.length,
        });
        onSources(sources);
      }

      errorLogger.logError('Streaming chat completed', { type: 'info' });
      onComplete();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      errorLogger.logError(error as Error, {
        context: 'AIService.streamChat',
      });

      onError(errorMessage);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    errorLogger.logError('AI configuration updated', {
      type: 'info',
      config: this.config,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const aiService = new AIService();
