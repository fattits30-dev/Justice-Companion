import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { type IPCResponse } from '../utils/ipc-response.ts';
import { withAuthorization } from '../utils/authorization-wrapper.ts';
import { UnifiedAIService } from '../../src/services/UnifiedAIService.ts';
import { AIProviderConfigService } from '../../src/services/AIProviderConfigService.ts';
import { DocumentParserService } from '../../src/services/DocumentParserService.ts';
import {
  RequiredFieldError,
  ValidationError,
} from '../../src/errors/DomainErrors.ts';
import type {
  CaseAnalysisRequest,
  CaseAnalysisResponse,
  EvidenceAnalysisRequest,
  EvidenceAnalysisResponse,
  DocumentDraftRequest,
  DocumentDraftResponse,
} from '../../src/types/ai-analysis.ts';
import * as fs from 'node:fs';

// AI services singleton
let aiConfigService: AIProviderConfigService | null = null;
let aiService: UnifiedAIService | null = null;

function getAIConfigService(): AIProviderConfigService {
  if (!aiConfigService) {
    aiConfigService = new AIProviderConfigService();
    console.warn('[IPC] AIProviderConfigService created');
  }
  return aiConfigService;
}

async function getAIService(): Promise<UnifiedAIService> {
  const configService = getAIConfigService();
  const config = await configService.getActiveProviderConfig();

  if (!config) {
    throw new Error('No AI provider configured. Please configure a provider in Settings.');
  }

  // Create or update service with current config
  if (!aiService || aiService.getProvider() !== config.provider || aiService.getModel() !== config.model) {
    aiService = new UnifiedAIService(config);
    console.warn('[IPC] UnifiedAIService created/updated with provider:', config.provider, 'model:', config.model);
  }

  return aiService;
}

// Reset AI service singleton (used when config changes)
export function resetAIService(): void {
  aiService = null;
  console.warn('[IPC] UnifiedAIService reset');
}

/**
 * ===== AI CHAT HANDLERS =====
 * Channels: chat:stream, chat:send
 * Total: 2 channels
 */
