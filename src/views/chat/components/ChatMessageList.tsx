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
              onSaveToCase={onSaveToCase}
              onCreateCase={onCreateCase}
              showThinking={showThinking}
              hasCaseSelected={hasCaseSelected}
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
                <span className="text-sm text-white/70">AI is thinking...</span>
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
  );
}

// Export memoized component to prevent unnecessary re-renders when parent state changes
export const ChatMessageList = memo(ChatMessageListComponent);
