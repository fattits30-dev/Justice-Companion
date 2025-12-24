/**
 * ChatEmptyState - Welcome screen with example prompts
 */

import { motion } from "framer-motion";

interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const prompts = [
    {
      title: "Workplace Rights",
      description: "Understand your protections against bullying",
      prompt: "What are my rights if I'm being bullied at work?",
    },
    {
      title: "Building Your Case",
      description: "Learn what evidence you need",
      prompt: "How do I gather evidence for an unfair dismissal claim?",
    },
    {
      title: "Legal Concepts",
      description: "Get clear explanations of legal terms",
      prompt: "What is constructive dismissal?",
    },
    {
      title: "Discrimination",
      description: "Know your rights and next steps",
      prompt: "What should I do if I'm being discriminated against?",
    },
  ];

  return (
    <motion.div
      key="empty-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 py-6 sm:p-6 h-full flex flex-col justify-center"
    >
      <div className="max-w-2xl mx-auto text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gold-400/10 rounded-full mb-4">
          <svg
            className="w-6 h-6 sm:w-7 sm:h-7 text-gold-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
        </div>

        <h2 className="text-lg sm:text-xl font-semibold mb-2 text-white">
          How can I help?
        </h2>
        <p className="text-sm text-white/60 mb-6">
          Ask about UK employment law or help with your case
        </p>

        {/* Prompt suggestions - compact on mobile */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-left">
          {prompts.map((item, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-3 sm:p-4 bg-primary-800/50 hover:bg-primary-800 border border-white/5 hover:border-gold-400/30 rounded-xl transition-all text-left"
            >
              <p className="font-medium text-sm text-white mb-0.5">{item.title}</p>
              <p className="text-xs text-white/50 line-clamp-2">{item.description}</p>
            </button>
          ))}
        </div>

        {/* Disclaimer - compact */}
        <p className="mt-6 text-xs text-white/40 px-4">
          Not legal advice. Consult a solicitor for your situation.
        </p>
      </div>
    </motion.div>
  );
}
