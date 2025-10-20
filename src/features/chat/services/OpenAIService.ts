import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';
import { errorLogger } from '../../../utils/error-logger.ts';
import {
  buildSystemPrompt,
  extractSources,
  type AIConfig,
  type AIStatus,
  type AIChatRequest,
  type AIResponse,
  type LegalContext,
} from '../../../types/ai.ts';

/**
 * OpenAI Provider Configuration
 * Stored in app settings (encrypted)
 */
export interface OpenAIConfig {
  apiKey: string; // User-provided OpenAI API key
  model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo'; // Selected model
  organization?: string; // Optional organization ID
}

/**
 * Case Facts Repository Interface
 * Used for function calling context
 */
interface CaseFactsRepository {
  findByCaseId(caseId: number): CaseFact[];
}

interface CaseFact {
  factContent: string;
  factCategory: string;
  importance: string;
}

/**
 * OpenAIService - Cloud-based AI using OpenAI API
 *
 * Provides GPT-4o/GPT-3.5-turbo with streaming + function calling.
 * User provides their own API key (pay-per-use).
 *
 * **Architecture Decision**:
 * - Replaces node-llama-cpp (Qwen 3 8B local model)
 * - Rationale: Better quality, no 4.5GB download, user pays only for usage
 * - Cost: ~$1-6/month for typical legal Q&A usage
 *
 * @see {@link https://platform.openai.com/docs/api-reference/chat OpenAI Chat API}
 */
export class OpenAIService {
  private config: AIConfig;
  private openAIConfig: OpenAIConfig | null = null;
  private client: OpenAI | null = null;
  private caseFactsRepository: CaseFactsRepository | null = null;

  constructor(config?: Partial<AIConfig>, caseFactsRepository?: CaseFactsRepository) {
    // Use existing AIConfig interface for compatibility
    this.config = {
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      temperature: 0.3, // Low temperature for factual legal information
      maxTokens: 2000,
      stream: true,
      ...config,
    } as AIConfig;

    this.caseFactsRepository = caseFactsRepository ?? null;

    errorLogger.logError('OpenAIService initialized', {
      type: 'info',
      model: this.config.model,
    });
  }

