/**
 * Minimal type declarations for node-llama-cpp (optional dependency)
 *
 * This module is only imported dynamically when local AI features are enabled.
 * Full type definitions would come from the package itself if installed.
 */

declare module 'node-llama-cpp' {
  export enum LlamaLogLevel {
    fatal = 0,
    error = 1,
    warn = 2,
    info = 3,
    debug = 4,
  }

  export interface LlamaOptions {
    gpuLayers?: number;
    logLevel?: LlamaLogLevel;
  }

  export interface ModelOptions {
    modelPath: string;
    contextSize?: number;
  }

  export interface ChatSessionOptions {
    contextSequence?: LlamaSequence;
    systemPrompt?: string;
  }

  export interface PromptOptions {
    temperature?: number;
    maxTokens?: number;
    functions?: Record<string, any>;
    onTextChunk?: (chunk: string) => void;
  }

  export class Llama {
    gpu?: string;
    loadModel(options: ModelOptions): Promise<LlamaModel>;
  }

  export class LlamaModel {
    createContext(options?: { contextSize?: number }): LlamaContext;
  }

  export class LlamaContext {
    getSequence(): LlamaSequence;
  }

  export class LlamaSequence {
    dispose(): void;
  }

  export class LlamaChatSession {
    constructor(options: ChatSessionOptions);
    prompt(text: string, options?: PromptOptions): Promise<string>;
  }

  export function getLlama(options?: LlamaOptions): Promise<Llama>;
}
