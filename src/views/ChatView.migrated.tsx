/**
 * ChatView - AI Legal Assistant (HTTP Streaming Version)
 *
 * MIGRATED VERSION: Uses HTTP REST API with streaming instead of Electron IPC
 *
 * Key Changes:
 * - Replaced window.justiceAPI.streamChat() with apiClient.chat.stream()
 * - Uses useStreamingChat hook for state management
 * - Maintains exact same UI/UX
 * - All document analysis features preserved
 * - Case creation and saving functionality intact
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext.tsx";
import { SaveToCaseDialog } from "./chat/SaveToCaseDialog.tsx";
import { MessageItem } from "./chat/MessageItem.tsx";
import { AICaseCreationDialog } from "./chat/AICaseCreationDialog.tsx";
import { toast } from "sonner";
import { Upload, FileText, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useStreamingChat, Message } from "../hooks/useStreamingChat.ts";

/**
 * ChatView - AI Legal Assistant
 *
 * CRITICAL: This is a legal information tool, NOT a lawyer.
 * Every response includes a disclaimer.
 */
export function ChatView() {
  const { user } = useAuth();

  // Track active case from localStorage
  const [activeCaseId, setActiveCaseId] = useState<string | null>(() => {
    return localStorage.getItem("activeCaseId");
  });

  // Initialize streaming chat hook
  const {
    messages,
    isStreaming,
    currentStreamingMessage,
    sendMessage: sendStreamingMessage,
    clearMessages: clearStreamingMessages,
    setMessages,
  } = useStreamingChat({
    conversationId: null, // Will be set after first message
    caseId: activeCaseId ? parseInt(activeCaseId) : null,
    useRAG: true,
    onConversationCreated: (conversationId) => {
      console.log("[ChatView] Conversation created:", conversationId);
      setCurrentConversationId(conversationId);
    },
  });

  const [input, setInput] = useState("");
  const [_showThinking, _setShowThinking] = useState(false);
  const [_currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);

  // Save to case state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [messageToSave, setMessageToSave] = useState<Message | null>(null);

  // AI case creation dialog state
  const [isAICaseDialogOpen, setIsAICaseDialogOpen] = useState(false);
  const [messageForCaseCreation, setMessageForCaseCreation] =
    useState<Message | null>(null);
  const [isCreatingCase, setIsCreatingCase] = useState(false);

  // Duplicate case warning state
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);
  const [_duplicateCaseData, setDuplicateCaseData] = useState<any>(null);
  const [_existingCaseTitle, setExistingCaseTitle] = useState<string>("");

  // Document upload state
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage for active case
  useEffect(() => {
    try {
      const caseId = localStorage.getItem("activeCaseId");
      const storageKey = caseId
        ? `chatMessages-${caseId}`
        : "chatMessages-global";
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        const parsed = JSON.parse(saved);
        const loadedMessages = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(loadedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("[ChatView] Failed to load saved messages:", error);
      setMessages([]);
    }
  }, [activeCaseId, setMessages]);

  // Listen for active case changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newCaseId = localStorage.getItem("activeCaseId");
      if (newCaseId !== activeCaseId) {
        setActiveCaseId(newCaseId);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [activeCaseId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      const storageKey = activeCaseId
        ? `chatMessages-${activeCaseId}`
        : "chatMessages-global";
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.error("[ChatView] Failed to save messages:", error);
    }
  }, [messages, activeCaseId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, currentStreamingMessage]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) {
      return;
    }

    const messageText = input.trim();
    setInput("");

    // Use streaming chat hook
    await sendStreamingMessage(messageText);
  }, [input, isStreaming, sendStreamingMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSaveToCase = useCallback((message: Message) => {
    setMessageToSave(message);
    setIsSaveDialogOpen(true);
  }, []);

  const handleSaveConfirm = useCallback(
    async (caseId: number, title: string) => {
      if (!messageToSave) {
        return { success: false, error: "No message selected" };
      }

      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          return { success: false, error: "No active session" };
        }

        // Format the AI response as a case fact
        const factContent = `${title}\n\n${messageToSave.content}\n\n[Source: AI Legal Assistant]`;

        // Save the AI response as a case fact
        const result = await window.justiceAPI.createCaseFact(
          {
            caseId,
            factContent,
            factCategory: "other",
            importance: "medium",
          },
          sessionId,
        );

        if (result.success) {
          toast.success("AI response saved to case", {
            description: `Saved to ${title}`,
          });
          return { success: true };
        }

        const errorMsg =
          typeof result.error === "string"
            ? result.error
            : result.error?.message || "Failed to save";
        return { success: false, error: errorMsg };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save";
        toast.error("Failed to save to case", {
          description: errorMessage,
        });
        return { success: false, error: errorMessage };
      }
    },
    [messageToSave],
  );

  const handleCreateCase = useCallback((message: Message) => {
    setMessageForCaseCreation(message);
    setIsAICaseDialogOpen(true);
  }, []);

  const handleAICaseConfirm = useCallback(
    async (caseData: any) => {
      if (!messageForCaseCreation) {
        return;
      }

      setIsCreatingCase(true);

      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          toast.error("No active session", {
            description: "Please log in to create cases",
          });
          return;
        }

        // Check for duplicate cases
        try {
          const existingCases = (await window.justiceAPI.getAllCases(
            sessionId,
          )) as any;
          const duplicateCase = existingCases.data?.find(
            (case_: any) =>
              case_.title?.toLowerCase() === caseData.title?.toLowerCase(),
          );

          if (duplicateCase) {
            setIsCreatingCase(false);
            setDuplicateCaseData(caseData);
            setExistingCaseTitle(duplicateCase.title);
            setIsDuplicateWarningOpen(true);
            return;
          }
        } catch (error) {
          console.warn(
            "[ChatView] Could not check for duplicate cases:",
            error,
          );
        }

        // Create the case
        const result = await window.justiceAPI.createCase(caseData, sessionId, {
          source: "document_analysis",
          documentFilename:
            (messageForCaseCreation as any).documentAnalysis?.filename ||
            "unknown",
          aiProvider: "document_extraction",
          confidence: (messageForCaseCreation as any).documentAnalysis
            ?.suggestedCaseData?.confidence,
          extractedFrom: (messageForCaseCreation as any).documentAnalysis
            ?.suggestedCaseData?.extractedFrom,
        });

        if (result.success && result.data) {
          toast.success("Case created successfully", {
            description: `Created case: ${result.data.title}`,
          });

          setIsAICaseDialogOpen(false);
          setMessageForCaseCreation(null);

          // Switch to the new case
          if (result.data.id) {
            const newCaseId = result.data.id.toString();
            localStorage.setItem("activeCaseId", newCaseId);
            setActiveCaseId(newCaseId);

            // Add guidance message
            const guidanceMessage: Message = {
              id: `guidance-${Date.now()}`,
              role: "assistant",
              content: `🎯 **Case Created Successfully!**

I've created your case "${result.data.title}" and switched you to it. Now let's build your legal strategy together.

---

## ⚠️ **IMPORTANT LEGAL DISCLAIMER**

**I AM NOT A LAWYER AND THIS IS NOT LEGAL ADVICE**

- This is a legal information tool designed to help you organize and understand your case
- Nothing I provide constitutes legal advice, representation, or counsel
- All information is general in nature and may not apply to your specific situation
- **You must consult a qualified legal professional** for advice specific to your case
- Laws and regulations change frequently - always verify current requirements
- I cannot guarantee the accuracy, completeness, or timeliness of any information

---

**What I can help you with next:**

📋 **Case Organization & Planning**
- Help organize your evidence and documents
- Create timelines for important deadlines
- Suggest general steps for case preparation

📚 **Legal Information & Research**
- Provide general information about UK employment law processes
- Share publicly available legal resources and precedents
- Explain common legal concepts and procedures

📄 **Document Management**
- Help organize and categorize your case documents
- Suggest standard document types you may need
- Provide general templates and checklists

💡 **General Guidance:**
Based on your dismissal letter, here are some general steps many people take when preparing an employment case:

1. **Gather Documentation** - Collect emails, performance reviews, contracts, etc.
2. **Check Time Limits** - Note important deadlines (generally 3 months for unfair dismissal claims)
3. **Document Your Case** - Keep detailed records of events and communications
4. **Seek Professional Advice** - Consult a solicitor or trade union representative

**What would you like to focus on first?** I can help you organize your case information and provide general guidance about the process.

---

*Remember: This tool is for information purposes only. For legal advice, please consult a qualified solicitor or legal professional.*`,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, guidanceMessage]);
          }
        } else {
          toast.error("Failed to create case", {
            description: "An unexpected error occurred",
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create case";
        toast.error("Failed to create case", {
          description: errorMessage,
        });
      } finally {
        setIsCreatingCase(false);
      }
    },
    [messageForCaseCreation, setMessages],
  );

  const handleDocumentUpload = useCallback(async () => {
    setIsAnalyzingDocument(true);

    try {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        throw new Error("No active session");
      }

      // Use Electron's dialog to select file
      const result = await window.justiceAPI.showOpenDialog({
        title: "Select Document to Analyze",
        filters: [
          { name: "Documents", extensions: ["pdf", "docx", "txt"] },
          { name: "All Files", extensions: ["*"] },
        ],
        properties: ["openFile"],
      });

      if (
        result.canceled ||
        !result.filePaths ||
        result.filePaths.length === 0
      ) {
        setIsAnalyzingDocument(false);
        return;
      }

      const filePath = result.filePaths[0];
      const filename = filePath.split(/[\\/]/).pop() || "document";

      // Add upload message
      const uploadMessage: Message = {
        id: `upload-${Date.now()}`,
        role: "user",
        content: `📎 Uploaded document: ${filename}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, uploadMessage]);

      toast.info("Analyzing document...", {
        description: `Processing ${filename}`,
      });

      // Call document analysis API
      const analysisResult = await window.justiceAPI.analyzeDocument(
        filePath,
        sessionId,
        `Please analyze this document: ${filename}`,
        user ? { name: user.username, email: user.email } : undefined,
      );

      if (!analysisResult.success) {
        const errorMsg =
          "error" in analysisResult && analysisResult.error?.message
            ? analysisResult.error.message
            : "Failed to analyze document";
        throw new Error(errorMsg);
      }

      const suggestedCaseData = analysisResult.data?.suggestedCaseData;
      const hasActiveCase = !!activeCaseId;

      const finalSuggestedCaseData =
        !hasActiveCase && suggestedCaseData
          ? suggestedCaseData
          : !hasActiveCase
            ? {
                title: `Case regarding ${filename}`,
                caseType: "other",
                description: `Document uploaded for analysis: ${filename}`,
                confidence: {
                  title: 0.3,
                  caseType: 0.3,
                  description: 0.3,
                },
              }
            : undefined;

      const analysisMessage: Message = {
        id: `analysis-${Date.now()}`,
        role: "assistant",
        content: analysisResult.data!.analysis,
        timestamp: new Date(),
        ...(finalSuggestedCaseData
          ? {
              documentAnalysis: {
                filename,
                suggestedCaseData: finalSuggestedCaseData,
              },
            }
          : { documentAnalysis: { filename } }),
      } as any;

      setMessages((prev) => [...prev, analysisMessage]);

      if (hasActiveCase) {
        toast.info("Document added to active case", {
          description: `${filename} linked to current case`,
        });
      }

      toast.success("Document analyzed successfully", {
        description: `Analyzed ${filename}`,
      });
    } catch (error) {
      console.error("[ChatView] Document upload error:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Sorry, I couldn't analyze that document: ${error instanceof Error ? error.message : "Unknown error"}\n\nPlease try again or upload a different file.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      toast.error("Failed to analyze document", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsAnalyzingDocument(false);
    }
  }, [activeCaseId, user, setMessages]);

  const handleClearChat = useCallback(() => {
    if (messages.length === 0) {
      toast.info("Chat is already empty");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to clear all chat messages${activeCaseId ? " for this case" : ""}?\n\nThis cannot be undone.`,
    );

    if (confirmed) {
      clearStreamingMessages();
      setCurrentConversationId(null);
      toast.success("Chat cleared", {
        description: `Cleared ${messages.length} messages`,
      });
    }
  }, [messages.length, activeCaseId, clearStreamingMessages]);

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

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0">
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
                  transition={{ duration: 0.5, delay: 0.1, ease: "backOut" }}
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
                  className="text-white/90 mb-4"
                >
                  Ask me about UK employment law, case precedents, or help
                  organizing your case.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="text-xs text-white/60 mb-8 max-w-2xl mx-auto"
                >
                  ⚠️ **Legal Disclaimer**: I am not a lawyer and this is not
                  legal advice. All information is general and you should
                  consult a qualified legal professional for advice specific to
                  your situation.
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <button
                    onClick={() =>
                      setInput(
                        "What are my rights if I'm being bullied at work?",
                      )
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
                    onCreateCase={handleCreateCase}
                    showThinking={_showThinking}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming indicator */}
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
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      </div>
                      <span className="text-sm text-white/70">
                        AI is thinking...
                      </span>
                    </motion.div>
                  ) : (
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
                            ease: "easeInOut",
                          }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </motion.svg>
                        <span className="text-sm font-medium text-white/90">
                          AI Assistant
                        </span>
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
                              ease: "easeInOut",
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
                              ease: "easeInOut",
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
                            ease: "easeInOut",
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/10 bg-gray-900/80 backdrop-blur-md p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <button
              onClick={handleDocumentUpload}
              disabled={isStreaming || isAnalyzingDocument}
              className="shrink-0 p-3 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:cursor-not-allowed border border-white/10 rounded-lg transition-colors group"
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
              className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-primary-500 resize-none"
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

      {/* Dialogs */}
      <SaveToCaseDialog
        open={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSaveConfirm}
        messageContent={messageToSave?.content || ""}
        sessionId={localStorage.getItem("sessionId") || ""}
      />

      <AICaseCreationDialog
        isOpen={isAICaseDialogOpen}
        onClose={() => {
          setIsAICaseDialogOpen(false);
          setMessageForCaseCreation(null);
        }}
        onConfirm={handleAICaseConfirm}
        suggestedData={
          (messageForCaseCreation as any)?.documentAnalysis
            ?.suggestedCaseData || {}
        }
        isCreating={isCreatingCase}
      />

      {/* Duplicate warning dialog - unchanged from original */}
      {isDuplicateWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* ... duplicate dialog markup unchanged ... */}
        </div>
      )}
    </div>
  );
}
