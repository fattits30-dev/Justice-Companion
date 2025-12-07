/**
 * ChatInput - Message input area with controls
 */

import { Upload, FileText, Brain } from "lucide-react";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onDocumentUpload: () => void;
  isStreaming: boolean;
  isAnalyzingDocument: boolean;
  showThinking: boolean;
  onToggleThinking: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

export function ChatInput({
  input,
  onInputChange,
  onSend,
  onKeyDown,
  onDocumentUpload,
  isStreaming,
  isAnalyzingDocument,
  showThinking,
  onToggleThinking,
  inputRef,
}: ChatInputProps) {
  return (
    <div className="shrink-0 border-t border-white/10 bg-gray-900/80 backdrop-blur-md p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3">
          <button
            onClick={onDocumentUpload}
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
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask me anything about UK civil legal matters, or upload a document..."
            disabled={isStreaming || isAnalyzingDocument}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-primary-500 resize-none"
            rows={3}
          />
          <button
            onClick={onSend}
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
        <div className="mt-2 text-xs text-white/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span className="flex items-center gap-1 text-white/60">
              <FileText className="w-3 h-3" />
              Supports: PDF, DOCX, TXT (max 10MB)
            </span>
          </div>
          <button
            onClick={onToggleThinking}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
              showThinking
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
            title={showThinking ? "Hide AI reasoning" : "Show AI reasoning"}
            type="button"
          >
            <Brain className="w-3 h-3" />
            <span>{showThinking ? "Thinking: On" : "Thinking: Off"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
