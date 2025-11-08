import { ipcMain, type IpcMainInvokeEvent } from "electron";
import {
  errorResponse,
  IPCErrorCode,
  type IPCResponse,
} from "../utils/ipc-response";
import { withAuthorization } from "../utils/authorization-wrapper";
import { UnifiedAIService } from "../../src/services/UnifiedAIService";
import { AISDKService } from "../../src/services/ai/AISDKService";
import { AIProviderConfigService } from "../../src/services/AIProviderConfigService";
import { DocumentParserService } from "../../src/services/DocumentParserService";
import { chatConversationService } from "../../src/services/ChatConversationService";
import {
  RequiredFieldError,
  ValidationError,
} from "../../src/errors/DomainErrors";
import type {
  CaseAnalysisRequest,
  CaseAnalysisResponse,
  EvidenceAnalysisRequest,
  EvidenceAnalysisResponse,
  DocumentDraftRequest,
  DocumentDraftResponse,
} from "../../src/types/ai-analysis";
import * as fs from "node:fs";
import { getKeyManager } from "../main";

// AI services singletons
let aiConfigService: AIProviderConfigService | null = null;
let aiService: UnifiedAIService | null = null;
let aiSDKService: AISDKService | null = null; // For chat with tool calling

function getAIConfigService(): AIProviderConfigService {
  if (!aiConfigService) {
    aiConfigService = new AIProviderConfigService();
    console.warn("[IPC] AIProviderConfigService created");
  }
  return aiConfigService;
}

async function getAIService(): Promise<UnifiedAIService> {
  const configService = getAIConfigService();
  const config = await configService.getActiveProviderConfig();

  if (!config) {
    throw new Error(
      "No AI provider configured. Please configure a provider in Settings."
    );
  }

  // Create or update service with current config
  if (
    !aiService ||
    aiService.getProvider() !== config.provider ||
    aiService.getModel() !== config.model
  ) {
    aiService = new UnifiedAIService(config);
    console.warn(
      "[IPC] UnifiedAIService created/updated with provider:",
      config.provider,
      "model:",
      config.model
    );
  }

  return aiService;
}

async function getAISDKService(): Promise<AISDKService> {
  const configService = getAIConfigService();
  const config = await configService.getActiveProviderConfig();

  if (!config) {
    throw new Error(
      "No AI provider configured. Please configure a provider in Settings."
    );
  }

  // Create or update service with current config
  if (
    !aiSDKService ||
    aiSDKService.getProvider() !== config.provider ||
    aiSDKService.getModelName() !== config.model
  ) {
    aiSDKService = new AISDKService(config);
    console.warn(
      "[IPC] AISDKService created/updated with provider:",
      config.provider,
      "model:",
      config.model
    );
  }

  return aiSDKService;
}

// Reset AI service singletons (used when config changes)
export function resetAIService(): void {
  aiService = null;
  aiSDKService = null;
  console.warn("[IPC] AI services reset");
}

/**
 * ===== AI CHAT HANDLERS =====
 * Channels: chat:stream, chat:send
 * Total: 2 channels
 */
