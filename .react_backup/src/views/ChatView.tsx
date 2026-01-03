/**
 * ChatView - AI Legal Assistant (Refactored)
 *
 * Modular structure with extracted components for better maintainability
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SaveToCaseDialog } from "./chat/SaveToCaseDialog";
import { AICaseCreationDialog } from "./chat/AICaseCreationDialog";
import {
  ChatHeader,
  ChatEmptyState,
  ChatMessageList,
  ChatInput,
} from "./chat/components";
import { useStreamingChat, Message } from "../hooks/useStreamingChat";
import { apiClient } from "../lib/apiClient";

/**
 * ChatView - AI Legal Assistant
 *
 * CRITICAL: This is a legal information tool, NOT a lawyer.
 */
export function ChatView() {
  // ==================== STATE ====================

  // Active case tracking
  const [activeCaseId, setActiveCaseId] = useState<string | null>(() =>
    localStorage.getItem("activeCaseId")
  );

  // Streaming chat hook
  const {
    messages,
    isStreaming,
    currentStreamingMessage,
    sendMessage: sendStreamingMessage,
    clearMessages: clearStreamingMessages,
    setMessages,
  } = useStreamingChat({
    conversationId: null,
    caseId: activeCaseId ? parseInt(activeCaseId) : null,
    useRAG: true,
    onConversationCreated: (conversationId) => {
      setCurrentConversationId(conversationId);
    },
  });

  // UI state
  const [input, setInput] = useState("");
  const [showThinking, setShowThinking] = useState(true);
  const [_currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);

  // Dialog state
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [messageToSave, setMessageToSave] = useState<Message | null>(null);
  const [isAICaseDialogOpen, setIsAICaseDialogOpen] = useState(false);
  const [messageForCaseCreation, setMessageForCaseCreation] =
    useState<Message | null>(null);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);
  const [_duplicateCaseData, setDuplicateCaseData] = useState<any>(null);
  const [_existingCaseTitle, setExistingCaseTitle] = useState<string>("");

  // Document upload state
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = useState<string>("");

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ==================== EFFECTS ====================

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

  // Save messages to localStorage
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, currentStreamingMessage]);

  // Fetch AI config on mount
  useEffect(() => {
    const fetchAIConfig = async () => {
      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) { return; }

        apiClient.setSessionId(sessionId);
        const result = await apiClient.aiConfig.getActive();

        if (result.success && result.data) {
          setCurrentProvider(result.data.provider || "");
          setSelectedModel(result.data.model || "");

          const providersResult = await apiClient.aiConfig.listProviders();
          if (providersResult.success && providersResult.data) {
            const providerData = providersResult.data[result.data.provider];
            const availableModels = Array.isArray(
              providerData?.available_models
            )
              ? (providerData.available_models as string[])
              : [];
            setAvailableModels(availableModels);
          }
        }
      } catch (error) {
        console.error("[ChatView] Failed to fetch AI config:", error);
      }
    };

    fetchAIConfig();
  }, []);

  // ==================== EVENT HANDLERS ====================

  const handleModelChange = useCallback(
    async (newModel: string) => {
      if (!currentProvider || newModel === selectedModel) { return; }

      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          toast.error("No active session");
          return;
        }

        apiClient.setSessionId(sessionId);

        const currentConfig = await apiClient.aiConfig.getActive();
        if (!currentConfig.success || !currentConfig.data) {
          toast.error("Failed to get current AI config");
          return;
        }

        const existingApiKey =
          currentConfig.data.api_key ?? currentConfig.data.apiKey ?? "";
        const result = await apiClient.aiConfig.configure(currentProvider, {
          api_key: existingApiKey,
          endpoint: currentConfig.data.endpoint,
          model: newModel,
        });

        if (result.success) {
          setSelectedModel(newModel);
          toast.success("Model updated", {
            description: `Now using ${newModel}`,
          });
        } else {
          toast.error("Failed to update model");
        }
      } catch (error) {
        console.error("[ChatView] Failed to update model:", error);
        toast.error("Failed to update model");
      }
    },
    [currentProvider, selectedModel]
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) { return; }

    const messageText = input.trim();
    setInput("");
    await sendStreamingMessage(messageText);
  }, [input, isStreaming, sendStreamingMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
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

        const factContent = `${title}\n\n${messageToSave.content}\n\n[Source: AI Legal Assistant]`;

        const result = await window.justiceAPI.createCaseFact(
          {
            caseId,
            factContent,
            factCategory: "other",
            importance: "medium",
          },
          sessionId
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
    [messageToSave]
  );

  const handleCreateCase = useCallback((message: Message) => {
    setMessageForCaseCreation(message);
    setIsAICaseDialogOpen(true);
  }, []);

  const handleAICaseConfirm = useCallback(
    async (caseData: any) => {
      if (!messageForCaseCreation) { return; }

      setIsCreatingCase(true);

      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) {
          toast.error("No active session");
          return;
        }

        // Check for duplicates
        try {
          const existingCasesResponse = await apiClient.cases.list();
          if (existingCasesResponse.success && existingCasesResponse.data) {
            const cases = existingCasesResponse.data.items || [];
            const duplicateCase = cases.find(
              (case_: any) =>
                case_.title?.toLowerCase() === caseData.title?.toLowerCase()
            );

            if (duplicateCase) {
              setIsCreatingCase(false);
              setDuplicateCaseData(caseData);
              setExistingCaseTitle(duplicateCase.title);
              setIsDuplicateWarningOpen(true);
              return;
            }
          }
        } catch (err) {
          console.error("Failed to check for duplicate cases:", err);
        }

        // Create the case
        apiClient.setSessionId(sessionId);
        const result = await apiClient.cases.create({
          title: caseData.title,
          caseType: caseData.caseType || "other",
          description: caseData.description,
        });

        if (result.success && result.data) {
          toast.success("Case created successfully", {
            description: caseData.title,
          });

          localStorage.setItem("activeCaseId", String(result.data.id));
          setActiveCaseId(String(result.data.id));

          setIsAICaseDialogOpen(false);
          setMessageForCaseCreation(null);
        } else {
          toast.error("Failed to create case");
        }
      } catch (error) {
        console.error("Failed to create case:", error);
        toast.error("Failed to create case");
      } finally {
        setIsCreatingCase(false);
      }
    },
    [messageForCaseCreation]
  );

  // Document upload handler (complex, kept in main component)
  const handleDocumentUpload = useCallback(async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf,.docx,.txt,.doc";
    fileInput.style.display = "none";

    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) { return; }

      setIsAnalyzingDocument(true);

      try {
        const sessionId = localStorage.getItem("sessionId");
        if (!sessionId) { throw new Error("No active session"); }

        apiClient.setSessionId(sessionId);
        const filename = file.name;

        // Add upload message
        const uploadMessage: Message = {
          id: `upload-${Date.now()}`,
          role: "user",
          content: `📎 Uploaded document: ${filename}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, uploadMessage]);

        toast.info("Uploading document...", {
          description: `Uploading ${filename}`,
        });

        // Upload
        const uploadResult = await apiClient.chat.uploadDocument(
          file,
          `Please analyze this document: ${filename}`
        );

        if (!uploadResult.success || !uploadResult.data?.filePath) {
          throw new Error("Failed to upload document");
        }

        toast.info("Analyzing document...");

        // Analyze
        const analysisResult = await apiClient.chat.analyzeDocument(
          uploadResult.data.filePath,
          `Please analyze this document: ${filename}`
        );

        if (!analysisResult.success) {
          throw new Error(
            analysisResult.error?.message || "Failed to analyze document"
          );
        }

        // Parse case data
        const rawData =
          analysisResult.data?.suggested_case_data ||
          analysisResult.data?.suggestedCaseData;

        const suggestedCaseData = rawData
          ? {
              title: rawData.title,
              caseType: rawData.case_type || rawData.caseType,
              description: rawData.description,
              opposingParty: rawData.opposing_party || rawData.opposingParty,
              caseNumber: rawData.case_number || rawData.caseNumber,
              courtName: rawData.court_name || rawData.courtName,
              filingDeadline: rawData.filing_deadline || rawData.filingDeadline,
              nextHearingDate:
                rawData.next_hearing_date || rawData.nextHearingDate,
            }
          : {
              title: `Case regarding ${filename}`,
              caseType: "other",
              description: `Document uploaded: ${filename}`,
            };

        const analysisMessage: Message = {
          id: `analysis-${Date.now()}`,
          role: "assistant",
          content: analysisResult.data!.analysis,
          timestamp: new Date(),
          documentAnalysis: {
            filename,
            suggestedCaseData,
          },
        } as any;

        setMessages((prev) => [...prev, analysisMessage]);

        toast.success("Document analyzed successfully");
      } catch (error) {
        console.error("[ChatView] Document upload error:", error);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Sorry, I couldn't analyze that document: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        toast.error("Failed to analyze document");
      } finally {
        setIsAnalyzingDocument(false);
        document.body.removeChild(fileInput);
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
  }, [setMessages]);

  const handleClearChat = useCallback(() => {
    if (messages.length === 0) { return; }

    clearStreamingMessages();
    setCurrentConversationId(null);
    toast.success("Chat cleared", {
      description: `Cleared ${messages.length} messages`,
    });
  }, [messages.length, clearStreamingMessages]);

  // ==================== RENDER ====================

  return (
    <div className="flex flex-col h-full bg-primary-950 text-white">
      <ChatHeader
        availableModels={availableModels}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        onClearChat={handleClearChat}
        hasMessages={messages.length > 0}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {messages.length === 0 && !isStreaming && (
            <ChatEmptyState onSelectPrompt={setInput} />
          )}
        </AnimatePresence>

        {(messages.length > 0 || isStreaming) && (
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            currentStreamingMessage={currentStreamingMessage}
            showThinking={showThinking}
            hasCaseSelected={!!activeCaseId}
            onSaveToCase={handleSaveToCase}
            onCreateCase={handleCreateCase}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>

      <ChatInput
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        onDocumentUpload={handleDocumentUpload}
        isStreaming={isStreaming}
        isAnalyzingDocument={isAnalyzingDocument}
        showThinking={showThinking}
        onToggleThinking={() => setShowThinking(!showThinking)}
        inputRef={inputRef}
      />

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

      {isDuplicateWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* Duplicate warning dialog - simplified */}
          <div className="bg-gray-800 rounded-lg p-6 max-w-md">
            <p className="text-white">A case with this name already exists.</p>
            <button
              onClick={() => setIsDuplicateWarningOpen(false)}
              className="mt-4 px-4 py-2 bg-primary-500 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
