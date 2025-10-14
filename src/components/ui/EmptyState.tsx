import { FADE_IN_UP } from '@/lib/animations';
import { motion } from 'framer-motion';
import React from 'react';

type EmptyStateSize = 'sm' | 'md' | 'lg';
type EmptyStateVariant = 'default' | 'info' | 'success' | 'warning' | 'error';

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
  /** Visual variant for different empty state contexts */
  variant?: EmptyStateVariant;
  /** Size of the empty state */
  size?: EmptyStateSize;
  /** Custom className for additional styling */
  className?: string;
}

const variantStyles: Record<
  EmptyStateVariant,
  {
    iconBg: string;
    iconBorder: string;
    iconColor: string;
    textColor: string;
  }
> = {
  default: {
    iconBg: 'from-blue-600/20 to-indigo-600/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-300',
    textColor: 'text-blue-200',
  },
  info: {
    iconBg: 'from-sky-600/20 to-cyan-600/20',
    iconBorder: 'border-sky-500/30',
    iconColor: 'text-sky-300',
    textColor: 'text-sky-200',
  },
  success: {
    iconBg: 'from-green-600/20 to-emerald-600/20',
    iconBorder: 'border-green-500/30',
    iconColor: 'text-green-300',
    textColor: 'text-green-200',
  },
  warning: {
    iconBg: 'from-yellow-600/20 to-orange-600/20',
    iconBorder: 'border-yellow-500/30',
    iconColor: 'text-yellow-300',
    textColor: 'text-yellow-200',
  },
  error: {
    iconBg: 'from-red-600/20 to-rose-600/20',
    iconBorder: 'border-red-500/30',
    iconColor: 'text-red-300',
    textColor: 'text-red-200',
  },
};

const sizeStyles: Record<
  EmptyStateSize,
  {
    iconSize: string;
    iconPadding: string;
    titleSize: string;
    descSize: string;
    maxWidth: string;
  }
> = {
  sm: {
    iconSize: 'w-12 h-12',
    iconPadding: 'p-4',
    titleSize: 'text-xl',
    descSize: 'text-sm',
    maxWidth: 'max-w-sm',
  },
  md: {
    iconSize: 'w-16 h-16',
    iconPadding: 'p-6',
    titleSize: 'text-2xl',
    descSize: 'text-base',
    maxWidth: 'max-w-md',
  },
  lg: {
    iconSize: 'w-20 h-20',
    iconPadding: 'p-8',
    titleSize: 'text-3xl',
    descSize: 'text-lg',
    maxWidth: 'max-w-lg',
  },
};

/**
 * EmptyState Component
 *
 * Displays a centered message when no data is available.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={FolderOpen}
 *   title="No cases found"
 *   description="Get started by creating your first case"
 *   variant="info"
 *   size="md"
 *   action={{
 *     label: "Create Case",
 *     onClick: handleCreate
 *   }}
 * />
 * ```
 *
 * Features:
 * - Multiple visual variants (default, info, success, warning, error)
 * - Size options (sm, md, lg)
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
  variant = 'default',
  size = 'md',
  className = '',
}: EmptyStateProps): JSX.Element {
  const variantClasses = variantStyles[variant];
  const sizeClasses = sizeStyles[size];

  return (
    <motion.div
      {...FADE_IN_UP}
      className={`flex-1 flex items-center justify-center p-8 ${className}`}
    >
      <div className={`${sizeClasses.maxWidth} w-full text-center`}>
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div
            className={`${sizeClasses.iconPadding} bg-gradient-to-br ${variantClasses.iconBg} rounded-full border ${variantClasses.iconBorder} backdrop-blur-sm`}
          >
            <Icon className={`${sizeClasses.iconSize} ${variantClasses.iconColor}`} />
          </div>
        </div>

        {/* Title */}
        <h2 className={`${sizeClasses.titleSize} font-bold text-white mb-3`}>{title}</h2>

        {/* Description */}
        <p className={`${variantClasses.textColor} mb-6 leading-relaxed ${sizeClasses.descSize}`}>
          {description}
        </p>

        {/* Custom Content */}
        {children}

        {/* Actions */}
        {(action ?? secondaryAction) && (
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
