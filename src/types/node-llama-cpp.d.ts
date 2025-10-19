/**
 * Type definitions for node-llama-cpp
 * This module is optional and used for local AI processing
 */

declare module 'node-llama-cpp' {
  export enum LlamaLogLevel {
    disabled = 'disabled',
    fatal = 'fatal',
    error = 'error',
    warn = 'warn',
    info = 'info',
    debug = 'debug'
  }

  export interface LlamaModel {
    // Add minimal types as needed
    [key: string]: unknown;
  }

  export interface LlamaContext {
    [key: string]: unknown;
  }

  export class LlamaChatSession {
    constructor(...args: unknown[]);
    prompt(message: string, options?: unknown): Promise<string>;
    [key: string]: unknown;
  }

  export interface LlamaOptions {
    modelPath?: string;
    logLevel?: LlamaLogLevel;
    [key: string]: unknown;
  }

  export interface Llama {
    loadModel(options: LlamaOptions): Promise<LlamaModel>;
    [key: string]: unknown;
  }

  // Add other exports as needed
  export function getLlama(options?: { logLevel?: LlamaLogLevel }): Promise<Llama>;
  export function createContext(...args: unknown[]): Promise<unknown>;

  // Allow default import
  const nodeLlamaCpp: unknown;
  export default nodeLlamaCpp;
}
