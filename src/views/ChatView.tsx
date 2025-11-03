import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import { SaveToCaseDialog } from "./chat/SaveToCaseDialog.tsx";
import { MessageItem } from './chat/MessageItem.tsx';
import { toast } from 'sonner';
import { Upload, FileText, Plus, Trash2 } from 'lucide-react';

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

  // Save to case state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [messageToSave, setMessageToSave] = useState<Message | null>(null);

  // Document upload state
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);

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
          conversationId: null, // New conversation
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
        throw new Error(analysisResult.error || 'Failed to analyze document');
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

  const handleCreateCaseFromAnalysis = useCallback(async (suggestedData: any) => {
    // Instead of navigating away, ask the AI to help build the case
    const caseCreationPrompt = `I want to create a case file based on the document you just analyzed. Please help me build a comprehensive case by:

1. Summarizing what we know so far from the document
2. Asking me what other documents or evidence I have that might be relevant to this case
3. Helping me identify what additional information we need to gather
4. Suggesting what type of case this should be categorized as

Let's work together to build a strong case file. What do you need from me?`;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: caseCreationPrompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setCurrentStreamingMessage('');

    toast.info('Starting case creation with AI...', {
      description: 'The AI will help you build your case',
    });

    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        throw new Error("No active session");
      }

      // Stream AI response
      await window.justiceAPI.streamChat(
        {
          message: caseCreationPrompt,
          sessionId,
          caseId: activeCaseId || undefined,
        },
        (token: string) => {
          setCurrentStreamingMessage((prev) => prev + token);
        },
        (_thinking: string) => {
          // Thinking process (not currently displayed)
        },
        () => {
          // On complete
          const aiMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: currentStreamingMessage,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setIsStreaming(false);
          setCurrentStreamingMessage('');
        },
        (error: string) => {
          console.error('[ChatView] Streaming error:', error);
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: `Sorry, I encountered an error: ${error}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsStreaming(false);
          setCurrentStreamingMessage('');
          toast.error('Failed to get AI response', {
            description: error,
          });
        }
      );
    } catch (error) {
      console.error('[ChatView] Error starting case creation:', error);
      setIsStreaming(false);
      setCurrentStreamingMessage('');
      toast.error('Failed to start case creation', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [navigate, activeCaseId, currentStreamingMessage]);

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
      toast.success('Chat cleared', {
        description: `Cleared ${messages.length} messages`,
      });
    }
  }, [messages.length, activeCaseId]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 text-white">
      {/* Header with BIG legal disclaimer */}
      <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
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
          <div className="bg-amber-900/30 border-l-4 border-amber-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-semibold text-amber-200 mb-1">
                  This AI provides legal information, NOT legal advice
                </p>
                <p className="text-sm text-amber-100/80">
                  I can help you understand legal concepts, research case law,
                  and organize your thinking. But I'm NOT a lawyer and can't
                  give you advice on what to do in your specific situation. For
                  legal advice, talk to a qualified solicitor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages area - now with proper scrolling */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {messages.length === 0 && !isStreaming && (
          <div className="p-6">
            <div className="max-w-3xl mx-auto mt-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mb-6">
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
              </div>
              <h2 className="text-2xl font-bold mb-3">
                How can I help you today?
              </h2>
              <p className="text-white/90 mb-8">
                Ask me about UK employment law, case precedents, or help
                organizing your case.
              </p>

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
          </div>
        )}

        {(messages.length > 0 || isStreaming) && (
          <div className="p-6 space-y-4">
            {/* Regular messages */}
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onSaveToCase={handleSaveToCase}
                onCreateCase={handleCreateCaseFromAnalysis}
                showThinking={_showThinking}
                style={{}}
              />
            ))}

            {/* Streaming message */}
            {isStreaming && currentStreamingMessage && (
              <div key="streaming">
                <div className="flex justify-start">
                  <div className="max-w-3xl bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4">
                    <div className="flex items-center gap-2 mb-2 text-sm text-white/90">
                      <svg
                        className="w-4 h-4 animate-pulse"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span>AI Assistant</span>
                      <span className="ml-2 text-green-400">● Responding...</span>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">
                        {currentStreamingMessage}
                        <span className="animate-pulse">▊</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
    </div>
  );
}
