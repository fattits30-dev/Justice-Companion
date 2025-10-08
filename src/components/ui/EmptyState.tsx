import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
}

/**
 * Base EmptyState component
 *
 * Displays a centered message when no data is available.
 * Features:
 * - Icon at the top
 * - Title and description
 * - Optional primary and secondary action buttons
 * - Optional custom content (children)
 * - Fade-in animation via framer-motion
 * - Glassmorphism design matching app theme
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
}: EmptyStateProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex items-center justify-center p-8"
    >
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-6 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-full border border-blue-500/30 backdrop-blur-sm">
            <Icon className="w-16 h-16 text-blue-300" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>

        {/* Description */}
        <p className="text-blue-200 mb-6 leading-relaxed">{description}</p>

        {/* Custom Content */}
        {children}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            {action && (
              <button
                onClick={action.onClick}
                className={`px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95 ${
                  action.variant === 'secondary'
                    ? 'bg-slate-700/50 hover:bg-slate-600/50 text-white border border-slate-600/30'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/30'
                }`}
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg font-medium transition-all border border-slate-600/30 transform hover:scale-105 active:scale-95"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