export function setupChatHandlers(): void {
  // ===== STREAMING CHAT (NEW) =====
  ipcMain.handle(
    'chat:stream',
    async (
      event: IpcMainInvokeEvent,
      request: { sessionId: string; message: string; conversationId?: number | null; requestId: string }
    ): Promise<void> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          console.warn('[IPC] chat:stream called by user:', userId, 'requestId:', request.requestId);

          // Validate message
          if (!request.message || request.message.trim().length === 0) {
            throw new RequiredFieldError('message');
          }

          if (request.message.length > 10000) {
            throw new ValidationError('message', 'Message too long (max 10000 characters)');
          }

          // Get AI service
          const aiService = await getAIService();

          // Prepare messages for AI
          const messages = [
            {
              role: 'system' as const,
              content: 'You are Justice Companion AI, a helpful legal assistant for UK civil legal matters. I help people understand their rights across employment law, housing law, benefits, consumer rights, civil rights, small claims, and family law. I provide clear, accurate information to empower you in your legal journey. When greeting users, ask what civil legal matter they need help with. Remember: I offer information and guidance, not legal advice. For specific legal advice tailored to your situation, I recommend consulting a qualified solicitor.',
            },
            {
              role: 'user' as const,
              content: request.message,
            },
          ];

          // Stream response from AI provider
          await aiService.streamChat(messages, {
            onToken: (token: string) => {
              event.sender.send('chat:stream:data', {
                data: token,
                done: false,
              });
            },
            onComplete: (fullResponse: string) => {
              event.sender.send('chat:stream:data', {
                data: '',
                done: true,
              });
              console.warn('[IPC] Streaming completed, total length:', fullResponse.length);
            },
            onError: (error: Error) => {
              event.sender.send('chat:stream:error', {
                message: error.message,
                code: 'StreamingError',
              });
            },
          });

          // Log audit event
          // logAuditEvent(AuditEventType.CHAT_STREAM, userId, { sessionId: request.sessionId, requestId: request.requestId });
        } catch (error) {
          console.error('[IPC] Error in chat:stream:', error);

          if (error instanceof RequiredFieldError || error instanceof ValidationError) {
            event.sender.send('chat:stream:error', {
              message: error.message,
              code: error.constructor.name,
            });
          } else {
            event.sender.send('chat:stream:error', {
              message: error instanceof Error ? error.message : 'An unexpected error occurred',
              code: 'UnknownError',
            });
          }
        }
      });
    }
  );

  // ===== REGULAR CHAT =====
  ipcMain.handle(
    'chat:send',
    async (
      event: IpcMainInvokeEvent,
      request: { sessionId: string; message: string; conversationId?: number | null; requestId: string }
    ): Promise<IPCResponse<string>> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          console.warn('[IPC] chat:send called by user:', userId, 'requestId:', request.requestId);

          // Validate message
          if (!request.message || request.message.trim().length === 0) {
            throw new RequiredFieldError('message');
          }

          if (request.message.length > 10000) {
            throw new ValidationError('message', 'Message too long (max 10000 characters)');
          }

          // Get AI service
          const aiService = await getAIService();

          // Prepare messages for AI
          const messages = [
            {
              role: 'system' as const,
              content: 'You are Justice Companion AI, a helpful legal assistant for UK civil legal matters. I help people understand their rights across employment law, housing law, benefits, consumer rights, civil rights, small claims, and family law. I provide clear, accurate information to empower you in your legal journey. When greeting users, ask what civil legal matter they need help with. Remember: I offer information and guidance, not legal advice. For specific legal advice tailored to your situation, I recommend consulting a qualified solicitor.',
            },
            {
              role: 'user' as const,
              content: request.message,
            },
          ];

          // Get response from AI provider
          const response = await aiService.chat(messages);

          // Log audit event
          // logAuditEvent(AuditEventType.CHAT_SEND, userId, { sessionId: request.sessionId, requestId: request.requestId });

          return {
            success: true,
            data: response,
          };
        } catch (error) {
          console.error('[IPC] Error in chat:send:', error);

          if (error instanceof RequiredFieldError || error instanceof ValidationError) {
            return {
              success: false,
              error: error.message,
            };
          } else {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unexpected error occurred',
            };
          }
        }
      });
    }
  );

  // AI Case Analysis Handler
  ipcMain.handle(
    'ai:analyze-case',
    async (
      event: IpcMainInvokeEvent,
      request: CaseAnalysisRequest
    ): Promise<IPCResponse<CaseAnalysisResponse>> => {
      return withAuthorization(async () => {
        try {
          // Validate request
          if (!request.caseId) {
            throw new RequiredFieldError('caseId');
          }
          if (!request.description) {
            throw new RequiredFieldError('description');
          }

          const aiService = await getAIService();
          const analysis = await aiService.analyzeCase(request);

          return {
            success: true,
            data: analysis,
          };
        } catch (error) {
          console.error('[IPC] Case analysis error:', error);
          if (error instanceof RequiredFieldError || error instanceof ValidationError) {
            return {
              success: false,
              error: error.message,
            };
          } else {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unexpected error occurred',
            };
          }
        }
      });
    }
  );

  // AI Evidence Analysis Handler
  ipcMain.handle(
    'ai:analyze-evidence',
    async (
      event: IpcMainInvokeEvent,
      request: EvidenceAnalysisRequest
    ): Promise<IPCResponse<EvidenceAnalysisResponse>> => {
      return withAuthorization(async () => {
        try {
          // Validate request
          if (!request.caseId) {
            throw new RequiredFieldError('caseId');
          }
          if (!request.existingEvidence || request.existingEvidence.length === 0) {
            throw new ValidationError('At least one piece of evidence is required');
          }

          const aiService = await getAIService();
          const analysis = await aiService.analyzeEvidence(request);

          return {
            success: true,
            data: analysis,
          };
        } catch (error) {
          console.error('[IPC] Evidence analysis error:', error);
          if (error instanceof RequiredFieldError || error instanceof ValidationError) {
            return {
              success: false,
              error: error.message,
            };
          } else {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unexpected error occurred',
            };
          }
        }
      });
    }
  );

  // AI Document Drafting Handler
  ipcMain.handle(
    'ai:draft-document',
    async (
      event: IpcMainInvokeEvent,
      request: DocumentDraftRequest
    ): Promise<IPCResponse<DocumentDraftResponse>> => {
      return withAuthorization(async () => {
        try {
          // Validate request
          if (!request.documentType) {
            throw new RequiredFieldError('documentType');
          }
          if (!request.context || !request.context.caseId) {
            throw new RequiredFieldError('context.caseId');
          }
          if (!request.context.facts) {
            throw new RequiredFieldError('context.facts');
          }
          if (!request.context.objectives) {
            throw new RequiredFieldError('context.objectives');
          }

          const aiService = await getAIService();
          const draft = await aiService.draftDocument(request);

          return {
            success: true,
            data: draft,
          };
        } catch (error) {
          console.error('[IPC] Document drafting error:', error);
          if (error instanceof RequiredFieldError || error instanceof ValidationError) {
            return {
              success: false,
              error: error.message,
            };
          } else {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'An unexpected error occurred',
            };
          }
        }
      });
    }
  );

  // AI Document Analysis Handler (NEW - for uploaded documents)
  ipcMain.handle(
    'ai:analyze-document',
    async (
      event: IpcMainInvokeEvent,
      request: { sessionId: string; filePath: string; userQuestion?: string }
    ): Promise<IPCResponse<{ analysis: string; suggestedCaseData?: any }>> => {
      return withAuthorization(request.sessionId, async (userId) => {
        try {
          console.warn('[IPC] ai:analyze-document called by user:', userId);

          // Validate file path
          if (!request.filePath) {
            throw new RequiredFieldError('filePath');
          }

          // Check file exists
          if (!fs.existsSync(request.filePath)) {
            throw new ValidationError('filePath', 'File not found');
          }

          // Parse document
          const documentParser = new DocumentParserService();
          const parsedDoc = await documentParser.parseDocument(request.filePath);

          console.warn('[IPC] Document parsed:', {
            filename: parsedDoc.filename,
            fileType: parsedDoc.fileType,
            wordCount: parsedDoc.wordCount,
          });

          // Get AI service
          const aiService = await getAIService();

          // Build analysis prompt
          const analysisPrompt = `You are a UK civil legal assistant having a conversation with someone who just uploaded a legal document. They need your help understanding what it means and what they should do.

IMPORTANT: Talk DIRECTLY to the user. Use "you" and "your" - they are the person affected by this document. Be conversational and helpful, like a lawyer sitting across from them.

Your task:
1. Tell them what TYPE of document this is
2. Point out any OBVIOUS LEGAL ISSUES or red flags that should concern them
3. Explain KEY INFORMATION they need to know (dates, amounts, deadlines, their rights)
4. If there are clear problems, explain what those problems mean FOR THEM in plain English
5. Ask CLARIFYING QUESTIONS to understand their situation better

DOCUMENT: ${parsedDoc.filename}
FILE TYPE: ${parsedDoc.fileType.toUpperCase()}
LENGTH: ${parsedDoc.wordCount} words

CONTENT:
${parsedDoc.text}

${request.userQuestion ? `\nTHEY ASKED: "${request.userQuestion}"` : ''}

Analyze this document and explain it directly to the user. Talk to them, not about them.`;

          // Get AI analysis with timeout (120 seconds)
          const messages = [
            {
              role: 'system' as const,
              content: 'You are Justice Companion AI, a helpful legal assistant for UK civil legal matters. You analyze legal documents and identify potential issues.',
            },
            {
              role: 'user' as const,
              content: analysisPrompt,
            },
          ];

          console.warn('[IPC] Calling AI service for document analysis...');
          const timeoutMs = 120000; // 120 seconds
          const analysis = await Promise.race([
            aiService.chat(messages),
            new Promise<string>((_, reject) =>
              setTimeout(() => reject(new Error('AI request timed out after 120 seconds. The provider may be slow or unavailable. Try a different provider or a smaller model.')), timeoutMs)
            ),
          ]);
          console.warn('[IPC] AI analysis complete');

          // Try to extract suggested case data (simple pattern matching)
          const suggestedCaseData = extractCaseData(parsedDoc, analysis);

          return {
            success: true,
            data: {
              analysis,
              suggestedCaseData,
            },
          };
        } catch (error) {
          console.error('[IPC] Document analysis error:', error);

          if (error instanceof RequiredFieldError || error instanceof ValidationError) {
            return {
              success: false,
              error: error.message,
            };
          }

          // Check for timeout
          if (error instanceof Error && error.message.includes('timed out')) {
            return {
              success: false,
              error: `AI request timed out after 120 seconds.\n\nTroubleshooting:\n- The AI provider (${await getAIService().then(s => s.getProvider())}) may be slow or unavailable\n- Try switching to a faster provider (OpenAI, Anthropic)\n- Use a smaller model for faster responses\n- Check your internet connection`,
            };
          }

          // Check for HTTP errors
          if (error instanceof Error && (error.message.includes('HTTP') || error.message.includes('network') || error.message.includes('inference'))) {
            return {
              success: false,
              error: `Failed to connect to AI provider.\n\nError: ${error.message}\n\nTroubleshooting:\n- Check your API key is valid\n- Verify your internet connection\n- Try a different AI provider (OpenAI, Anthropic are reliable)\n- HuggingFace can be slow - consider switching providers`,
            };
          }

          // Generic error
          return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred during document analysis',
          };
        }
      });
    }
  );
}

/**
 * Extract potential case data from document and AI analysis
 */
function extractCaseData(parsedDoc: any, analysis: string): any {
  // Simple extraction - can be enhanced with more sophisticated NLP
  const caseData: any = {
    documentFilename: parsedDoc.filename,
    documentWordCount: parsedDoc.wordCount,
  };

  // Try to identify case type from analysis
  const lowerAnalysis = analysis.toLowerCase();
  if (lowerAnalysis.includes('employment') || lowerAnalysis.includes('dismissal') || lowerAnalysis.includes('redundancy')) {
    caseData.suggestedCategory = 'Employment Law';
  } else if (lowerAnalysis.includes('housing') || lowerAnalysis.includes('tenancy') || lowerAnalysis.includes('eviction')) {
    caseData.suggestedCategory = 'Housing Law';
  } else if (lowerAnalysis.includes('consumer') || lowerAnalysis.includes('goods') || lowerAnalysis.includes('services')) {
    caseData.suggestedCategory = 'Consumer Rights';
  } else if (lowerAnalysis.includes('family') || lowerAnalysis.includes('divorce') || lowerAnalysis.includes('custody')) {
    caseData.suggestedCategory = 'Family Law';
  }

  return caseData;
}