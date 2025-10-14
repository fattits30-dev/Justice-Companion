/**
 * AI Services Lazy Loading Module
 *
 * Provides lazy initialization of AI services to improve startup performance.
 * AI services are only loaded when first AI request is made, saving 100-200ms at startup.
 *
 * @module ai-lazy-loader
 */

import { aiServiceFactory } from '../src/services/AIServiceFactory';
import { caseFactsRepository } from '../src/repositories/CaseFactsRepository';
import { errorLogger } from '../src/utils/error-logger';

/**
 * Global state tracking whether AI services have been initialized
 */
let aiServicesInitialized = false;

/**
 * Mutex to prevent concurrent initialization attempts
 */
let initializationInProgress = false;

/**
 * Promise that resolves when initialization completes
 * Used to handle concurrent requests during initialization
 */
let initializationPromise: Promise<void> | null = null;

/**
 * Ensures AI services are ready for use.
 *
 * This function implements lazy initialization of AI services:
 * - On first call: Initializes AI services and logs timing
 * - On subsequent calls: Returns immediately (already initialized)
 * - Thread-safe: Handles concurrent calls during initialization
 *
 * @returns {Promise<void>} Resolves when AI services are ready
 * @throws {Error} If AI service initialization fails
 *
 * @example
 * ```typescript
 * // In IPC handler
 * try {
 *   await ensureAIServicesReady();
 *   // Now safe to use AI services
 *   const response = await aiServiceFactory.chat(request);
 * } catch (error) {
 *   // Handle initialization failure
 * }
 * ```
 */
export async function ensureAIServicesReady(): Promise<void> {
  // Fast path: Already initialized
  if (aiServicesInitialized) {
    return;
  }

  // Handle concurrent initialization requests
  if (initializationInProgress) {
    // Wait for ongoing initialization to complete
    if (initializationPromise) {
      return initializationPromise;
    }
  }

  // Start initialization
  initializationInProgress = true;
  const startTime = Date.now();

  // Create initialization promise for concurrent requests
  initializationPromise = (async () => {
    try {
      errorLogger.logError('[AI] Starting lazy initialization of AI services', {
        type: 'info',
      });

      // Step 1: Inject CaseFactRepository into AIServiceFactory
      // This enables AI to access stored facts for context-aware responses
      try {
        aiServiceFactory.setCaseFactsRepository(caseFactsRepository);
        errorLogger.logError('[AI] CaseFactRepository injected successfully', {
          type: 'info',
        });
      } catch (error) {
        errorLogger.logError(error as Error, {
          context: 'ai-service-factory-injection'
        });
        // Non-fatal: AI can work without facts, just with reduced capabilities
        errorLogger.logError(
          '[AI] WARNING: Failed to inject repository - AI will not have access to stored facts',
          {
            type: 'warn',
          }
        );
      }

      // Step 2: Initialize integrated AI service if model is available
      // This checks for local Qwen model and prepares it for use
      try {
        if (aiServiceFactory.isModelAvailable()) {
          const initialized = await aiServiceFactory.initialize();
          if (initialized) {
            errorLogger.logError('[AI] Integrated AI model initialized successfully', {
              type: 'info',
            });
          } else {
            errorLogger.logError('[AI] Integrated AI model initialization failed', {
              type: 'warn',
            });
          }
        } else {
          errorLogger.logError('[AI] No local AI model available, will use OpenAI if configured', {
            type: 'info',
          });
        }
      } catch (error) {
        errorLogger.logError(error as Error, {
          context: 'integrated-ai-initialization',
        });
        // Non-fatal: Can still use OpenAI if configured
      }

      // Mark as initialized
      aiServicesInitialized = true;

      // Log timing information
      const initTime = Date.now() - startTime;
      errorLogger.logError(`[AI] Services initialized in ${initTime}ms`, {
        type: 'info',
        timing: {
          initializationTime: initTime,
          firstRequest: true,
        },
      });

    } catch (error) {
      // Reset state on failure
      aiServicesInitialized = false;

      errorLogger.logError(error as Error, {
        context: 'ai-services-lazy-initialization',
        fatal: false, // AI is optional, don't crash the app
      });

      // Re-throw to notify caller
      throw new Error(
        `Failed to initialize AI services: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      // Clear initialization state
      initializationInProgress = false;
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Checks if AI services are initialized (for debugging/monitoring)
 *
 * @returns {boolean} True if AI services are initialized
 */
export function areAIServicesInitialized(): boolean {
  return aiServicesInitialized;
}

/**
 * Force reset AI services state (for testing)
 *
 * @internal
 */
export function resetAIServicesState(): void {
  aiServicesInitialized = false;
  initializationInProgress = false;
  initializationPromise = null;
}