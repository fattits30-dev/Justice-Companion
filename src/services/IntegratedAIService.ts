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

      // Load model with AMD GPU acceleration
      this.model = await this.llama.loadModel({
        modelPath: this.modelPath,
        gpuLayers: 'max', // Offload all layers to AMD GPU via Vulkan
      });

      errorLogger.logError('Creating context (4096 tokens)', {
        type: 'info',
      });

      // Create context for legal document analysis
      this.context = await this.model.createContext({
        contextSize: 4096, // Sufficient for legal documents
      });

      errorLogger.logError('IntegratedAIService fully initialized', {
        type: 'info',
        gpu: this.llama.gpu,
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
    return `You are a professional UK legal assistant powered by Qwen 3. Your role is to help users understand UK law.

IMPORTANT GUIDELINES:
- You provide legal information, NOT legal advice
- Always cite sources when discussing specific laws or cases
- Use <think> tags for complex legal reasoning (hidden from user)
- Be clear, professional, and precise
- If uncertain, acknowledge limitations

Format for legal citations:
- Legislation: "Section X of the [Act Name] [Year]"
- Case law: "[Case Name] [Year] [Court]"`;
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
    try {
      // Ensure initialized
      const status = await this.checkConnection();
      if (!status.connected) {
        onError(`Integrated AI not ready: ${status.error}`);
        return;
      }

      // Import session class
      const { LlamaChatSession } = await import('node-llama-cpp');

      // Build system prompt
      const systemPrompt = this.getQwen3SystemPrompt(request.context);

      // Create chat session
      const chatSession = new LlamaChatSession({
        contextSequence: this.context.getSequence(),
        systemPrompt,
      });

      // Build user message from history
      let userPrompt = '';
      for (const msg of request.messages) {
        if (msg.role === 'user') {
          userPrompt += msg.content + '\n';
        } else if (msg.role === 'assistant') {
          // For multi-turn, we'd need to call chatSession.prompt() for each turn
          // For now, simplified to single-turn
        }
      }

      errorLogger.logError('Starting Qwen 3 8B streaming inference', {
        type: 'info',
        gpu: this.llama.gpu,
      });

      let accumulatedContent = '';
      let insideThinkTag = false;
      let thinkBuffer = '';

      // Stream tokens
      await chatSession.prompt(userPrompt.trim(), {
        temperature: request.config?.temperature ?? this.config.temperature,
        maxTokens: request.config?.maxTokens ?? this.config.maxTokens,
        onTextChunk: (chunk: string) => {
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

      // Extract sources after completion
      if (request.context && onSources && accumulatedContent) {
        const sources = extractSources(accumulatedContent, request.context);
        errorLogger.logError('Sources extracted from Qwen 3 response', {
          type: 'info',
          sourcesCount: sources.length,
        });
        onSources(sources);
      }

      errorLogger.logError('Qwen 3 8B streaming complete', { type: 'info' });
      onComplete();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      errorLogger.logError(error as Error, {
        context: 'IntegratedAIService.streamChat',
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
