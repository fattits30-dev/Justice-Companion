/**
 * UnifiedAIService - Multi-Provider AI Service
 *
 * Supports 10 AI providers with unified interface:
 * - OpenAI, Anthropic, Qwen, Hugging Face, Google, Cohere, Together, Anyscale, Mistral, Perplexity
 *
 * Features:
 * - Streaming responses with token-by-token delivery
 * - Provider auto-detection and configuration
 * - OpenAI-compatible API for most providers
 * - Secure API key management
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { HfInference } from "@huggingface/inference";
import type {
  AIProviderConfig,
  AIProviderType,
  ChatMessage,
  StreamingCallbacks,
} from "../types/ai-providers.ts";
import { AI_PROVIDER_METADATA } from "../types/ai-providers.ts";
import { errorLogger } from "../utils/error-logger.ts";
import type {
  CaseAnalysisRequest,
  CaseAnalysisResponse,
  EvidenceAnalysisRequest,
  EvidenceAnalysisResponse,
  DocumentDraftRequest,
  DocumentDraftResponse,
} from "../types/ai-analysis.ts";
import {
  buildCaseAnalysisPrompt,
  buildEvidenceAnalysisPrompt,
  buildDocumentDraftPrompt,
} from "../core/ai/prompts/analysis-prompts.ts";
import { getToolsForProvider } from "./AIToolDefinitions.ts";
import { logger } from "../utils/logger.ts";

export class UnifiedAIService {
  private config: AIProviderConfig;
  private client: OpenAI | Anthropic | HfInference | null = null;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize the appropriate API client based on provider
   */
  private initializeClient(): void {
    const { provider, apiKey, endpoint } = this.config;
    const metadata = AI_PROVIDER_METADATA[provider];
    const baseURL = endpoint || metadata.defaultEndpoint;

    switch (provider) {
      case "anthropic":
        this.client = new Anthropic({
          apiKey,
          baseURL,
        });
        break;

      case "openai":
      case "together":
      case "anyscale":
      case "mistral":
      case "perplexity":
      case "huggingface":
        // These providers use OpenAI-compatible API
        this.client = new OpenAI({
          apiKey,
          baseURL,
          dangerouslyAllowBrowser: false,
        });
        break;

      case "google":
        // Google Gemini requires special handling - use OpenAI-compatible wrapper for now
        this.client = new OpenAI({
          apiKey,
          baseURL: `${baseURL}/models`,
          dangerouslyAllowBrowser: false,
        });
        break;

      case "cohere":
        // Cohere uses OpenAI-compatible API
        this.client = new OpenAI({
          apiKey,
          baseURL,
          dangerouslyAllowBrowser: false,
        });
        break;

      case "qwen":
        // Qwen 2.5-72B uses HuggingFace Inference API
        this.client = new HfInference(apiKey);
        break;

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Update service configuration and reinitialize client
   */
  updateConfig(config: AIProviderConfig): void {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.config.apiKey.length > 0;
  }

  /**
   * Get current provider type
   */
  getProvider(): AIProviderType {
    return this.config.provider;
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Stream chat completion with token-by-token delivery
   *
   * @param messages - Chat history (system, user, assistant messages)
   * @param callbacks - Streaming callbacks
   */
  async streamChat(
    messages: ChatMessage[],
    callbacks: StreamingCallbacks,
  ): Promise<void> {
    if (!this.client) {
      callbacks.onError(
        new Error(`${this.config.provider} client not configured`),
      );
      return;
    }

    try {
      // Handle Anthropic differently (uses different SDK)
      if (this.config.provider === "anthropic") {
        await this.streamAnthropicChat(messages, callbacks);
        return;
      }

      // Handle Qwen (HuggingFace Inference API)
      if (this.config.provider === "qwen") {
        await this.streamQwenChat(messages, callbacks);
        return;
      }

      // All other providers use OpenAI-compatible streaming
      await this.streamOpenAICompatibleChat(messages, callbacks);
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "UnifiedAIService",
          provider: this.config.provider,
          model: this.config.model,
          operation: "streamChat",
        },
      );
      callbacks.onError(
        error instanceof Error ? error : new Error("Unknown streaming error"),
      );
    }
  }

  /**
   * Stream chat for Anthropic (Claude) - uses different API format
   */
  private async streamAnthropicChat(
    messages: ChatMessage[],
    callbacks: StreamingCallbacks,
  ): Promise<void> {
    const client = this.client as Anthropic;
    let fullResponse = "";
    const functionCalls: Array<{
      id: string;
      name: string;
      arguments: string;
    }> = [];

    // Get tools for Anthropic
    const tools = getToolsForProvider(this.config.provider);

    // Anthropic requires system message separate
    const systemMessage =
      messages.find((m) => m.role === "system")?.content || "";
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Prepare request parameters
    const requestParams: any = {
      model: this.config.model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature || 0.7,
      stream: true,
    };

    // Add tools if available (Anthropic uses "tools" parameter)
    if (tools && tools.length > 0) {
      requestParams.tools = tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));
    }

    const stream = await client.messages.create(requestParams);

    for await (const event of stream as any) {
      // Handle text content
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const token = event.delta.text;
        fullResponse += token;
        callbacks.onToken(token);
      }

      // Handle tool use (Anthropic's function calling)
      if (
        event.type === "content_block_start" &&
        event.content_block.type === "tool_use"
      ) {
        const toolUse = event.content_block;
        functionCalls.push({
          id: toolUse.id,
          name: toolUse.name,
          arguments: "",
        });
      }

      if (
        event.type === "content_block_delta" &&
        event.delta.type === "input_json_delta"
      ) {
        // Accumulate tool input
        const lastCall = functionCalls[functionCalls.length - 1];
        if (lastCall) {
          lastCall.arguments += event.delta.partial_json;
        }
      }

      // Execute completed tool calls
      if (event.type === "content_block_stop") {
        const lastCall = functionCalls[functionCalls.length - 1];
        if (lastCall && lastCall.arguments) {
          try {
            const args = JSON.parse(lastCall.arguments);
            const tool = tools?.find((t) => t.function.name === lastCall.name);

            if (tool && tool.handler) {
              const result = await tool.handler(args);

              if (callbacks.onFunctionCall) {
                callbacks.onFunctionCall(lastCall.name, args, result);
              }

              const functionResultMessage = `Function ${lastCall.name} executed: ${JSON.stringify(result)}`;
              callbacks.onToken("\n\n" + functionResultMessage + "\n\n");
              fullResponse += "\n\n" + functionResultMessage + "\n\n";
            }
          } catch (error) {
            logger.error(`Error executing function ${lastCall.name}:`, error);
          }
        }
      }
    }

    callbacks.onComplete(fullResponse);
  }

  /**
   * Stream chat for Qwen using HuggingFace Inference API
   */
  private async streamQwenChat(
    messages: ChatMessage[],
    callbacks: StreamingCallbacks,
  ): Promise<void> {
    const client = this.client as HfInference;
    let fullResponse = "";

    try {
      const stream = client.chatCompletionStream({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: this.config.temperature || 0.3,
        max_tokens: this.config.maxTokens || 2048,
        top_p: this.config.topP || 0.9,
      });

      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
          const token = chunk.choices[0].delta?.content || "";
          if (token) {
            fullResponse += token;
            callbacks.onToken(token);
          }
        }
      }

      callbacks.onComplete(fullResponse);
    } catch (error) {
      callbacks.onError(
        error instanceof Error ? error : new Error("Qwen streaming error"),
      );
    }
  }

  /**
   * Stream chat for OpenAI-compatible providers
   * (OpenAI, Together, Anyscale, Mistral, Perplexity, Hugging Face, Google, Cohere)
   */
  private async streamOpenAICompatibleChat(
    messages: ChatMessage[],
    callbacks: StreamingCallbacks,
  ): Promise<void> {
    const client = this.client as OpenAI;
    let fullResponse = "";
    let functionCalls: Array<{ id: string; name: string; arguments: string }> =
      [];

    // Get tools for this provider
    const tools = getToolsForProvider(this.config.provider);

    // Prepare request parameters
    const requestParams: any = {
      model: this.config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 8192, // Increased for longer legal responses
      top_p: this.config.topP || 0.9,
    };

    // Add tools if supported by provider
    if (tools && tools.length > 0) {
      requestParams.tools = tools.map((tool) => ({
        type: tool.type,
        function: tool.function,
      }));
      requestParams.tool_choice = "auto";
    }

    const stream = await client.chat.completions.create(requestParams);

    for await (const chunk of stream as any) {
      const delta = chunk.choices?.[0]?.delta;

      // Handle regular content tokens
      const token = delta?.content || "";
      if (token) {
        fullResponse += token;
        callbacks.onToken(token);
      }

      // Handle function/tool calls
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          // Accumulate function call data
          const existingCall = functionCalls.find(
            (fc) => fc.id === toolCall.id,
          );

          if (existingCall) {
            // Append to existing function call arguments
            if (toolCall.function?.arguments) {
              existingCall.arguments += toolCall.function.arguments;
            }
          } else if (toolCall.id && toolCall.function?.name) {
            // New function call
            functionCalls.push({
              id: toolCall.id,
              name: toolCall.function.name,
              arguments: toolCall.function.arguments || "",
            });
          }
        }
      }

      // Check if we have complete function calls to execute
      if (
        chunk.choices?.[0]?.finish_reason === "tool_calls" &&
        functionCalls.length > 0
      ) {
        // Execute function calls
        for (const functionCall of functionCalls) {
          try {
            // Parse arguments
            const args = JSON.parse(functionCall.arguments);

            // Find the tool handler
            const tool = tools?.find(
              (t) => t.function.name === functionCall.name,
            );

            if (tool && tool.handler) {
              // Execute the function
              const result = await tool.handler(args);

              // Notify callback if provided
              if (callbacks.onFunctionCall) {
                callbacks.onFunctionCall(functionCall.name, args, result);
              }

              // Add function result to conversation for follow-up
              // This would typically be sent back to the model for continuation
              const functionResultMessage = `Function ${functionCall.name} executed successfully: ${JSON.stringify(result)}`;
              callbacks.onToken("\n\n" + functionResultMessage + "\n\n");
              fullResponse += "\n\n" + functionResultMessage + "\n\n";
            } else {
              logger.warn(
                `No handler found for function: ${functionCall.name}`,
              );
            }
          } catch (error) {
            logger.error(
              `Error executing function ${functionCall.name}:`,
              error,
            );
            if (callbacks.onError) {
              callbacks.onError(
                new Error(`Function call failed: ${functionCall.name}`),
              );
            }
          }
        }

        // Clear function calls for next iteration
        functionCalls = [];
      }
    }

    callbacks.onComplete(fullResponse);
  }

  /**
   * Non-streaming chat completion (fallback)
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.client) {
      throw new Error(`${this.config.provider} client not configured`);
    }

    try {
      // Handle Anthropic differently
      if (this.config.provider === "anthropic") {
        return await this.chatAnthropicNonStreaming(messages);
      }

      // Handle Qwen (HuggingFace Inference API)
      if (this.config.provider === "qwen") {
        return await this.chatQwenNonStreaming(messages);
      }

      // All other providers use OpenAI-compatible API
      return await this.chatOpenAICompatibleNonStreaming(messages);
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "UnifiedAIService",
          provider: this.config.provider,
          model: this.config.model,
          operation: "chat",
        },
      );
      throw error;
    }
  }

  /**
   * Non-streaming chat for Anthropic
   */
  private async chatAnthropicNonStreaming(
    messages: ChatMessage[],
  ): Promise<string> {
    const client = this.client as Anthropic;

    // Get tools for Anthropic
    const tools = getToolsForProvider(this.config.provider);

    const systemMessage =
      messages.find((m) => m.role === "system")?.content || "";
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Prepare request parameters
    const requestParams: any = {
      model: this.config.model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature || 0.7,
    };

    // Add tools if available
    if (tools && tools.length > 0) {
      requestParams.tools = tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));
    }

    const response = await client.messages.create(requestParams);
    let result = "";

    for (const content of response.content) {
      if (content.type === "text") {
        result += content.text;
      } else if (content.type === "tool_use") {
        // Handle tool use in non-streaming mode
        try {
          const tool = tools?.find((t) => t.function.name === content.name);
          if (tool && tool.handler) {
            const functionResult = await tool.handler(content.input);
            result += `\n\nFunction ${content.name} executed: ${JSON.stringify(functionResult)}`;
          }
        } catch (error) {
          logger.error(`Error executing function ${content.name}:`, error);
        }
      }
    }

    return result;
  }

  /**
   * Non-streaming chat for Qwen using HuggingFace Inference API
   */
  private async chatQwenNonStreaming(messages: ChatMessage[]): Promise<string> {
    const client = this.client as HfInference;

    try {
      logger.warn("[UnifiedAIService] Calling HuggingFace Inference API...");
      logger.warn("[UnifiedAIService] Model:", this.config.model);
      logger.warn(
        "[UnifiedAIService] Endpoint:",
        this.config.endpoint || "default",
      );
      logger.warn("[UnifiedAIService] Message count:", messages.length);

      const response = await client.chatCompletion({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: this.config.temperature || 0.3,
        max_tokens: this.config.maxTokens || 2048,
        top_p: this.config.topP || 0.9,
      });

      logger.warn("[UnifiedAIService] Response received successfully");
      return response.choices[0]?.message?.content || "";
    } catch (error) {
      logger.error("[UnifiedAIService] HuggingFace API Error Details:");

      if (error instanceof Error) {
        logger.error("Error type:", error.constructor.name);
        logger.error("Error message:", error.message);
        const apiError = error as any; // Type assertion for API-specific properties
        logger.error("Error status:", apiError.status || "N/A");
        logger.error(
          "Error response:",
          apiError.response?.data || apiError.response || "N/A",
        );
        logger.error("Full error:", error);
        throw new Error(
          `Failed to perform inference: ${error.message}${apiError.status ? ` (HTTP ${apiError.status})` : ""}`,
        );
      }

      logger.error("Unknown error:", error);
      throw new Error("Failed to perform inference: Unknown error");
    }
  }

  /**
   * Non-streaming chat for OpenAI-compatible providers
   */
  private async chatOpenAICompatibleNonStreaming(
    messages: ChatMessage[],
  ): Promise<string> {
    const client = this.client as OpenAI;

    // Get tools for this provider
    const tools = getToolsForProvider(this.config.provider);

    // Prepare request parameters
    const requestParams: any = {
      model: this.config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 2048,
      top_p: this.config.topP || 0.9,
    };

    // Add tools if supported
    if (tools && tools.length > 0) {
      requestParams.tools = tools.map((tool) => ({
        type: tool.type,
        function: tool.function,
      }));
      requestParams.tool_choice = "auto";
    }

    const completion = await client.chat.completions.create(requestParams);
    const message = completion.choices[0]?.message;

    // Handle tool calls if present
    if (message?.tool_calls && message.tool_calls.length > 0) {
      let result = message.content || "";

      for (const toolCall of message.tool_calls) {
        if (toolCall.type === "function" && toolCall.function) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const tool = tools?.find(
              (t) => t.function.name === toolCall.function.name,
            );

            if (tool && tool.handler) {
              const functionResult = await tool.handler(args);
              result += `\n\nFunction ${toolCall.function.name} executed: ${JSON.stringify(functionResult)}`;
            }
          } catch (error) {
            logger.error(
              `Error executing function ${toolCall.function.name}:`,
              error,
            );
          }
        }
      }

      return result;
    }

    return message?.content || "";
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities() {
    const metadata = AI_PROVIDER_METADATA[this.config.provider];
    return {
      name: metadata.name,
      supportsStreaming: metadata.supportsStreaming,
      maxContextTokens: metadata.maxContextTokens,
      currentModel: this.config.model,
      endpoint: this.config.endpoint || metadata.defaultEndpoint,
    };
  }

  /**
   * Analyze a case and provide structured legal analysis
   */
  async analyzeCase(
    request: CaseAnalysisRequest,
  ): Promise<CaseAnalysisResponse> {
    if (!this.client) {
      throw new Error(`${this.config.provider} client not configured`);
    }

    try {
      const prompt = buildCaseAnalysisPrompt(request);
      const messages: ChatMessage[] = [
        {
          role: "user",
          content: prompt,
        },
      ];

      const response = await this.chat(messages);

      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch =
        response.match(/```json\n?([\s\S]*?)\n?```/) ||
        response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;

      const analysis: CaseAnalysisResponse = JSON.parse(jsonStr);
      return analysis;
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "UnifiedAIService",
          provider: this.config.provider,
          operation: "analyzeCase",
          caseId: request.caseId,
        },
      );
      throw new Error("Failed to analyze case. Please try again.");
    }
  }

  /**
   * Analyze evidence and identify gaps
   */
  async analyzeEvidence(
    request: EvidenceAnalysisRequest,
  ): Promise<EvidenceAnalysisResponse> {
    if (!this.client) {
      throw new Error(`${this.config.provider} client not configured`);
    }

    try {
      const prompt = buildEvidenceAnalysisPrompt(request);
      const messages: ChatMessage[] = [
        {
          role: "user",
          content: prompt,
        },
      ];

      const response = await this.chat(messages);

      // Extract JSON from response
      const jsonMatch =
        response.match(/```json\n?([\s\S]*?)\n?```/) ||
        response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;

      const analysis: EvidenceAnalysisResponse = JSON.parse(jsonStr);
      return analysis;
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "UnifiedAIService",
          provider: this.config.provider,
          operation: "analyzeEvidence",
          caseId: request.caseId,
        },
      );
      throw new Error("Failed to analyze evidence. Please try again.");
    }
  }

  /**
   * Draft a legal document
   */
  async draftDocument(
    request: DocumentDraftRequest,
  ): Promise<DocumentDraftResponse> {
    if (!this.client) {
      throw new Error(`${this.config.provider} client not configured`);
    }

    try {
      const prompt = buildDocumentDraftPrompt(request);
      const messages: ChatMessage[] = [
        {
          role: "user",
          content: prompt,
        },
      ];

      const response = await this.chat(messages);

      // Extract JSON from response
      const jsonMatch =
        response.match(/```json\n?([\s\S]*?)\n?```/) ||
        response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;

      const draft: DocumentDraftResponse = JSON.parse(jsonStr);
      return draft;
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "UnifiedAIService",
          provider: this.config.provider,
          operation: "draftDocument",
          documentType: request.documentType,
        },
      );
      throw new Error("Failed to draft document. Please try again.");
    }
  }

  /**
   * Extract structured case data from document
   * Used for AI-assisted case creation with user confirmation
   */
  async extractCaseDataFromDocument(
    parsedDoc: {
      filename: string;
      text: string;
      wordCount: number;
      fileType: string;
    },
    userProfile: { name: string; email: string | null },
    userQuestion?: string,
  ): Promise<{ analysis: string; suggestedCaseData: any }> {
    if (!this.client) {
      throw new Error(`${this.config.provider} client not configured`);
    }

    try {
      // Dual-purpose prompt: conversational analysis + structured extraction
      const extractionPrompt = `You are a UK civil legal assistant analyzing a document for ${userProfile.name || "someone"} who just uploaded it.

IMPORTANT CONTEXT:
- USER'S REGISTERED NAME: ${userProfile.name || "Not provided"}
- This app is personalized for ${userProfile.name || "this user"}

VERIFICATION STEP (LENIENT):
- Extract any claimant/applicant name mentioned in the document
- Compare it to the user's registered name: ${userProfile.name || "Not provided"}
- IMPORTANT: Normalize both names (lowercase, remove extra spaces) before comparing
- ONLY flag as mismatch if the names are CLEARLY DIFFERENT (e.g., "John Smith" vs "Jane Doe")
- Minor variations are OK: "Test User", "test user", "TEST USER" all match
- If the document mentions a CLEARLY DIFFERENT person's name as the claimant:
  * Flag this as "documentOwnershipMismatch": true
  * Include "documentClaimantName": "[name from document]"
  * Warn the user that this appears to be someone else's document
- If names match (even with case/spacing variations) or no claimant name in document → proceed normally

TASK 1: Provide a conversational analysis (talk DIRECTLY to ${userProfile.name || "the user"})
- ONLY show this warning if there's a CLEAR name mismatch (completely different person):
  "⚠️ IMPORTANT: This document appears to be for [NAME], not you. I'm designed to assist YOU (${userProfile.name || "the registered user"}) with your personalized legal matters.
  I can provide general information, but for best results, [NAME] should download Justice Companion for their own secure, personalized assistance."
- What type of document is this?
- Point out obvious legal issues or red flags
- Explain key information about dates, deadlines, amounts, rights
- If document is for user: speak in second person ("your case", "you")
- If document is for someone else: speak in third person ("their case", "they")
- ALWAYS end with actionable suggestions for next steps

TASK 2: Extract structured data for case creation (return as JSON at the end)
- ALWAYS extract structured data regardless of ownership mismatch
- DO NOT include claimant name in JSON (it will be set automatically to: ${userProfile.name || "user"})
- Extract data based on document content, not user identity

DOCUMENT: ${parsedDoc.filename}
FILE TYPE: ${parsedDoc.fileType.toUpperCase()}
LENGTH: ${parsedDoc.wordCount} words

CONTENT:
${parsedDoc.text}

${userQuestion ? `\nUSER QUESTION: "${userQuestion}"` : ""}

Provide your response in TWO parts:

PART 1 - Conversational Analysis (plain text):
[Your friendly analysis talking directly to the user, ending with actionable suggestions]

PART 2 - Structured Data (JSON format):
\`\`\`json
{
  "documentOwnershipMismatch": false,
  "documentClaimantName": null,
  "title": "Brief descriptive case title",
  "caseType": "employment|housing|consumer|family|other",
  "description": "2-3 sentence summary of the case",
  "opposingParty": "Full legal name if found, otherwise null",
  "caseNumber": "Case reference if found, otherwise null",
  "courtName": "Court/tribunal name if found, otherwise null",
  "filingDeadline": "YYYY-MM-DD if deadline mentioned, otherwise null",
  "nextHearingDate": "YYYY-MM-DD if hearing mentioned, otherwise null",
  "confidence": {
    "title": 0.0-1.0,
    "caseType": 0.0-1.0,
    "description": 0.0-1.0,
    "opposingParty": 0.0-1.0,
    "caseNumber": 0.0-1.0,
    "courtName": 0.0-1.0,
    "filingDeadline": 0.0-1.0,
    "nextHearingDate": 0.0-1.0
  },
  "extractedFrom": {
    "title": { "source": "location in document", "text": "exact text" },
    "description": { "source": "location in document", "text": "exact text" },
    "opposingParty": { "source": "location in document", "text": "exact text" },
    "caseNumber": { "source": "location in document", "text": "exact text" },
    "courtName": { "source": "location in document", "text": "exact text" },
    "filingDeadline": { "source": "location in document", "text": "exact text" },
    "nextHearingDate": { "source": "location in document", "text": "exact text" }
  }
}
\`\`\`

OWNERSHIP VERIFICATION FIELDS:
- "documentOwnershipMismatch": true if document mentions a different claimant name than ${userProfile.name || "the user"}
- "documentClaimantName": "Name from document" if mismatch detected, otherwise null

IMPORTANT:
- ALWAYS extract structured data from document content regardless of ownership
- Use confidence scores honestly (low confidence if unsure)
- Provide extraction sources for transparency
- Use null for fields not found in document
- Case type should be one of: employment, housing, consumer, family, other
- End PART 1 with suggestions like "Would you like me to create a case file from this document?" or "If you have additional evidence, please upload it so I can build a complete case profile."`;

      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "You are Justice Companion AI, a legal document analysis specialist for UK civil legal matters. Provide both conversational analysis and structured data extraction.",
        },
        {
          role: "user",
          content: extractionPrompt,
        },
      ];

      const response = await this.chat(messages);

      // Split response into analysis (part 1) and structured data (part 2)
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);

      logger.warn("[UnifiedAIService] Full AI response:", response);
      logger.warn("[UnifiedAIService] JSON match found:", !!jsonMatch);

      if (!jsonMatch) {
        logger.warn("[UnifiedAIService] No JSON found, using fallback");
        // Fallback: simple extraction with low confidence
        return {
          analysis: response,
          suggestedCaseData: {
            title: `Case regarding ${parsedDoc.filename}`,
            caseType: "other",
            description: `Document uploaded: ${parsedDoc.filename}`,
            claimantName: userProfile.name || "User", // Inject user's name
            confidence: {
              title: 0.3,
              caseType: 0.3,
              opposingParty: 0.0,
              caseNumber: 0.0,
              filingDeadline: 0.0,
            },
            extractedFrom: {},
          },
        };
      }

      const analysisText = response.substring(0, jsonMatch.index).trim();
      const jsonStr = jsonMatch[1];

      logger.warn("[UnifiedAIService] Extracted JSON string:", jsonStr);

      let suggestedCaseData;
      try {
        suggestedCaseData = JSON.parse(jsonStr);
        logger.warn(
          "[UnifiedAIService] Parsed suggestedCaseData:",
          suggestedCaseData,
        );
      } catch (parseError) {
        logger.error("[UnifiedAIService] JSON parse error:", parseError);
        logger.error("[UnifiedAIService] Failed to parse:", jsonStr);
        // Fallback on parse error
        suggestedCaseData = {
          title: `Case regarding ${parsedDoc.filename}`,
          caseType: "other",
          description: `Document uploaded: ${parsedDoc.filename}`,
          claimantName: userProfile.name || "User",
          confidence: {
            title: 0.3,
            caseType: 0.3,
            opposingParty: 0.0,
            caseNumber: 0.0,
            filingDeadline: 0.0,
          },
          extractedFrom: {},
        };
      }

      // Inject user's name as claimant (do not extract from document)
      suggestedCaseData.claimantName = userProfile.name || "User";

      return {
        analysis: analysisText || response,
        suggestedCaseData,
      };
    } catch (error) {
      errorLogger.logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "UnifiedAIService",
          provider: this.config.provider,
          operation: "extractCaseDataFromDocument",
          filename: parsedDoc.filename,
        },
      );
      throw new Error(
        "Failed to extract case data from document. Please try again.",
      );
    }
  }
}
