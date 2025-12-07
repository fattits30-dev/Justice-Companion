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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="p-6"
    >
      <div className="max-w-3xl mx-auto mt-12 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "backOut" }}
          className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-full mb-6"
        >
          <svg
            className="w-8 h-8 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-2xl font-bold mb-3"
        >
          How can I help you today?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-white/90 mb-4"
        >
          Ask me about UK employment law, case precedents, or help organizing
          your case.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-xs text-white/60 mb-8 max-w-2xl mx-auto"
        >
          ⚠️ **Legal Disclaimer**: I am not a lawyer and this is not legal
          advice. All information is general and you should consult a qualified
          legal professional for advice specific to your situation.
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {prompts.map((item, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-colors text-left"
            >
              <p className="font-medium mb-1">{item.title}</p>
              <p className="text-sm text-white/90">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
