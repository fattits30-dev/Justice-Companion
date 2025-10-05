import { errorLogger } from '../utils/error-logger';
import {
  DEFAULT_AI_CONFIG,
  buildSystemPrompt,
  extractSources,
} from '../types/ai';
import type {
  AIConfig,
  AIStatus,
  AIChatRequest,
  AIResponse,
} from '../types/ai';
import path from 'path';
import { app } from 'electron';
import os from 'os';

/**
 * IntegratedAIService - Sovereign AI using node-llama-cpp
 *
 * Runs Qwen 3 8B locally with AMD Vulkan GPU acceleration.
 * No external dependencies - complete sovereignty.
 */
export class IntegratedAIService {
  private config: AIConfig;
  private llama: any = null;
  private model: any = null;
  private context: any = null;
  private isInitialized = false;
  private modelFileName = 'Qwen_Qwen3-8B-Q4_K_M.gguf';
  private modelPath: string;
  private caseFactsRepository: any = null; // Optional dependency for fact loading

  constructor(config?: Partial<AIConfig>, caseFactsRepository?: any) {
    this.config = {
      ...DEFAULT_AI_CONFIG,
      ...config,
    } as AIConfig;

    this.caseFactsRepository = caseFactsRepository || null;

    // Model storage: app.getPath('userData')/models/
    const userDataPath = app.getPath('userData');
    this.modelPath = path.join(userDataPath, 'models', this.modelFileName);

    errorLogger.logError('IntegratedAIService initialized', {
      type: 'info',
      modelPath: this.modelPath,
    });
  }

