import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import { SaveToCaseDialog } from "./chat/SaveToCaseDialog.tsx";
import { AICaseCreationDialog } from "../components/cases/AICaseCreationDialog.tsx";
import type { CaseFormData, AuditMetadata } from "../components/cases/AICaseCreationDialog.tsx";
import { MessageItem } from './chat/MessageItem.tsx';
import { TypingIndicator } from "../components/ui/TypingIndicator.tsx";
import { toast } from 'sonner';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { usePendingActions, useActionQueueOperations } from '../stores/aiActionQueue.ts';
import { ActionPendingCard } from '../components/ai/ActionPendingCard.tsx';
import { AIActionConfirmationDialog } from '../components/ai/AIActionConfirmationDialog.tsx';
import { aiActionExecutor } from '../services/ai/AIActionExecutor.ts';
import type { SpecificAIAction, AuditMetadata as AIAuditMetadata } from '../types/ai-actions.ts';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  thinking?: string;
  documentAnalysis?: {
    filename: string;
    suggestedCaseData?: any;
  };
}

/**
 * ChatView - AI Legal Assistant
 *
 * CRITICAL: This is a legal information tool, NOT a lawyer.
 * Every response includes a disclaimer.
 */
export function ChatView() {
  const { user: _user } = useAuth(); // Reserved for future use
  const navigate = useNavigate();

  // Track active case from localStorage
  const [activeCaseId, setActiveCaseId] = useState<string | null>(() => {
    return localStorage.getItem('activeCaseId');
  });

  // Load messages from localStorage for the active case
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const caseId = localStorage.getItem('activeCaseId');
      const storageKey = caseId ? `chatMessages-${caseId}` : 'chatMessages-global';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    } catch (error) {
      console.error('[ChatView] Failed to load saved messages:', error);
    }
    return [];
  });

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");
  const [_showThinking, _setShowThinking] = useState(false); // Reserved for showing AI thinking process
  const [_currentThinking, setCurrentThinking] = useState(""); // Reserved for AI thinking display
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null); // Track conversation for memory

  // Save to case state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [messageToSave, setMessageToSave] = useState<Message | null>(null);

  // AI case creation dialog state
  const [isAICaseDialogOpen, setIsAICaseDialogOpen] = useState(false);
  const [aiCaseData, setAICaseData] = useState<any | null>(null);
  const [documentAnalysisText, setDocumentAnalysisText] = useState<string>('');

  // Document upload state
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);

  // AI action confirmation state
  const pendingActions = usePendingActions();
  const {
    confirmAction,
    rejectAction,
    setActionExecuting,
    setActionCompleted,
    setActionFailed,
  } = useActionQueueOperations();
  const [dialogAction, setDialogAction] = useState<SpecificAIAction | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for active case changes and reload messages
  useEffect(() => {
    const handleStorageChange = () => {
      const newCaseId = localStorage.getItem('activeCaseId');
      if (newCaseId !== activeCaseId) {
        setActiveCaseId(newCaseId);
        // Load messages for new case
        try {
          const storageKey = newCaseId ? `chatMessages-${newCaseId}` : 'chatMessages-global';
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            setMessages(parsed.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })));
          } else {
            setMessages([]);
          }
        } catch (error) {
          console.error('[ChatView] Failed to load messages for new case:', error);
          setMessages([]);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also check on mount and periodically
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [activeCaseId]);

  // Save messages to localStorage whenever they change (case-specific)
  useEffect(() => {
    try {
      const storageKey = activeCaseId ? `chatMessages-${activeCaseId}` : 'chatMessages-global';
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error('[ChatView] Failed to save messages:', error);
    }
  }, [messages, activeCaseId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, currentStreamingMessage]);

  // Handlers - wrapped in useCallback to preserve memoization benefits
  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setCurrentStreamingMessage("");
    setCurrentThinking("");

    try {
      // Call IPC to stream chat
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        throw new Error("No active session");
      }

      let streamedContent = "";
      let streamedThinking = "";

      await window.justiceAPI.streamChat(
        {
          sessionId,
          message: input.trim(),
          conversationId: currentConversationId, // Use tracked conversation for memory
        },
        (token: string) => {
          // Each token from AI response
          streamedContent += token;
          setCurrentStreamingMessage(streamedContent);
        },
        (thinking: string) => {
          // AI's thinking process (optional)
          streamedThinking += thinking;
          setCurrentThinking(streamedThinking);
        },
        () => {
          // Streaming complete
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: streamedContent,
            thinking: streamedThinking || undefined,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setCurrentStreamingMessage("");
          setCurrentThinking("");
          setIsStreaming(false);
        },
        (error: string) => {
          // Error during streaming
          console.error("[ChatView] Streaming error:", error);
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `Sorry, I hit an error: ${error}\n\nTry asking again or rephrase your question.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsStreaming(false);
          setCurrentStreamingMessage("");
          setCurrentThinking("");
        },
        (conversationId: number) => {
          // Capture conversation ID for memory
          console.log('[ChatView] Received conversationId:', conversationId);
          setCurrentConversationId(conversationId);
        },
      );
    } catch (error) {
      console.error("[ChatView] Send error:", error);
      setIsStreaming(false);
    }
  }, [input, isStreaming]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleSaveToCase = useCallback((message: Message) => {
    setMessageToSave(message);
    setIsSaveDialogOpen(true);
  }, []);

  const handleSaveConfirm = useCallback(async (caseId: number, title: string) => {
    if (!messageToSave) {
      return { success: false, error: 'No message selected' };
    }

    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        return { success: false, error: 'No active session' };
      }

      // Format the AI response as a case fact
      // Combine title and content for fact_content field
      const factContent = `${title}\n\n${messageToSave.content}\n\n[Source: AI Legal Assistant]`;

      // Save the AI response as a case fact
      const result = await window.justiceAPI.createCaseFact({
        caseId,
        factContent,
        factCategory: 'other', // AI responses don't fit standard categories
        importance: 'medium',
      }, sessionId);

      if (result.success) {
        toast.success('AI response saved to case', {
          description: `Saved to ${title}`,
        });
        return { success: true };
      }

      const errorMsg = typeof result.error === 'string'
        ? result.error
        : result.error?.message || 'Failed to save';
      return { success: false, error: errorMsg };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      toast.error('Failed to save to case', {
        description: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }, [messageToSave]);

  const handleDocumentUpload = useCallback(async () => {
    setIsAnalyzingDocument(true);

    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        throw new Error("No active session");
      }

      // Use Electron's dialog to select file
      const result = await window.justiceAPI.showOpenDialog({
        title: 'Select Document to Analyze',
        filters: [
          { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        setIsAnalyzingDocument(false);
        return;
      }

      const filePath = result.filePaths[0];
      const filename = filePath.split(/[\\/]/).pop() || 'document';

      // Add user message showing file upload
      const uploadMessage: Message = {
        id: `upload-${Date.now()}`,
        role: "user",
        content: `📎 Uploaded document: ${filename}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, uploadMessage]);

      toast.info('Analyzing document...', {
        description: `Processing ${filename}`,
      });

      // Call the document analysis API
      const analysisResult = await window.justiceAPI.analyzeDocument(
        filePath,
        sessionId,
        `Please analyze this document: ${filename}`
      );

      if (!analysisResult.success) {
        const errorMsg = 'error' in analysisResult && analysisResult.error?.message
          ? analysisResult.error.message
          : 'Failed to analyze document';
        throw new Error(errorMsg);
      }

      // Add AI analysis message
      const analysisMessage: Message = {
        id: `analysis-${Date.now()}`,
        role: "assistant",
        content: analysisResult.data!.analysis,
        timestamp: new Date(),
        documentAnalysis: {
          filename,
          suggestedCaseData: analysisResult.data!.suggestedCaseData,
        },
      };

      setMessages((prev) => [...prev, analysisMessage]);

      toast.success('Document analyzed successfully', {
        description: `Analyzed ${filename}`,
      });
    } catch (error) {
      console.error('[ChatView] Document upload error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Sorry, I couldn't analyze that document: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or upload a different file.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      toast.error('Failed to analyze document', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsAnalyzingDocument(false);
    }
  }, []);

  const handleCreateCaseFromAnalysis = useCallback((message: Message) => {
    // Open AI case creation dialog with suggested data
    if (!message.documentAnalysis?.suggestedCaseData) {
      toast.error('No case data available', {
        description: 'This message does not contain document analysis data',
      });
      return;
    }

    const suggestedData = message.documentAnalysis.suggestedCaseData;

    // Warn if document belongs to someone else
    if (suggestedData.documentOwnershipMismatch && suggestedData.documentClaimantName) {
      toast.warning('Document Ownership Warning', {
        description: `This document appears to be for ${suggestedData.documentClaimantName}, not you. You can still review the information, but for best results, they should download Justice Companion for personalized assistance.`,
        duration: 10000, // Show warning for 10 seconds
      });
    }

    setAICaseData(suggestedData);
    setDocumentAnalysisText(message.content);
    setIsAICaseDialogOpen(true);
  }, []);

  const handleCaseConfirm = useCallback(async (finalData: CaseFormData, metadata: AuditMetadata) => {
    console.log('[ChatView] handleCaseConfirm called with data:', finalData);

    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        throw new Error("No active session");
      }

      // Build enhanced description with additional fields
      const additionalInfo = [];
      if (finalData.opposingParty) {
        additionalInfo.push(`Opposing Party: ${finalData.opposingParty}`);
      }
      if (finalData.caseNumber) {
        additionalInfo.push(`Case Number: ${finalData.caseNumber}`);
      }
      if (finalData.courtName) {
        additionalInfo.push(`Court/Tribunal: ${finalData.courtName}`);
      }
      if (finalData.filingDeadline) {
        additionalInfo.push(`Filing Deadline: ${finalData.filingDeadline}`);
      }
      if (finalData.nextHearingDate) {
        additionalInfo.push(`Next Hearing: ${finalData.nextHearingDate}`);
      }

      const enhancedDescription = additionalInfo.length > 0
        ? `${finalData.description}\n\n${additionalInfo.join('\n')}`
        : finalData.description;

      console.log('[ChatView] Creating case via IPC...');

      // Create the case with AI metadata for audit trail
      const result = await window.justiceAPI.createCase(
        {
          title: finalData.title,
          description: enhancedDescription,
          caseType: finalData.caseType as any, // Cast to satisfy TypeScript
        },
        sessionId,
        metadata // Pass AI metadata to be logged in audit trail
      );

      console.log('[ChatView] Case creation result:', result);

      if (!result.success) {
        const errorMsg = 'error' in result && result.error?.message
          ? result.error.message
          : 'Failed to create case';
        throw new Error(errorMsg);
      }

      if (!result.data) {
        throw new Error('Case created but no data returned');
      }

      const caseId = result.data.id;
      console.log('[ChatView] Case created successfully with ID:', caseId);

      // Close dialog first by returning successfully
      // (Don't let navigation errors prevent dialog from closing)

      // Show success message (wrapped in try-catch to prevent blocking)
      try {
        toast.success('Case created successfully!', {
          description: `Created case: ${finalData.title}`,
        });
      } catch (toastError) {
        console.warn('[ChatView] Toast notification failed:', toastError);
      }

      // Navigate to the new case (wrapped in try-catch to prevent blocking)
      try {
        console.log('[ChatView] Navigating to case:', caseId);
        navigate(`/cases/${caseId}`);
      } catch (navError) {
        console.warn('[ChatView] Navigation failed:', navError);
      }

      // Important: Don't throw here - let the dialog close
      console.log('[ChatView] handleCaseConfirm completed successfully');

    } catch (error) {
      console.error('[ChatView] Error creating case:', error);
      toast.error('Failed to create case', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error; // Only re-throw if case creation actually failed
    }
  }, [navigate]);

  const handleClearChat = useCallback(() => {
    if (messages.length === 0) {
      toast.info('Chat is already empty');
      return;
    }

    // Confirm before clearing
    const confirmed = window.confirm(
      `Are you sure you want to clear all chat messages${activeCaseId ? ' for this case' : ''}?\n\nThis cannot be undone.`
    );

    if (confirmed) {
      setMessages([]);
      setCurrentConversationId(null); // Reset conversation to start fresh
      toast.success('Chat cleared', {
        description: `Cleared ${messages.length} messages`,
      });
    }
  }, [messages.length, activeCaseId]);

  // AI Action Handlers
  const handleQuickApprove = useCallback(async (actionId: string) => {
    try {
      // Confirm the action
      confirmAction(actionId);

      // Set executing state
      setActionExecuting(actionId);

      // Get the confirmed action
      const action = pendingActions.find((a) => a.id === actionId);
      if (!action) {
        throw new Error('Action not found');
      }

      // Execute the action
      const result = await aiActionExecutor.execute(action);

      if (result.success) {
        setActionCompleted(actionId, result);
        toast.success('Action completed!', {
          description: result.message,
        });
      } else {
        setActionFailed(actionId, result.message || 'Unknown error');
        toast.error('Action failed', {
          description: result.message,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setActionFailed(actionId, errorMessage);
      toast.error('Failed to execute action', {
        description: errorMessage,
      });
    }
  }, [confirmAction, setActionExecuting, setActionCompleted, setActionFailed, pendingActions]);

  const handleReview = useCallback((actionId: string) => {
    // Find the action and open the confirmation dialog
    const action = pendingActions.find((a) => a.id === actionId);
    if (action) {
      setDialogAction(action);
    } else {
      toast.error('Action not found');
    }
  }, [pendingActions]);

  const handleReject = useCallback((actionId: string) => {
    // Reject the action
    rejectAction(actionId);
    toast.info('Action rejected', {
      description: 'The AI-proposed action has been discarded',
    });
  }, [rejectAction]);

  const handleDialogConfirm = useCallback(async (
    actionId: string,
    editedData: Record<string, any>,
    auditMetadata: AIAuditMetadata
  ) => {
    try {
      // Confirm the action with edited data
      confirmAction(actionId, editedData, auditMetadata);

      // Close the dialog
      setDialogAction(null);

      // Set executing state
      setActionExecuting(actionId);

      // Get the confirmed action (it now has edited data)
      const action = pendingActions.find((a) => a.id === actionId);
      if (!action) {
        throw new Error('Action not found after confirmation');
      }

      // Execute the action
      const result = await aiActionExecutor.execute(action);

      if (result.success) {
        setActionCompleted(actionId, result);
        toast.success('Action completed!', {
          description: result.message,
        });

        // If case was created, navigate to it
        if (result.data?.id && action.type === 'create_case') {
          navigate(`/cases/${result.data.id}`);
        }
      } else {
        setActionFailed(actionId, result.message || 'Unknown error');
        toast.error('Action failed', {
          description: result.message,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setActionFailed(actionId, errorMessage);
      toast.error('Failed to execute action', {
        description: errorMessage,
      });
    }
  }, [confirmAction, setActionExecuting, setActionCompleted, setActionFailed, pendingActions, navigate]);

  const handleDialogCancel = useCallback(() => {
    setDialogAction(null);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">AI Legal Assistant</h1>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors border border-red-500/30 hover:border-red-500/50"
                title="Clear all chat messages"
              >
                <Trash2 className="w-4 h-4" />
                Clear Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages area - now with proper scrolling */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {messages.length === 0 && !isStreaming && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="p-6"
            >
              <div className="max-w-3xl mx-auto mt-12 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: 'backOut' }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mb-6"
                >
                  <svg
                    className="w-8 h-8 text-cyan-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="text-2xl font-bold mb-3"
                >
                  How can I help you today?
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="text-white/90 mb-8"
                >
                  Ask me about UK employment law, case precedents, or help
                  organizing your case.
                </motion.p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <button
                  onClick={() =>
                    setInput("What are my rights if I'm being bullied at work?")
                  }
                  className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-colors text-left"
                >
                  <p className="font-medium mb-1">Workplace Rights</p>
                  <p className="text-sm text-white/90">
                    Understand your protections against bullying
                  </p>
                </button>

                <button
                  onClick={() =>
                    setInput(
                      "How do I gather evidence for an unfair dismissal claim?",
                    )
                  }
                  className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-colors text-left"
                >
                  <p className="font-medium mb-1">Building Your Case</p>
                  <p className="text-sm text-white/90">
                    Learn what evidence you need
                  </p>
                </button>

                <button
                  onClick={() => setInput("What is constructive dismissal?")}
                  className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-colors text-left"
                >
                  <p className="font-medium mb-1">Legal Concepts</p>
                  <p className="text-sm text-white/90">
                    Get clear explanations of legal terms
                  </p>
                </button>

                <button
                  onClick={() =>
                    setInput(
                      "What should I do if I'm being discriminated against?",
                    )
                  }
                  className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-colors text-left"
                >
                  <p className="font-medium mb-1">Discrimination</p>
                  <p className="text-sm text-white/90">
                    Know your rights and next steps
                  </p>
                </button>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {(messages.length > 0 || isStreaming) && (
          <div className="p-6 space-y-4">
            {/* Regular messages with entrance animations */}
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  <MessageItem
                    message={message}
                    onSaveToCase={handleSaveToCase}
                    onCreateCase={handleCreateCaseFromAnalysis}
                    showThinking={_showThinking}
                    style={{}}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Pending AI Actions (displayed inline after messages) */}
            <AnimatePresence>
              {pendingActions.map((action) => (
                <ActionPendingCard
                  key={action.id}
                  action={action}
                  onQuickApprove={handleQuickApprove}
                  onReview={handleReview}
                  onReject={handleReject}
                  allowQuickApprove={true}
                />
              ))}
            </AnimatePresence>

            {/* AI Thinking/Responding Indicator */}
            <AnimatePresence mode="wait">
              {isStreaming && (
                <motion.div
                  key="streaming"
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{
                    duration: 0.5,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className="flex justify-start"
                >
                  {!currentStreamingMessage ? (
                    // Show typing indicator when waiting for first token
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TypingIndicator status="thinking" />
                    </motion.div>
                  ) : (
                    // Show streaming message with animated cursor
                    <motion.div
                      className="max-w-3xl bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 shadow-lg"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                      }}
                      transition={{
                        duration: 0.3,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <motion.svg
                          className="w-5 h-5 text-cyan-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          animate={{
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </motion.svg>
                        <span className="text-sm font-medium text-white/90">AI Assistant</span>
                        <motion.div
                          className="ml-auto flex items-center gap-2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        >
                          <motion.div
                            className="w-2 h-2 rounded-full bg-green-400"
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [0.7, 1, 0.7],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          />
                          <motion.span
                            className="text-xs font-medium text-green-400"
                            animate={{
                              opacity: [0.7, 1, 0.7],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          >
                            Live
                          </motion.span>
                        </motion.div>
                      </div>
                      <div className="prose prose-invert max-w-none text-white/90">
                        <ReactMarkdown>{currentStreamingMessage}</ReactMarkdown>
                        <motion.span
                          className="inline-block w-[2px] h-5 ml-1 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"
                          animate={{
                            opacity: [1, 0.3, 1],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-white/10 bg-gray-900/80 backdrop-blur-md p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            {/* Upload button */}
            <button
              onClick={handleDocumentUpload}
              disabled={isStreaming || isAnalyzingDocument}
              className="flex-shrink-0 p-3 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:cursor-not-allowed border border-white/10 rounded-lg transition-colors group"
              title="Upload document for analysis (PDF, DOCX, TXT)"
            >
              {isAnalyzingDocument ? (
                <svg
                  className="w-5 h-5 animate-spin text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                <Upload className="w-5 h-5 text-white/70 group-hover:text-primary-400 transition-colors" />
              )}
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about UK civil legal matters, or upload a document..."
              disabled={isStreaming || isAnalyzingDocument}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={3}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || isAnalyzingDocument}
              className="px-6 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isStreaming ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-white/80 flex items-center gap-4">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span className="flex items-center gap-1 text-white/60">
              <FileText className="w-3 h-3" />
              Supports: PDF, DOCX, TXT (max 10MB)
            </span>
          </div>
        </div>
      </div>

      {/* Save to Case Dialog */}
      <SaveToCaseDialog
        open={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSaveConfirm}
        messageContent={messageToSave?.content || ''}
        sessionId={localStorage.getItem('sessionId') || ''}
      />

      {/* AI Case Creation Dialog */}
      {aiCaseData && (
        <AICaseCreationDialog
          open={isAICaseDialogOpen}
          onClose={() => setIsAICaseDialogOpen(false)}
          aiSuggestions={aiCaseData}
          documentAnalysis={documentAnalysisText}
          onConfirm={handleCaseConfirm}
        />
      )}

      {/* AI Action Confirmation Dialog */}
      {dialogAction && (
        <AIActionConfirmationDialog
          action={dialogAction}
          isOpen={dialogAction !== null}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      )}
    </div>
  );
}
