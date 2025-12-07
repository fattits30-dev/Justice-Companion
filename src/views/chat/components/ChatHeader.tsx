/**
 * ChatHeader - AI chat header with model selector and controls
 */

import { Trash2, ChevronDown } from "lucide-react";

interface ChatHeaderProps {
  availableModels: string[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  onClearChat: () => void;
  hasMessages: boolean;
}

export function ChatHeader({
  availableModels,
  selectedModel,
  onModelChange,
  onClearChat,
  hasMessages,
}: ChatHeaderProps) {
  return (
    <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">AI Legal Assistant</h1>
          <div className="flex items-center gap-3">
            {/* Model Selector */}
            {availableModels.length > 0 && (
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-8 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  title="Select AI model"
                >
                  {availableModels.map((model) => (
                    <option
                      key={model}
                      value={model}
                      className="bg-gray-800 text-white"
                    >
                      {model.split("/").pop()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
              </div>
            )}
            {hasMessages && (
              <button
                onClick={onClearChat}
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
    </div>
  );
}
