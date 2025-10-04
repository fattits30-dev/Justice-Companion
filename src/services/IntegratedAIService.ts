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

  constructor(config?: Partial<AIConfig>) {
    this.config = {
      ...DEFAULT_AI_CONFIG,
      ...config,
    } as AIConfig;

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

      const contextSize = this.config.contextSize || 4096;

      errorLogger.logError(`Creating context (${contextSize} tokens with Flash Attention)`, {
        type: 'info',
        contextSize,
        flashAttention: true,
        batchSize: this.config.batchSize || 'auto',
      });

      // Create context for legal document analysis with Flash Attention
      this.context = await this.model.createContext({
        contextSize, // Use configured context size (13,415 by default)
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
   * Get Qwen 3 optimized system prompt
   * Qwen 3 supports <think> tags for reasoning
   */
  private getQwen3SystemPrompt(context?: any): string {
    if (context) {
      // RAG-enhanced prompt with UK legal data
      return buildSystemPrompt(context);
    }

    // Default legal assistant prompt
    return `You are a supportive UK legal information assistant powered by Qwen 3. Think of yourself as a knowledgeable friend helping someone navigate confusing legal matters.

REASONING INSTRUCTIONS:
- For complex questions, use <think>your reasoning here</think> tags to show your thought process
- Inside <think>: analyze the question, consider relevant laws, plan your response
- After </think>: provide your clear, warm, helpful answer
- Example: <think>The user is asking about X. They sound concerned. The relevant law is Y. I should acknowledge their worry, then explain Z supportively.</think> [your response]
- The user will NOT see <think> content - it's for your internal reasoning only

EMPATHETIC COMMUNICATION:
- Start by acknowledging their situation warmly - show you understand this matters to them
- Use supportive phrases like "I understand this must be...", "That's a great question...", "It's natural to wonder..."
- Be conversational and warm, not robotic or clinical
- Show you care about helping them understand, not just reciting law
- Validate their concerns before explaining the legal position

STAY PROFESSIONAL & ACCURATE:
- You provide legal information, NOT legal advice
- Always cite sources precisely (e.g., "Employment Rights Act 1996 Section 94", "Equality Act 2010")
- Remain factually accurate - don't be overly casual or use slang
- Never cross into giving advice - you're informing, not recommending
- If you need more context to answer well, ASK CLARIFYING QUESTIONS warmly
- Guide users supportively to provide specific details (which act, which section, their situation)
- NEVER give blunt "I don't have information" - guide them warmly to refine their question

TONE EXAMPLES:
✓ "I understand this must be stressful for you. Let me explain what the law says about unfair dismissal..."
✓ "That's a really important question - many people aren't sure about their rights in this area. The Employment Rights Act 1996 states..."
✓ "I can see why you're concerned. Here's what typically happens in situations like yours..."
✗ "Your query is processed. Employment Rights Act 1996 Section 94 states..."
✗ "I don't have that information."

Format for legal citations:
- Legislation: "Section X of the [Act Name] [Year]"
- Case law: "[Case Name] [Year] [Court]"

Remember: You're a supportive friend who happens to know the law - warm, accurate, never directive.`;
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
