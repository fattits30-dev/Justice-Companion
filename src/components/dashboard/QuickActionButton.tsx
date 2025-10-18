import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { memo, useMemo, useCallback } from 'react';

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
  color?: 'blue' | 'indigo' | 'purple' | 'cyan' | 'green';
  delay?: number;
  shortcut?: string;
}

const colorConfig = {
  blue: {
    bg: 'bg-blue-600/10',
    hoverBg: 'hover:bg-blue-600/20',
    border: 'border-blue-500/30',
    hoverBorder: 'hover:border-blue-400/50',
    iconBg: 'bg-blue-500/20',
    hoverIconBg: 'group-hover:bg-blue-500/30',
    iconColor: 'text-blue-400',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]',
  },
  indigo: {
    bg: 'bg-indigo-600/10',
    hoverBg: 'hover:bg-indigo-600/20',
    border: 'border-indigo-500/30',
    hoverBorder: 'hover:border-indigo-400/50',
    iconBg: 'bg-indigo-500/20',
    hoverIconBg: 'group-hover:bg-indigo-500/30',
    iconColor: 'text-indigo-400',
    glow: 'shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]',
  },
  purple: {
    bg: 'bg-purple-600/10',
    hoverBg: 'hover:bg-purple-600/20',
    border: 'border-purple-500/30',
    hoverBorder: 'hover:border-purple-400/50',
    iconBg: 'bg-purple-500/20',
    hoverIconBg: 'group-hover:bg-purple-500/30',
    iconColor: 'text-purple-400',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]',
  },
  cyan: {
    bg: 'bg-cyan-600/10',
    hoverBg: 'hover:bg-cyan-600/20',
    border: 'border-cyan-500/30',
    hoverBorder: 'hover:border-cyan-400/50',
    iconBg: 'bg-cyan-500/20',
    hoverIconBg: 'group-hover:bg-cyan-500/30',
    iconColor: 'text-cyan-400',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]',
  },
  green: {
    bg: 'bg-green-600/10',
    hoverBg: 'hover:bg-green-600/20',
    border: 'border-green-500/30',
    hoverBorder: 'hover:border-green-400/50',
    iconBg: 'bg-green-500/20',
    hoverIconBg: 'group-hover:bg-green-500/30',
    iconColor: 'text-green-400',
    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]',
  },
};

/**
 * Modern quick action button with glow effects and animations
 *
 * @performance Memoized to prevent unnecessary re-renders when props haven't changed
 */
const QuickActionButtonComponent = ({
  icon: Icon,
  label,
  description,
  onClick,
  color = 'blue',
  delay = 0,
  shortcut,
}: QuickActionButtonProps): JSX.Element => {
  const prefersReducedMotion = useReducedMotion();
  const config = colorConfig[color];

  // Memoize click handler to prevent child re-renders
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  // Memoize animation variants to prevent recreation on every render
  const whileHoverVariant = useMemo(() => (
    prefersReducedMotion
      ? {}
      : {
        scale: 1.02,
        y: -2,
        transition: { duration: 0.2 },
      }
  ), [prefersReducedMotion]);

  const whileTapVariant = useMemo(() => (
    prefersReducedMotion ? {} : { scale: 0.98 }
  ), [prefersReducedMotion]);

  const iconHoverVariant = useMemo(() => (
    prefersReducedMotion ? {} : { rotate: [0, -10, 10, 0] }
  ), [prefersReducedMotion]);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.3,
        delay: prefersReducedMotion ? 0 : delay,
      }}
      whileHover={whileHoverVariant}
      whileTap={whileTapVariant}
      onClick={handleClick}
      className={`
        group relative overflow-hidden
        flex items-start gap-4 p-5
        ${config.bg} ${config.hoverBg}
        border ${config.border} ${config.hoverBorder}
        rounded-xl
        ${config.glow}
        transition-all duration-300
        text-left
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900
      `}
      aria-label={`${label}: ${description}`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
      </div>

      {/* Icon container */}
      <motion.div
        whileHover={iconHoverVariant}
        transition={{ duration: 0.5 }}
        className={`
          relative p-3.5 rounded-xl
          ${config.iconBg} ${config.hoverIconBg}
          backdrop-blur-sm
          transition-colors duration-300
        `}
      >
        <Icon className={`w-6 h-6 ${config.iconColor}`} aria-hidden="true" />
      </motion.div>

      {/* Content */}
      <div className="relative flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-bold text-white text-lg group-hover:text-blue-100 transition-colors">
            {label}
          </h3>
          {shortcut && (
            <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
              {shortcut}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
          {description}
        </p>
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute -inset-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </motion.button>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const QuickActionButton = memo(QuickActionButtonComponent);