  /**
   * Initialize node-llama-cpp and load Qwen 3 8B model
   * Uses dynamic import() for ESM compatibility
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      errorLogger.logError('Loading node-llama-cpp (ESM dynamic import)', {
        type: 'info',
      });

      // Dynamic import for ESM module
      const { getLlama, LlamaLogLevel } = await import('node-llama-cpp');

      errorLogger.logError('Initializing Llama with AMD GPU detection', {
        type: 'info',
      });

      // Initialize with AMD Vulkan GPU auto-detection
      this.llama = await getLlama({
        logLevel: LlamaLogLevel.warn,
      });

      // Log detected GPU
      const gpu = this.llama.gpu;
      errorLogger.logError('GPU detected', {
        type: 'info',
        gpu: gpu || 'CPU only',
      });

      errorLogger.logError('Loading Qwen 3 8B model', {
        type: 'info',
        modelPath: this.modelPath,
      });

      // Auto-detect optimal CPU threads (use 75% of available cores for responsiveness)
      const cpuCores = os.cpus().length;
      const optimalThreads = this.config.threads ?? Math.max(1, Math.floor(cpuCores * 0.75));

      errorLogger.logError('Hardware auto-detection complete', {
        type: 'info',
        cpuCores,
        optimalThreads,
        contextSize: this.config.contextSize || 4096,
      });

      // Load model with AMD GPU acceleration (37/37 layers - full GPU offload for 8GB VRAM)
      this.model = await this.llama.loadModel({
        modelPath: this.modelPath,
        gpuLayers: 'max', // All layers on GPU (8GB VRAM available)
        defaultContextFlashAttention: true, // Flash Attention for memory efficiency
      });

      // Auto-detect context size from model capabilities with VRAM awareness
      // For 8GB VRAM: Model (~4.5GB) + KV cache + overhead = safe limit ~16K tokens
      // For 16GB+ VRAM: Can use 90% of model's max (29,491 for 32K models)
      const modelMaxContext = this.model._trainContextSize || 32768;

      // Conservative context for 8GB VRAM (tested on AMD RX 6600 8GB)
      // This ensures model + KV cache fit comfortably in VRAM
      // Tested: 16K failed (VRAM overflow), 12K works perfectly
      const safeContextFor8GB = 12288; // 12K tokens = ~9,000 words (ideal for legal documents)
      const optimalContext = Math.min(safeContextFor8GB, Math.floor(modelMaxContext * 0.9));
      const contextSize = this.config.contextSize || optimalContext;

      errorLogger.logError(`Creating context (${contextSize} tokens with Flash Attention)`, {
        type: 'info',
        modelMaxContext,
        optimalContext,
        contextSize,
        flashAttention: true,
        batchSize: this.config.batchSize || 'auto',
      });

      // Create context for legal document analysis with Flash Attention
      this.context = await this.model.createContext({
        contextSize, // Auto-detected from model (90% of 32,768 = 29,491 tokens)
        ...(this.config.batchSize && { batchSize: this.config.batchSize }), // Optional batch size optimization
      });

      errorLogger.logError('IntegratedAIService fully initialized', {
        type: 'info',
        gpu: this.llama.gpu,
        cpuCores,
        threads: optimalThreads,
        contextSize,
        flashAttention: true,
        gpuLayers: '37/37 (max)',
      });

      this.isInitialized = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.isInitialized = false;

      errorLogger.logError(error as Error, {
        context: 'IntegratedAIService.initialize',
      });

      throw new Error(`Failed to initialize Integrated AI: ${errorMessage}`);
    }
  }

  /**
   * Get Qwen 3 optimized system prompt with fact-gathering rules
   * Qwen 3 supports <think> tags for reasoning and [[call: function()]] for tool use
   */
  private getQwen3SystemPrompt(context?: any, facts?: any[]): string {
    // Build base prompt with fact-gathering rules
    const basePrompt = `You are a UK legal information assistant with ADMINISTRATIVE POWERS.

🔒 HARD-CODED RULES (NEVER BREAK):

RULE 0: FIRST-TIME USER ONBOARDING (HIGHEST PRIORITY)
- If user responds to welcome questions with personal info or their issue:
  ✓ Extract name/email and call update_user_profile immediately
  ✓ Extract issue description and store as case fact using store_case_fact
  ✓ Thank them warmly for sharing their situation
  ✓ Ask 2-3 specific follow-up questions to gather MORE details about their case
- Example: User says "My name is John and I was unfairly dismissed"
  → Call: update_user_profile({name: "John"})
  → Call: store_case_fact({factType: "issue", factKey: "case_type", factValue: "unfair dismissal", confidence: 1.0})
  → Respond: "Thank you for sharing, John. I'm here to help with your dismissal case. Can you tell me: when did this happen, who was your employer, and did you receive any written notice?"

RULE 1: FACT-GATHERING IS MANDATORY
- When working on a case with <3 stored facts, you are in FACT-GATHERING MODE
- You MUST gather these facts BEFORE providing legal information:
  ✓ Party names (employee, employer, witnesses)
  ✓ Key dates (employment start, dismissal date, deadlines)
  ✓ Event sequence (what happened, when, why)
  ✓ Evidence available (contracts, emails, witnesses)

RULE 2: STORE FACTS IMMEDIATELY
- As user provides information, extract facts and store them using store_case_fact
- Format: [[call: store_case_fact({caseId: 42, factType: "timeline", factKey: "dismissal_date", factValue: "2024-01-15", confidence: 1.0})]]
- Store facts for: parties (witness), dates (timeline), events (timeline), evidence (evidence), locations (location), communications (communication)

RULE 3: FACTS ARE YOUR ANCHOR
- Before EVERY response about a case, load facts using get_case_facts
- Format: [[call: get_case_facts({caseId: 42})]]
- Reference specific stored facts in your response to show you remember

REASONING INSTRUCTIONS:
- Use <think>reasoning</think> tags for complex analysis
- Inside <think>: analyze question, check facts, plan response
- User will NOT see <think> content

EMPATHETIC COMMUNICATION:
- Acknowledge their situation warmly
- Use supportive phrases: "I understand this must be...", "That's a great question..."
- Be conversational, not clinical
- Validate concerns before explaining law

PROFESSIONAL STANDARDS:
- Provide legal INFORMATION, NOT legal advice
- Cite sources precisely (e.g., "Employment Rights Act 1996 Section 94")
- Ask clarifying questions if needed
- Never give blunt "I don't have information"

TONE EXAMPLES:
✓ "I understand this is stressful. Let me explain unfair dismissal law..."
✓ "Great question. The Employment Rights Act 1996 states..."
✗ "Query processed. ERA 1996 S94 states..."
✗ "I don't have that information."

Format for citations:
- Legislation: "Section X of the [Act Name] [Year]"
- Case law: "[Case Name] [Year] [Court]"`;

    // If we have stored facts, append them to the prompt
    if (facts && facts.length > 0) {
      const factsSection = `

📋 STORED FACTS FOR THIS CASE:
${facts.map((f: any) => `- ${f.factContent} [${f.factCategory}, ${f.importance} importance]`).join('\n')}

Use these facts as your memory. Reference them in your responses.`;

      return basePrompt + factsSection;
    }

    // If we have RAG context, use buildSystemPrompt but inject fact-gathering rules
    if (context) {
      const ragPrompt = buildSystemPrompt(context);
      // Prepend fact-gathering rules to RAG prompt
      return basePrompt + '\n\n--- RAG CONTEXT ---\n' + ragPrompt;
    }

    return basePrompt;
  }

