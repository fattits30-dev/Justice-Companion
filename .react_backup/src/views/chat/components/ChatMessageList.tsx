/**
 * ChatMessageList - Message rendering with streaming indicator
 */

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { MessageItem } from "../MessageItem";
import { Message } from "../../../hooks/useStreamingChat";

interface ChatMessageListProps {
  messages: Message[];
  isStreaming: boolean;
  currentStreamingMessage: string | null;
  showThinking: boolean;
  hasCaseSelected: boolean;
  onSaveToCase: (message: Message) => void;
  onCreateCase: (message: Message) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

function ChatMessageListComponent({
  messages,
  isStreaming,
  currentStreamingMessage,
  showThinking,
  hasCaseSelected,
  onSaveToCase,
  onCreateCase,
  messagesEndRef,
}: ChatMessageListProps) {
  return (
    <div className="px-3 sm:px-6 py-4 space-y-3 sm:space-y-4 max-w-3xl mx-auto">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
          >
            <MessageItem
              message={message}
              onSaveToCase={onSaveToCase}
              onCreateCase={onCreateCase}
              showThinking={showThinking}
              hasCaseSelected={hasCaseSelected}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Streaming indicator - simplified for mobile */}
      <AnimatePresence mode="wait">
        {isStreaming && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-start"
          >
            {!currentStreamingMessage ? (
              <div className="flex items-center gap-2 py-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
                <span className="text-sm text-white/50">Thinking...</span>
              </div>
            ) : (
              <div className="w-full bg-primary-900/50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="prose prose-sm prose-invert max-w-none text-white/90">
                  <ReactMarkdown>{currentStreamingMessage}</ReactMarkdown>
                  <span className="inline-block w-0.5 h-4 ml-0.5 bg-gold-400 rounded-full animate-pulse" />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders when parent state changes
export const ChatMessageList = memo(ChatMessageListComponent);
