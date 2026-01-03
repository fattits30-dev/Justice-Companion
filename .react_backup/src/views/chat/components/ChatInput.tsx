/**
 * ChatInput - Modern, polished message input area
 *
 * Features:
 * - Auto-resizing textarea
 * - Smooth focus transitions with glow effect
 * - Stop generation button when streaming
 * - Character count indicator
 * - Mobile-optimized layout
 */

import { useEffect, useRef } from "react";
import { Upload, Brain, Send, Square, Sparkles } from "lucide-react";

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
  onStopGeneration?: () => void;
}

const MAX_CHARS = 4000;

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
  onStopGeneration,
}: ChatInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize effect
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 200) + "px";
    }
  }, [input, inputRef]);

  const charCount = input.length;
  const isNearLimit = charCount > MAX_CHARS * 0.9;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = input.trim().length > 0 && !isStreaming && !isAnalyzingDocument && !isOverLimit;

  return (
    <div className="shrink-0 border-t border-white/10 bg-gradient-to-t from-primary-950 via-primary-950 to-primary-950/95 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Main input container */}
        <div
          ref={containerRef}
          className={`
            relative flex items-end gap-2 sm:gap-3
            bg-primary-900/80 backdrop-blur-sm
            border rounded-2xl
            transition-all duration-300 ease-out
            ${isStreaming
              ? "border-gold-400/40 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
              : "border-white/10 hover:border-white/20 focus-within:border-gold-400/50 focus-within:shadow-[0_0_30px_rgba(251,191,36,0.1)]"
            }
          `}
        >
          {/* Upload button */}
          <button
            onClick={onDocumentUpload}
            disabled={isStreaming || isAnalyzingDocument}
            className={`
              shrink-0 p-2.5 sm:p-3 ml-1 sm:ml-2 mb-1 sm:mb-1.5
              rounded-xl transition-all duration-200
              ${isAnalyzingDocument
                ? "text-gold-400"
                : "text-white/40 hover:text-white/70 hover:bg-white/5 active:scale-95"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title="Upload document for analysis"
            aria-label="Upload document"
          >
            {isAnalyzingDocument ? (
              <div className="relative">
                <Upload className="w-5 h-5 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold-400 rounded-full animate-ping" />
              </div>
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </button>

          {/* Textarea wrapper */}
          <div className="flex-1 min-w-0 py-2 sm:py-2.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about your legal situation..."
              disabled={isStreaming || isAnalyzingDocument}
              className={`
                w-full bg-transparent
                text-white text-base leading-relaxed
                placeholder-white/30
                focus:outline-none resize-none
                min-h-[28px] max-h-[200px]
                disabled:opacity-60
                transition-opacity duration-200
              `}
              rows={1}
              aria-label="Message input"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 mr-1.5 sm:mr-2 mb-1.5 sm:mb-2">
            {/* Thinking toggle - compact pill */}
            <button
              onClick={onToggleThinking}
              className={`
                hidden sm:flex items-center gap-1.5 px-2.5 py-1.5
                rounded-lg text-xs font-medium
                transition-all duration-200
                ${showThinking
                  ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
                }
              `}
              title={showThinking ? "Hide thinking process" : "Show thinking process"}
              type="button"
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{showThinking ? "On" : "Think"}</span>
            </button>

            {/* Send / Stop button */}
            {isStreaming && onStopGeneration ? (
              <button
                onClick={onStopGeneration}
                className="
                  p-2.5 sm:p-3
                  bg-red-500/20 hover:bg-red-500/30
                  text-red-400 hover:text-red-300
                  rounded-xl
                  transition-all duration-200
                  active:scale-95
                "
                title="Stop generation"
                aria-label="Stop generation"
              >
                <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!canSend}
                className={`
                  p-2.5 sm:p-3 rounded-xl
                  transition-all duration-200
                  ${canSend
                    ? "bg-gold-400 hover:bg-gold-300 text-primary-950 hover:scale-105 active:scale-95 shadow-lg shadow-gold-400/20"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                  }
                `}
                title="Send message"
                aria-label="Send message"
              >
                <Send className={`w-4 h-4 sm:w-5 sm:h-5 ${canSend ? "translate-x-0.5" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Footer row */}
        <div className="mt-2 flex items-center justify-between px-1">
          {/* Left side - hints */}
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span className="hidden sm:inline">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">Enter</kbd> to send
            </span>
            <span className="hidden sm:inline text-white/20">·</span>
            <span className="hidden sm:inline">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">Shift+Enter</kbd> new line
            </span>
          </div>

          {/* Right side - character count & mobile thinking toggle */}
          <div className="flex items-center gap-3">
            {/* Mobile thinking toggle */}
            <button
              onClick={onToggleThinking}
              className={`
                sm:hidden flex items-center gap-1 px-2 py-1
                rounded-md text-xs
                transition-all duration-200
                ${showThinking
                  ? "bg-purple-500/20 text-purple-300"
                  : "text-white/40"
                }
              `}
              type="button"
            >
              <Brain className="w-3 h-3" />
            </button>

            {/* Character count */}
            {charCount > 100 && (
              <span
                className={`
                  text-xs font-mono transition-colors duration-200
                  ${isOverLimit
                    ? "text-red-400"
                    : isNearLimit
                      ? "text-amber-400/70"
                      : "text-white/30"
                  }
                `}
              >
                {charCount.toLocaleString()}/{MAX_CHARS.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gold-400/70">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>Generating response...</span>
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