export function setupChatHandlers(): void {
  // ===== STREAMING CHAT (NEW) WITH CONVERSATION MEMORY =====
  ipcMain.handle(
    "chat:stream",
    async (
      event: IpcMainInvokeEvent,
      request: {
        sessionId: string;
        message: string;
        conversationId?: number | null;
        requestId: string;
        caseId?: number | null;
      }
    ): Promise<IPCResponse<{ conversationId: number }>> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] chat:stream called by user:",
            userId,
            "conversationId:",
            request.conversationId,
            "requestId:",
            request.requestId
          );

          // Validate message
          if (!request.message || request.message.trim().length === 0) {
            throw new RequiredFieldError("message");
          }

          if (request.message.length > 10000) {
            throw new ValidationError(
              "message",
              "Message too long (max 10000 characters)"
            );
          }

          // Get UnifiedAI service (works with all providers including HuggingFace)
          const unifiedAIService = await getAIService();

          // System message
          const systemMessage = {
            role: "system" as const,
            content:
              "You are Justice Companion AI, a helpful legal assistant for UK civil legal matters. You help people understand their rights and manage their legal cases. Remember: You offer information and guidance, not legal advice. For specific legal advice tailored to their situation, recommend consulting a qualified solicitor.",
          };

          // Load conversation history or create new conversation
          let conversationId = request.conversationId;
          let messages: Array<{
            role: "system" | "user" | "assistant";
            content: string;
          }> = [systemMessage];

          if (conversationId) {
            // Load existing conversation history
            console.warn(
              "[IPC] Loading conversation history for conversation:",
              conversationId
            );

            // Verify user owns this conversation
            chatConversationService.verifyOwnership(conversationId, userId);

            const conversation =
              chatConversationService.loadConversation(conversationId);
            if (conversation && conversation.messages) {
              // Convert database messages to AI format
              const historyMessages = conversation.messages.map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
              }));
              messages = [systemMessage, ...historyMessages];
              console.warn(
                "[IPC] Loaded",
                historyMessages.length,
                "messages from conversation history"
              );
            }
          }

          // Add current user message to messages array
          messages.push({
            role: "user" as const,
            content: request.message,
          });

          // Accumulate full response for saving
          let fullResponse = "";

          // Stream response from AI provider
          await unifiedAIService.streamChat(messages, {
            onToken: (token: string) => {
              fullResponse += token;
              event.sender.send("chat:stream:data", {
                data: token,
                done: false,
              });
            },
            onComplete: async (completedResponse: string) => {
              // Use the fullResponse we've been accumulating (or the one from callback)
              fullResponse = fullResponse || completedResponse;

              event.sender.send("chat:stream:data", {
                data: "",
                done: true,
              });
              console.warn(
                "[IPC] Streaming completed, total length:",
                fullResponse.length
              );

              // Save conversation and messages to database
              try {
                if (!conversationId) {
                  // Create new conversation with first message
                  console.warn("[IPC] Creating new conversation");
                  const conversation =
                    chatConversationService.startNewConversation(
                      userId,
                      request.caseId || null,
                      {
                        role: "user",
                        content: request.message,
                      }
                    );
                  conversationId = conversation.id;

                  // Save AI response as second message
                  chatConversationService.addMessage({
                    conversationId,
                    role: "assistant",
                    content: fullResponse,
                  });
                  console.warn("[IPC] Created conversation:", conversationId);
                } else {
                  // Add both user message and AI response to existing conversation
                  console.warn(
                    "[IPC] Adding messages to existing conversation:",
                    conversationId
                  );

                  // Save user message
                  chatConversationService.addMessage({
                    conversationId,
                    role: "user",
                    content: request.message,
                  });

                  // Save AI response
                  chatConversationService.addMessage({
                    conversationId,
                    role: "assistant",
                    content: fullResponse,
                  });
                  console.warn("[IPC] Messages saved to conversation");
                }

                // Send conversationId back to frontend
                event.sender.send("chat:stream:conversation-id", {
                  conversationId,
                });
              } catch (saveError) {
                console.error("[IPC] Error saving conversation:", saveError);
              }
            },
            onError: (error: Error) => {
              event.sender.send("chat:stream:error", {
                message: error.message,
                code: "StreamingError",
              });
            },
          });

          // Return conversationId (will be sent after stream completes)
          return { conversationId: conversationId || 0 };
        } catch (error) {
          console.error("[IPC] Error in chat:stream:", error);

          if (
            error instanceof RequiredFieldError ||
            error instanceof ValidationError
          ) {
            event.sender.send("chat:stream:error", {
              message: error.message,
              code: error.constructor.name,
            });
            throw errorResponse(IPCErrorCode.VALIDATION_ERROR, error.message);
          } else {
            event.sender.send("chat:stream:error", {
              message:
                error instanceof Error
                  ? error.message
                  : "An unexpected error occurred",
              code: "UnknownError",
            });
            throw errorResponse(
              IPCErrorCode.INTERNAL_ERROR,
              error instanceof Error
                ? error.message
                : "An unexpected error occurred"
            );
          }
        }
      });
    }
  );

  // ===== REGULAR CHAT =====
  ipcMain.handle(
    "chat:send",
    async (
      _event: IpcMainInvokeEvent,
      request: {
        sessionId: string;
        message: string;
        conversationId?: number | null;
        requestId: string;
      }
    ): Promise<IPCResponse<string>> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          console.warn(
            "[IPC] chat:send called by user:",
            userId,
            "requestId:",
            request.requestId
          );

          // Validate message
          if (!request.message || request.message.trim().length === 0) {
            throw new RequiredFieldError("message");
          }

          if (request.message.length > 10000) {
            throw new ValidationError(
              "message",
              "Message too long (max 10000 characters)"
            );
          }

          // Get AI SDK service (with tool calling)
          const aiSDKService = await getAISDKService();

          // Prepare messages for AI
          const messages = [
            {
              role: "system" as const,
              content:
                "You are Justice Companion AI, a helpful legal assistant for UK civil legal matters. You help people understand their rights and manage their legal cases. You have access to tools to create cases, store facts, and search legal information. Use these tools whenever appropriate. When greeting users, ask what civil legal matter they need help with. Remember: You offer information and guidance, not legal advice. For specific legal advice tailored to their situation, recommend consulting a qualified solicitor.",
            },
            {
              role: "user" as const,
              content: request.message,
            },
          ];

          // Get response from AI provider (with automatic tool calling)
          const response = await aiSDKService.chat(messages);

          // Log audit event
          // logAuditEvent(AuditEventType.CHAT_SEND, userId, { sessionId: request.sessionId, requestId: request.requestId });

          return response;
        } catch (error) {
          console.error("[IPC] Error in chat:send:", error);

          if (
            error instanceof RequiredFieldError ||
            error instanceof ValidationError
          ) {
            throw errorResponse(IPCErrorCode.VALIDATION_ERROR, error.message);
          } else {
            throw errorResponse(
              IPCErrorCode.INTERNAL_ERROR,
              error instanceof Error
                ? error.message
                : "An unexpected error occurred"
            );
          }
        }
      });
    }
  );

  // AI Case Analysis Handler
  ipcMain.handle(
    "ai:analyze-case",
    async (
      _event: IpcMainInvokeEvent,
      request: CaseAnalysisRequest & { sessionId: string }
    ): Promise<IPCResponse<CaseAnalysisResponse>> => {
      return withAuthorization(request.sessionId, async (_userId) => {
        try {
          // Validate request
          if (!request.caseId) {
            throw new RequiredFieldError("caseId");
          }
          if (!request.description) {
            throw new RequiredFieldError("description");
          }

          const aiService = await getAIService();
          const analysis = await aiService.analyzeCase(request);

          return analysis;
        } catch (error) {
          console.error("[IPC] Case analysis error:", error);
          if (
            error instanceof RequiredFieldError ||
            error instanceof ValidationError
          ) {
            throw errorResponse(IPCErrorCode.VALIDATION_ERROR, error.message);
          } else {
            throw errorResponse(
              IPCErrorCode.INTERNAL_ERROR,
              error instanceof Error
                ? error.message
                : "An unexpected error occurred"
            );
          }
        }
      });
    }
  );

  // AI Evidence Analysis Handler
  ipcMain.handle(
    "ai:analyze-evidence",
    async (
      _event: IpcMainInvokeEvent,
      request: EvidenceAnalysisRequest & { sessionId: string }
    ): Promise<IPCResponse<EvidenceAnalysisResponse>> => {
      return withAuthorization(request.sessionId, async (_userId) => {
        try {
          // Validate request
          if (!request.caseId) {
            throw new RequiredFieldError("caseId");
          }
          if (
            !request.existingEvidence ||
            request.existingEvidence.length === 0
          ) {
            throw new ValidationError(
              "At least one piece of evidence is required"
            );
          }

          const aiService = await getAIService();
          const analysis = await aiService.analyzeEvidence(request);

          return analysis;
        } catch (error) {
          console.error("[IPC] Evidence analysis error:", error);
          if (
            error instanceof RequiredFieldError ||
            error instanceof ValidationError
          ) {
            throw errorResponse(IPCErrorCode.VALIDATION_ERROR, error.message);
          } else {
            throw errorResponse(
              IPCErrorCode.INTERNAL_ERROR,
              error instanceof Error
                ? error.message
                : "An unexpected error occurred"
            );
          }
        }
      });
    }
  );

  // AI Document Drafting Handler
  ipcMain.handle(
    "ai:draft-document",
    async (
      _event: IpcMainInvokeEvent,
      request: DocumentDraftRequest & { sessionId: string }
    ): Promise<IPCResponse<DocumentDraftResponse>> => {
      return withAuthorization(request.sessionId, async (_userId) => {
        try {
          // Validate request
          if (!request.documentType) {
            throw new RequiredFieldError("documentType");
          }
          if (!request.context || !request.context.caseId) {
            throw new RequiredFieldError("context.caseId");
          }
          if (!request.context.facts) {
            throw new RequiredFieldError("context.facts");
          }
          if (!request.context.objectives) {
            throw new RequiredFieldError("context.objectives");
          }

          const aiService = await getAIService();
          const draft = await aiService.draftDocument(request);

          return draft;
        } catch (error) {
          console.error("[IPC] Document drafting error:", error);
          if (
            error instanceof RequiredFieldError ||
            error instanceof ValidationError
          ) {
            throw errorResponse(IPCErrorCode.VALIDATION_ERROR, error.message);
          } else {
            throw errorResponse(
              IPCErrorCode.INTERNAL_ERROR,
              error instanceof Error
                ? error.message
                : "An unexpected error occurred"
            );
          }
        }
      });
    }
  );

  // AI Document Analysis Handler (NEW - for uploaded documents)
  ipcMain.handle(
    "ai:analyze-document",
    async (
      _event: IpcMainInvokeEvent,
      request: { sessionId: string; filePath: string; userQuestion?: string }
    ): Promise<IPCResponse<{ analysis: string; suggestedCaseData?: any }>> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          console.warn("[IPC] ai:analyze-document called by user:", userId);

          // Validate file path
          if (!request.filePath) {
            throw new RequiredFieldError("filePath");
          }

          // Check file exists
          if (!fs.existsSync(request.filePath)) {
            throw new ValidationError("filePath", "File not found");
          }

          // Parse document
          const documentParser = new DocumentParserService();
          const parsedDoc = await documentParser.parseDocument(
            request.filePath
          );

          console.warn("[IPC] Document parsed:", {
            filename: parsedDoc.filename,
            fileType: parsedDoc.fileType,
            wordCount: parsedDoc.wordCount,
          });

          // Get user profile to pass user's name to AI
          const { UserProfileRepository } = await import(
            "../../src/repositories/UserProfileRepository.ts"
          );
          const { EncryptionService } = await import(
            "../../src/services/EncryptionService.ts"
          );
          const keyManager = getKeyManager();
          const encryptionService = new EncryptionService(keyManager.getKey());
          const profileRepo = new UserProfileRepository(encryptionService);
          const userProfile = profileRepo.get();

          console.warn("[IPC] User profile loaded:", {
            userName: userProfile.name,
          });

          // Get AI service
          const aiService = await getAIService();

          // Use enhanced extraction method (with user profile data)
          console.warn("[IPC] Calling AI service for document extraction...");
          const timeoutMs = 120000; // 120 seconds
          const extractionResult = await Promise.race([
            aiService.extractCaseDataFromDocument(
              parsedDoc,
              userProfile,
              request.userQuestion
            ),
            new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error(
                      "AI request timed out after 120 seconds. The provider may be slow or unavailable. Try a different provider or a smaller model."
                    )
                  ),
                timeoutMs
              )
            ),
          ]);
          console.warn("[IPC] AI extraction complete");

          const { analysis, suggestedCaseData } = extractionResult;

          return {
            analysis,
            suggestedCaseData,
          };
        } catch (error) {
          console.error("[IPC] Document analysis error:", error);

          if (
            error instanceof RequiredFieldError ||
            error instanceof ValidationError
          ) {
            throw errorResponse(IPCErrorCode.VALIDATION_ERROR, error.message);
          }

          // Check for timeout
          if (error instanceof Error && error.message.includes("timed out")) {
            throw errorResponse(
              IPCErrorCode.INTERNAL_ERROR,
              "AI request timed out after 120 seconds. The provider may be slow or unavailable. Try a different provider or a smaller model."
            );
          }

          // Check for HTTP errors
          if (
            error instanceof Error &&
            (error.message.includes("HTTP") ||
              error.message.includes("network") ||
              error.message.includes("inference"))
          ) {
            throw errorResponse(
              IPCErrorCode.INTERNAL_ERROR,
              `Failed to connect to AI provider. Error: ${error.message}. Check your API key and connectivity, or try a different provider.`
            );
          }

          // Generic error
          throw errorResponse(
            IPCErrorCode.INTERNAL_ERROR,
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during document analysis"
          );
        }
      });
    }
  );
}
