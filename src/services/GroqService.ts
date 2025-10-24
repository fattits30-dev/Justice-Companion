import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

/**
 * GroqService - Streaming AI chat using Groq API
 *
 * Features:
 * - Streaming responses with token-by-token delivery
 * - Model: llama-3.3-70b-versatile (fast, high-quality)
 * - Secure API key management
 */
export class GroqService {
  private client: Groq | null = null;
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  /**
   * Set or update the Groq API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: false, // Server-side only
    });
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.apiKey !== null;
  }

  /**
   * Stream chat completion with token-by-token delivery
   *
   * @param messages - Chat history (system, user, assistant messages)
   * @param onToken - Callback for each token
   * @param onComplete - Callback when stream completes
   * @param onError - Callback for errors
   */
  async streamChat(
    messages: ChatCompletionMessageParam[],
    onToken: (token: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (!this.client) {
      onError(new Error('Groq API key not configured'));
      return;
    }

    try {
      let fullResponse = '';

      const stream = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Fast, high-quality model
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullResponse += token;
          onToken(token);
        }
      }

      onComplete(fullResponse);
    } catch (error) {
      console.error('[GroqService] Streaming error:', error);
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Non-streaming chat completion (fallback)
   */
  async chat(messages: ChatCompletionMessageParam[]): Promise<string> {
    if (!this.client) {
      throw new Error('Groq API key not configured');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[GroqService] Chat error:', error);
      throw error;
    }
  }
}