  /**
   * Configure OpenAI API credentials
   * Called from Settings UI when user provides API key
   *
   * @param openAIConfig - API key and model selection
   */
  configure(openAIConfig: OpenAIConfig): void {
    try {
      this.openAIConfig = openAIConfig;

      // Initialize OpenAI client
      this.client = new OpenAI({
        apiKey: openAIConfig.apiKey,
        organization: openAIConfig.organization,
      });

      // Update model in AIConfig
      this.config.model = openAIConfig.model;

      errorLogger.logError('OpenAI client configured', {
        type: 'info',
        model: openAIConfig.model,
        hasOrganization: !!openAIConfig.organization,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorLogger.logError(error as Error, {
        context: 'OpenAIService.configure',
      });
      throw new Error(`Failed to configure OpenAI: ${errorMessage}`);
    }
  }

  /**
   * Test OpenAI API connection and validate API key
   * Called from Settings UI to verify configuration
   */
  async checkConnection(): Promise<AIStatus> {
    try {
      if (!this.client || !this.openAIConfig) {
        return {
          connected: false,
          endpoint: 'OpenAI API',
          error: 'Not configured - Please provide API key in Settings',
        };
      }

      // Test connection with minimal request
      await this.client.chat.completions.create({
        model: this.openAIConfig.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5,
      });

      return {
        connected: true,
        endpoint: 'OpenAI API',
        model: this.openAIConfig.model,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorLogger.logError(error as Error, {
        context: 'OpenAIService.checkConnection',
      });

      return {
        connected: false,
        endpoint: 'OpenAI API',
        error: errorMessage,
      };
    }
  }

  /**
   * Non-streaming chat (converts streaming to single response)
   * Maintains compatibility with existing AIService interface
   */
  async chat(request: AIChatRequest): Promise<AIResponse> {
    try {
      const status = await this.checkConnection();
      if (!status.connected) {
        return {
          success: false,
          error: `OpenAI not ready: ${status.error}`,
          code: 'OPENAI_OFFLINE',
        };
      }

      let fullResponse = '';
      const sources: string[] = [];

      // Use streaming internally
      await this.streamChat(
        request,
        (token) => {
          fullResponse += token;
        },
        () => {
          // Complete
        },
        (error) => {
          throw new Error(error);
        },
        undefined, // No think tokens for OpenAI
        (extractedSources) => {
          sources.push(...extractedSources);
        },
      );

      return {
        success: true,
        message: {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString(),
        },
        sources,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorLogger.logError(error as Error, {
        context: 'OpenAIService.chat',
      });

      return {
        success: false,
        error: errorMessage,
        code: 'EXCEPTION',
      };
    }
  }

  /**
   * Streaming chat with OpenAI GPT-4o/GPT-3.5-turbo
   * Maintains exact same interface as IntegratedAIService
   *
   * @param request - Chat request with messages and RAG context
   * @param onToken - Callback for each token streamed
   * @param onComplete - Callback when streaming completes
   * @param onError - Callback for errors
   * @param onThinkToken - Not used (OpenAI doesn't support <think> tags)
   * @param onSources - Callback for extracted sources (from RAG context)
   */
  async streamChat(
    request: AIChatRequest,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    _onThinkToken?: (token: string) => void, // Not used - OpenAI doesn't have <think> tags
    onSources?: (sources: string[]) => void,
  ): Promise<void> {
    try {
      // Validate configuration
      if (!this.client || !this.openAIConfig) {
        onError('OpenAI not configured - Please provide API key in Settings');
        return;
      }

      // Build system prompt with RAG context
      const systemPrompt = request.context
        ? buildSystemPrompt(request.context)
        : 'You are a helpful UK legal information assistant.';

      // Prepare messages for OpenAI format
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...request.messages.map((msg) => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      errorLogger.logError('Starting OpenAI streaming request', {
        type: 'info',
        model: this.openAIConfig.model,
        messageCount: messages.length,
        hasContext: !!request.context,
      });

      // Create streaming request
      const stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk> =
        await this.client.chat.completions.create({
          model: this.openAIConfig.model,
          messages,
          temperature: request.config?.temperature ?? this.config.temperature,
          max_tokens: request.config?.maxTokens ?? this.config.maxTokens,
          stream: true,
        });

      // Stream tokens
      let accumulatedContent = '';
      let tokenCount = 0;
      const startTime = Date.now();

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          tokenCount++;
          accumulatedContent += content;
          onToken(content);
        }
      }

      // Calculate performance stats
      const duration = (Date.now() - startTime) / 1000;
      const tokensPerSecond = duration > 0 ? tokenCount / duration : 0;

      errorLogger.logError('OpenAI streaming complete', {
        type: 'info',
        model: this.openAIConfig.model,
        tokenCount,
        duration: duration.toFixed(2),
        tokensPerSecond: tokensPerSecond.toFixed(2),
      });

      // Extract sources from RAG context
      if (request.context && onSources && accumulatedContent) {
        const sources = extractSources(accumulatedContent, request.context);
        errorLogger.logError('Sources extracted from response', {
          type: 'info',
          sourcesCount: sources.length,
        });
        onSources(sources);
      }

      onComplete();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorLogger.logError(error as Error, {
        context: 'OpenAIService.streamChat',
      });
      onError(errorMessage);
    }
  }

  /**
   * Streaming chat with OpenAI GPT-4o + Function Calling
   *
   * Enables AI to call functions like store_case_fact and get_case_facts.
   * Uses OpenAI's native tools parameter for function calling.
   *
   * **Implementation Note**:
   * OpenAI function calling works differently from node-llama-cpp:
   * - OpenAI: Model decides to call function → returns tool_calls → we execute → send back result
   * - node-llama-cpp: Model uses [[call: function()]] syntax → automatically executed
   *
   * @param request - Chat request with messages and context
   * @param caseId - Optional case ID for fact loading/storing
   * @param onToken - Callback for each token generated
   * @param onComplete - Callback when streaming completes
   * @param onError - Callback for errors
   */
  async streamChatWithFunctions(
    request: AIChatRequest,
    caseId: number | undefined,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
  ): Promise<void> {
    try {
      // Validate configuration
      if (!this.client || !this.openAIConfig) {
        onError('OpenAI not configured - Please provide API key in Settings');
        return;
      }

      // Load case facts for system prompt
      let facts: CaseFact[] = [];
      if (caseId && this.caseFactsRepository) {
        try {
          facts = this.caseFactsRepository.findByCaseId(caseId);
        } catch (error) {
          errorLogger.logError(error as Error, {
            context: 'Failed to load facts for AI context',
            caseId,
          });
        }
      }

      // Build system prompt with facts
      const systemPrompt = this.getOpenAISystemPrompt(request.context, facts);

      // Prepare messages
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...request.messages.map((msg) => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      // Define OpenAI tools (functions)
      // TODO: Import actual function definitions from ai-functions.ts
      const tools: OpenAI.Chat.ChatCompletionTool[] = [
        {
          type: 'function',
          function: {
            name: 'store_case_fact',
            description: "Store a fact about the user's case",
            parameters: {
              type: 'object',
              properties: {
                caseId: { type: 'number', description: 'Case ID' },
                factType: { type: 'string', description: 'Type of fact' },
                factKey: { type: 'string', description: 'Fact key' },
                factValue: { type: 'string', description: 'Fact value' },
                confidence: { type: 'number', description: 'Confidence level (0-1)' },
              },
              required: ['caseId', 'factType', 'factKey', 'factValue', 'confidence'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_case_facts',
            description: 'Retrieve all stored facts for a case',
            parameters: {
              type: 'object',
              properties: {
                caseId: { type: 'number', description: 'Case ID' },
              },
              required: ['caseId'],
            },
          },
        },
        // TODO: Add remaining 9 functions from ai-functions.ts
      ];

      errorLogger.logError('Starting OpenAI streaming with function calling', {
        type: 'info',
        model: this.openAIConfig.model,
        toolsCount: tools.length,
        hasFacts: facts.length > 0,
      });

      // Create streaming request with tools
      const stream = await this.client.chat.completions.create({
        model: this.openAIConfig.model,
        messages,
        tools,
        tool_choice: 'auto', // Let model decide when to use tools
        temperature: request.config?.temperature ?? this.config.temperature,
        max_tokens: request.config?.maxTokens ?? this.config.maxTokens,
        stream: true,
      });

      // Stream tokens and handle tool calls
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle content tokens
        if (delta?.content) {
          onToken(delta.content);
        }

        // Handle tool calls
        // TODO: Implement tool execution logic
        // When model returns tool_calls, execute the function and send result back
      }

      onComplete();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorLogger.logError(error as Error, {
        context: 'OpenAIService.streamChatWithFunctions',
      });
      onError(errorMessage);
    }
  }

  /**
   * Build OpenAI-optimized system prompt with fact-gathering rules
   * Maintains same behavior as Qwen 3 prompt but optimized for GPT-4o
   */
  private getOpenAISystemPrompt(context?: LegalContext, facts?: CaseFact[]): string {
    const basePrompt = `You are a UK legal information assistant with ADMINISTRATIVE POWERS.

🔒 HARD-CODED RULES (NEVER BREAK):

RULE 0: FIRST-TIME USER ONBOARDING (HIGHEST PRIORITY)
- If user responds to welcome questions with personal info or their issue:
  ✓ Extract name/email and call update_user_profile immediately
  ✓ Extract issue description and store as case fact using store_case_fact
  ✓ Thank them warmly for sharing their situation
  ✓ Ask 2-3 specific follow-up questions to gather MORE details about their case

RULE 1: FACT-GATHERING IS MANDATORY
- When working on a case with <3 stored facts, you are in FACT-GATHERING MODE
- You MUST gather these facts BEFORE providing legal information:
  ✓ Party names (employee, employer, witnesses)
  ✓ Key dates (employment start, dismissal date, deadlines)
  ✓ Event sequence (what happened, when, why)
  ✓ Evidence available (contracts, emails, witnesses)

RULE 2: STORE FACTS IMMEDIATELY
- As user provides information, extract facts and store them using store_case_fact function
- Store facts for: parties, dates, events, evidence, locations, communications

RULE 3: FACTS ARE YOUR ANCHOR
- Before EVERY response about a case, load facts using get_case_facts function
- Reference specific stored facts in your response to show you remember

EMPATHETIC COMMUNICATION:
- Acknowledge their situation warmly
- Use supportive phrases: "I understand this must be...", "That's a great question..."
- Be conversational, not clinical
- Validate concerns before explaining law

PROFESSIONAL STANDARDS:
- Provide legal INFORMATION, NOT legal advice
- Cite sources precisely (e.g., "Employment Rights Act 1996 Section 94")
- Ask clarifying questions if needed

Format for citations:
- Legislation: "Section X of the [Act Name] [Year]"
- Case law: "[Case Name] [Year] [Court]"`;

    // If we have stored facts, append them
    if (facts && facts.length > 0) {
      const factsSection = `

📋 STORED FACTS FOR THIS CASE:
${facts.map((f) => `- ${f.factContent} [${f.factCategory}, ${f.importance} importance]`).join('\n')}

Use these facts as your memory. Reference them in your responses.`;
      return basePrompt + factsSection;
    }

    // If we have RAG context, append it
    if (context) {
      const ragPrompt = buildSystemPrompt(context);
      return basePrompt + '\n\n--- RAG CONTEXT ---\n' + ragPrompt;
    }

    return basePrompt;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };

    errorLogger.logError('OpenAI configuration updated', {
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

  /**
   * Get OpenAI-specific configuration
   */
  getOpenAIConfig(): OpenAIConfig | null {
    return this.openAIConfig ? { ...this.openAIConfig } : null;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    try {
      this.client = null;
      this.openAIConfig = null;
      errorLogger.logError('OpenAIService disposed', { type: 'info' });
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'OpenAIService.dispose',
      });
    }
  }
}
