import { memo, useMemo, useState } from "react";
import {
  Save,
  Plus,
  FileText,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Brain,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  thinking?: string;
  documentAnalysis?: {
    filename: string;
    suggestedCaseData?: any;
    documentOwnershipMismatch?: boolean;
    documentClaimantName?: string;
  };
}

interface MessageItemProps {
  message: Message;
  onSaveToCase: (message: Message) => void;
  onCreateCase?: (message: Message) => void;
  showThinking: boolean;
  hasCaseSelected?: boolean; // Whether a case is currently selected
  style?: React.CSSProperties; // Optional: for react-window positioning (no longer used)
}

// Parse <think> tags from content and return cleaned content + thinking
function parseThinkingFromContent(content: string): {
  displayContent: string;
  thinking: string | null;
} {
  // Match <think>...</think> tags (case-insensitive, handles newlines)
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  const matches = content.match(thinkRegex);

  if (!matches || matches.length === 0) {
    return { displayContent: content, thinking: null };
  }

  // Extract all thinking content
  const thinkingParts: string[] = [];
  let cleanedContent = content;

  for (const match of matches) {
    // Extract the content inside <think>...</think>
    const innerContent = match.replace(/<\/?think>/gi, "").trim();
    if (innerContent) {
      thinkingParts.push(innerContent);
    }
    // Remove the <think> block from the display content
    cleanedContent = cleanedContent.replace(match, "");
  }

  // Clean up any extra whitespace left behind
  cleanedContent = cleanedContent.trim().replace(/\n{3,}/g, "\n\n");

  return {
    displayContent: cleanedContent,
    thinking: thinkingParts.length > 0 ? thinkingParts.join("\n\n") : null,
  };
}

function MessageItemComponent({
  message,
  onSaveToCase,
  onCreateCase,
  showThinking,
  hasCaseSelected = false,
  style = {},
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  // Parse thinking from content
  const { displayContent, thinking: parsedThinking } = useMemo(
    () => parseThinkingFromContent(message.content),
    [message.content],
  );

  // Use parsed thinking or the message.thinking property
  const thinkingContent = parsedThinking || message.thinking;

  const handleCopy = async () => {
    try {
      // Copy the display content (without thinking tags)
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      toast.success("Message copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("[MessageItem] Copy failed:", error);
      toast.error("Failed to copy message");
    }
  };

  return (
    <div style={style}>
      <div
        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[85%] sm:max-w-[75%] ${
            message.role === "user"
              ? "bg-gold-400/20 text-white rounded-2xl rounded-br-md"
              : "bg-primary-800/80 rounded-2xl rounded-bl-md"
          } px-3 py-2.5 sm:p-4`}
        >
          {/* No header for assistant on mobile - cleaner like ChatGPT */}

          {/* Document Analysis Badge */}
          {message.documentAnalysis && (
            <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-blue-200">
                Document Analysis: {message.documentAnalysis.filename}
              </span>
            </div>
          )}

          {/* Name Detection Warning */}
          {message.documentAnalysis?.documentOwnershipMismatch && (
            <div className="mb-3 p-3 bg-amber-500/20 border border-amber-500/40 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-200 font-medium">
                    This document may not be yours
                  </p>
                  <p className="text-amber-200/80 text-sm mt-1">
                    {message.documentAnalysis.documentClaimantName
                      ? `This document appears to be about ${message.documentAnalysis.documentClaimantName}. If this belongs to someone else, tell them about Justice Companion!`
                      : "Your name was not found in this document. Please verify this document belongs to your case."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="prose prose-sm prose-invert max-w-none text-white/90">
            <ReactMarkdown>{displayContent}</ReactMarkdown>
          </div>

          {/* Action Buttons (for assistant messages only) - compact on mobile */}
          {message.role === "assistant" && (
            <div className="mt-2 flex items-center gap-1 sm:gap-2">
              <button
                onClick={handleCopy}
                className="p-1.5 text-white/40 hover:text-white/70 rounded transition-colors"
                type="button"
                title="Copy"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>

              {hasCaseSelected && (
                <button
                  onClick={() => onSaveToCase(message)}
                  className="p-1.5 text-white/40 hover:text-white/70 rounded transition-colors"
                  title="Save to case"
                  type="button"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}

              {/* Create Case Button */}
              {message.documentAnalysis?.suggestedCaseData &&
                onCreateCase &&
                !hasCaseSelected && (
                  <button
                    onClick={() => onCreateCase(message)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 hover:bg-green-500/20 rounded transition-colors"
                    type="button"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">Create Case</span>
                  </button>
                )}

              <span className="ml-auto text-xs text-white/30">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* User message timestamp */}
          {message.role === "user" && (
            <div className="mt-1 text-xs text-white/40 text-right">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          {/* AI Thinking Dropdown (at the bottom of the message) */}
          {thinkingContent && showThinking && message.role === "assistant" && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                onClick={() => setThinkingExpanded(!thinkingExpanded)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-all w-full justify-between border border-purple-500/20 hover:border-purple-500/30"
                type="button"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <span>AI Reasoning Process</span>
                </div>
                {thinkingExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {thinkingExpanded && (
                <div className="mt-2 p-4 bg-purple-900/20 rounded-lg border border-purple-500/20 text-sm">
                  <p className="text-purple-100/90 whitespace-pre-wrap leading-relaxed">
                    {thinkingContent}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const MessageItem = memo(MessageItemComponent);
