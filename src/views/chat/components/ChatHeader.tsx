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
    <div className="hidden md:block sticky top-0 z-30 bg-primary-900/80 backdrop-blur-md border-b border-white/10">
      <div className="px-4 py-3 sm:p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold text-white">Legal Assistant</h1>
          <div className="flex items-center gap-2">
            {/* Model Selector */}
            {availableModels.length > 0 && (
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 pr-7 text-xs text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-400/50 cursor-pointer"
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
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" />
              </div>
            )}
            {hasMessages && (
              <button
                onClick={onClearChat}
                className="p-1.5 text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