  /**
   * Check if Integrated AI is ready
   */
  async checkConnection(): Promise<AIStatus> {
    try {
      // If not initialized, try to initialize
      if (!this.isInitialized) {
        await this.initialize();
      }

      return {
        connected: true,
        endpoint: 'Integrated AI (Qwen 3 8B)',
        model: this.modelFileName,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        connected: false,
        endpoint: 'Integrated AI (Qwen 3 8B)',
        error: errorMessage,
      };
    }
  }

  /**
   * Non-streaming chat (converts streaming to single response)
   */
  async chat(request: AIChatRequest): Promise<AIResponse> {
    try {
      // Ensure initialized
      const status = await this.checkConnection();
      if (!status.connected) {
        return {
          success: false,
          error: `Integrated AI not ready: ${status.error}`,
          code: 'INTEGRATED_AI_OFFLINE',
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
        undefined, // No think tokens needed for non-streaming
        (extractedSources) => {
          sources.push(...extractedSources);
        }
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      errorLogger.logError(error as Error, {
        context: 'IntegratedAIService.chat',
      });

      return {
        success: false,
        error: errorMessage,
        code: 'EXCEPTION',
      };
    }
  }

  /**
   * Streaming chat with Qwen 3 8B
   * Maintains exact same interface as AIService
   */
  async streamChat(
    request: AIChatRequest,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    onThinkToken?: (token: string) => void,
    onSources?: (sources: string[]) => void
  ): Promise<void> {
    console.log('[IntegratedAIService] streamChat() called');
    console.log('[IntegratedAIService] isInitialized:', this.isInitialized);

    let contextSequence: any = null; // Declare at function scope for cleanup in catch

    try {
      // Ensure initialized
      console.log('[IntegratedAIService] Checking connection...');
      const status = await this.checkConnection();
      console.log('[IntegratedAIService] Connection status:', status);

      if (!status.connected) {
        console.error('[IntegratedAIService] Not connected, error:', status.error);
        onError(`Integrated AI not ready: ${status.error}`);
        return;
      }

      console.log('[IntegratedAIService] Connection successful, starting streaming...');

      // Import session class
      const { LlamaChatSession } = await import('node-llama-cpp');

      // Build system prompt
      const systemPrompt = this.getQwen3SystemPrompt(request.context);

      // Create FRESH sequence that will be disposed after use
      // This prevents KV cache accumulation and VRAM overflow
      contextSequence = this.context.getSequence();

      // Create chat session with fresh sequence
      const chatSession = new LlamaChatSession({
        contextSequence,
        systemPrompt,
      });

      // Get ONLY the most recent user message (not full history)
      // UI maintains conversation history - we just process latest question
      // This keeps context size constant: system prompt + latest question
      const lastUserMessage = [...request.messages]
        .reverse()
        .find((msg) => msg.role === 'user');
      const userPrompt = lastUserMessage?.content || '';

      if (!userPrompt) {
        throw new Error('No user message found in request');
      }

      errorLogger.logError('Starting Qwen 3 8B streaming inference', {
        type: 'info',
        gpu: this.llama.gpu,
      });

      let accumulatedContent = '';
      let insideThinkTag = false;
      let thinkBuffer = '';
      let tokenCount = 0;
      const startTime = Date.now();
      let firstTokenTime: number | null = null;

      console.log('[IntegratedAIService] Starting Qwen 3 inference...');

      // Stream tokens
      await chatSession.prompt(userPrompt.trim(), {
        temperature: request.config?.temperature ?? this.config.temperature,
        maxTokens: request.config?.maxTokens ?? this.config.maxTokens,
        onTextChunk: (chunk: string) => {
          // Record time of first token (after prompt processing)
          if (firstTokenTime === null) {
            firstTokenTime = Date.now();
            const promptProcessingTime = (firstTokenTime - startTime) / 1000;
            console.log(`[IntegratedAIService] Prompt processed in ${promptProcessingTime.toFixed(2)}s`);
          }

          tokenCount++;
          // Process chunk for <think> tag filtering
          thinkBuffer += chunk;

          // Check for tag transitions
          if (thinkBuffer.includes('<think>')) {
            insideThinkTag = true;
            // Extract content before tag and send it
            const beforeTag = thinkBuffer.split('<think>')[0];
            if (beforeTag) {
              onToken(beforeTag);
              accumulatedContent += beforeTag;
            }
            // Keep content after tag for next iteration
            thinkBuffer = thinkBuffer.split('<think>').pop() || '';
          }

          if (thinkBuffer.includes('</think>')) {
            insideThinkTag = false;
            // Extract content after closing tag
            const afterTag = thinkBuffer.split('</think>').pop() || '';
            thinkBuffer = afterTag;
          }

          // Send token based on context
          if (insideThinkTag) {
            // Send think content to onThinkToken callback if provided
            if (thinkBuffer && onThinkToken) {
              onThinkToken(thinkBuffer);
              thinkBuffer = '';
            }
          } else if (thinkBuffer) {
            // Send display content to onToken callback
            onToken(thinkBuffer);
            accumulatedContent += thinkBuffer;
            thinkBuffer = '';
          }
        },
      });

      // Calculate performance stats
      const endTime = Date.now();
      const totalDuration = (endTime - startTime) / 1000;
      const promptProcessingTime = firstTokenTime ? (firstTokenTime - startTime) / 1000 : 0;
      const generationTime = firstTokenTime ? (endTime - firstTokenTime) / 1000 : totalDuration;
      const generationSpeed = generationTime > 0 ? tokenCount / generationTime : 0;
      const overallSpeed = tokenCount / totalDuration;

      console.log('[IntegratedAIService] === STREAMING COMPLETE ===');
      console.log(`[IntegratedAIService] Tokens generated: ${tokenCount}`);
      console.log(`[IntegratedAIService] Prompt processing: ${promptProcessingTime.toFixed(2)}s`);
      console.log(`[IntegratedAIService] Token generation: ${generationTime.toFixed(2)}s`);
      console.log(`[IntegratedAIService] Generation speed: ${generationSpeed.toFixed(2)} tokens/sec`);
      console.log(`[IntegratedAIService] Total duration: ${totalDuration.toFixed(2)}s (${overallSpeed.toFixed(2)} t/s overall)`);
      console.log(`[IntegratedAIService] GPU Layers: 37/37 (full GPU offload)`);
      console.log(`[IntegratedAIService] Response length: ${accumulatedContent.length} chars`);

      // Extract sources after completion
      if (request.context && onSources && accumulatedContent) {
        const sources = extractSources(accumulatedContent, request.context);
        errorLogger.logError('Sources extracted from Qwen 3 response', {
          type: 'info',
          sourcesCount: sources.length,
        });
        onSources(sources);
      }

      errorLogger.logError('Qwen 3 8B streaming complete', {
        type: 'info',
        tokenCount,
        totalDuration: totalDuration.toFixed(2),
        generationSpeed: generationSpeed.toFixed(2),
      });

      // CRITICAL: Dispose sequence to clear KV cache and prevent VRAM accumulation
      await contextSequence.dispose();
      console.log('[IntegratedAIService] Sequence disposed - KV cache cleared');

      onComplete();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      errorLogger.logError(error as Error, {
        context: 'IntegratedAIService.streamChat',
      });

      // Clean up sequence even on error (if it was created)
      if (contextSequence) {
        try {
          await contextSequence.dispose();
          console.log('[IntegratedAIService] Sequence disposed after error');
        } catch (disposeError) {
          console.error('[IntegratedAIService] Failed to dispose sequence:', disposeError);
        }
      }

      onError(errorMessage);
    }
  }

  /**
   * Streaming chat with Qwen 3 8B + Function Calling
   *
   * This method enables AI to call functions like store_case_fact and get_case_facts.
   * Uses node-llama-cpp's built-in function calling with LlamaChatSession.
   * Functions are automatically executed when AI uses [[call: function()]] syntax.
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
    onError: (error: string) => void
  ): Promise<void> {
    console.log('[IntegratedAIService] streamChatWithFunctions() called with caseId:', caseId);

    let contextSequence: any = null;

    try {
      // Ensure initialized
      const status = await this.checkConnection();
      if (!status.connected) {
        onError(`Integrated AI not ready: ${status.error}`);
        return;
      }

      // Load facts if caseId provided (for system prompt injection)
      let facts: any[] = [];
      if (caseId && this.caseFactsRepository) {
        try {
          facts = this.caseFactsRepository.findByCaseId(caseId);
          console.log(`[IntegratedAIService] Loaded ${facts.length} fact(s) for case ${caseId}`);
        } catch (error) {
          console.error('[IntegratedAIService] Failed to load facts:', error);
          // Continue with empty facts - don't fail the entire request
        }
      }

      // Import required classes
      const { LlamaChatSession } = await import('node-llama-cpp');
      const { aiFunctions } = await import('./ai-functions.js');

      // Build system prompt with facts
      const systemPrompt = this.getQwen3SystemPrompt(request.context, facts);

      // Create fresh sequence
      contextSequence = this.context.getSequence();

      // Create chat session with function calling enabled
      const chatSession = new LlamaChatSession({
        contextSequence,
        systemPrompt,
      });

      // Get only the most recent user message
      const lastUserMessage = [...request.messages]
        .reverse()
        .find((msg) => msg.role === 'user');
      const userPrompt = lastUserMessage?.content || '';

      if (!userPrompt) {
        throw new Error('No user message found in request');
      }

      console.log('[IntegratedAIService] Starting inference with function calling enabled');

      let tokenCount = 0;
      const startTime = Date.now();
      let firstTokenTime: number | null = null;

      // Stream with function calling enabled
      // Note: node-llama-cpp automatically executes functions when AI uses [[call: function()]] syntax
      // Function results are automatically sent back to AI as [[result: {...}]]
      await chatSession.prompt(userPrompt.trim(), {
        temperature: request.config?.temperature ?? this.config.temperature,
        maxTokens: request.config?.maxTokens ?? this.config.maxTokens,
        functions: aiFunctions, // 🔥 Enable function calling (auto-executed)
        onTextChunk: (chunk: string) => {
          if (firstTokenTime === null) {
            firstTokenTime = Date.now();
          }
          tokenCount++;
          onToken(chunk);
        },
      });

      // Performance stats
      const endTime = Date.now();
      const totalDuration = (endTime - startTime) / 1000;
      console.log('[IntegratedAIService] === STREAMING COMPLETE ===');
      console.log(`[IntegratedAIService] Tokens: ${tokenCount}, Duration: ${totalDuration.toFixed(2)}s`);

      // Dispose sequence
      await contextSequence.dispose();
      console.log('[IntegratedAIService] Sequence disposed');

      onComplete();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      errorLogger.logError(error as Error, {
        context: 'IntegratedAIService.streamChatWithFunctions',
      });

      // Clean up sequence on error
      if (contextSequence) {
        try {
          await contextSequence.dispose();
        } catch (disposeError) {
          console.error('[IntegratedAIService] Failed to dispose sequence:', disposeError);
        }
      }

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

    errorLogger.logError('Integrated AI configuration updated', {
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
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    try {
      if (this.context) {
        await this.context.dispose();
        this.context = null;
      }
      if (this.model) {
        await this.model.dispose();
        this.model = null;
      }
      if (this.llama) {
        await this.llama.dispose();
        this.llama = null;
      }

      this.isInitialized = false;

      errorLogger.logError('IntegratedAIService disposed', { type: 'info' });
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'IntegratedAIService.dispose',
      });
    }
  }
}
