/**
 * Type declarations for node-llama-cpp
 *
 * This declaration file allows TypeScript compilation without installing
 * the ~4.5GB node-llama-cpp package. The actual package can be installed
 * later for local AI features.
 *
 * Dynamic imports in IntegratedAIService will work at runtime if the package is installed.
 */

declare module 'node-llama-cpp' {
  export enum LlamaLogLevel {
    disabled = 0,
    fatal = 1,
    error = 2,
    warn = 3,
    info = 4,
    debug = 5,
  }

  export interface LlamaOptions {
    logLevel?: LlamaLogLevel;
  }

  export interface Llama {
    gpu: string | null;
    loadModel(options: any): Promise<any>;
    dispose(): Promise<void>;
  }

  export function getLlama(options?: LlamaOptions): Promise<Llama>;

  export class LlamaChatSession {
    constructor(options: {
      contextSequence: any;
      systemPrompt?: string;
    });

    prompt(
      text: string,
      options?: {
        temperature?: number;
        maxTokens?: number;
        functions?: any;
        onTextChunk?: (chunk: string) => void;
      }
    ): Promise<string>;
  }

  // Export other types as needed
  export type LlamaModel = any;
  export type LlamaContext = any;
  export type LlamaContextSequence = any;
}
