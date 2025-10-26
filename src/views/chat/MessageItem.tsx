import { memo } from 'react';
import { Save } from 'lucide-react';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  thinking?: string;
}

interface MessageItemProps {
  message: Message;
  onSaveToCase: (message: Message) => void;
  showThinking: boolean;
  style: React.CSSProperties; // For react-window positioning
}

function MessageItemComponent({ message, onSaveToCase, showThinking, style }: MessageItemProps) {
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

          <div className="prose prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{message.content}</p>
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

          {/* Save to Case Button (for assistant messages only) */}
          {message.role === "assistant" && (
            <button
              onClick={() => onSaveToCase(message)}
              className="mt-3 flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10 hover:border-white/20"
              type="button"
            >
              <Save className="w-4 h-4" />
              Save to Case
            </button>
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
