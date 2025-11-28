import { memo } from "react";
import { Save, Plus, FileText, Copy, Check, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useState } from "react";

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
  style?: React.CSSProperties; // Optional: for react-window positioning (no longer used)
}

function MessageItemComponent({
  message,
  onSaveToCase,
  onCreateCase,
  showThinking,
  style = {},
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
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
        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} px-6`}
      >
        <div
          className={`max-w-3xl ${
            message.role === "user"
              ? "bg-primary-600 text-white rounded-2xl rounded-tr-sm"
              : "bg-primary-800 border border-gray-700 rounded-2xl rounded-tl-sm"
          } p-4`}
        >
          {message.role === "assistant" && (
            <div className="flex items-center gap-2 mb-2 text-sm text-white/90">
              <svg
                className="w-4 h-4"
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
            </div>
          )}

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

          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>

          {message.thinking && showThinking && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-white/90 hover:text-white">
                View AI reasoning process
              </summary>
              <div className="mt-2 p-3 bg-primary-900/50 rounded border border-gray-700">
                <p className="text-white/90 whitespace-pre-wrap">
                  {message.thinking}
                </p>
              </div>
            </details>
          )}

          {/* Action Buttons (for assistant messages only) */}
          {message.role === "assistant" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => onSaveToCase(message)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10 hover:border-white/20"
                type="button"
              >
                <Save className="w-4 h-4" />
                Save to Case
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10 hover:border-white/20"
                type="button"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>

              {/* Create Case Button (shown when AI suggests case creation) */}
              {message.documentAnalysis?.suggestedCaseData && onCreateCase && (
                <button
                  onClick={() => onCreateCase(message)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-green-300 hover:text-white bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors border border-green-500/30 hover:border-green-500/50"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  Create Case from Analysis
                </button>
              )}
            </div>
          )}

          <div className="mt-2 text-xs text-white/80">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export const MessageItem = memo(MessageItemComponent);
