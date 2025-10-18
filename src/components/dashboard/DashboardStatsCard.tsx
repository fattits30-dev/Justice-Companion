import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { ReactNode, memo, useMemo } from 'react';

interface DashboardStatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string | ReactNode;
  color?: 'blue' | 'indigo' | 'purple' | 'cyan' | 'green' | 'amber';
  delay?: number;
}

const colorConfig = {
  blue: {
    gradient: 'from-blue-600/90 to-blue-700/90',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-200',
  },
  indigo: {
    gradient: 'from-indigo-600/90 to-indigo-700/90',
    glow: 'shadow-[0_0_30px_rgba(99,102,241,0.3)]',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-200',
  },
  purple: {
    gradient: 'from-purple-600/90 to-purple-700/90',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-200',
  },
  cyan: {
    gradient: 'from-cyan-600/90 to-cyan-700/90',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-200',
  },
  green: {
    gradient: 'from-green-600/90 to-green-700/90',
    glow: 'shadow-[0_0_30px_rgba(34,197,94,0.3)]',
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-200',
  },
  amber: {
    gradient: 'from-amber-600/90 to-amber-700/90',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-200',
  },
};

/**
 * Modern dashboard stats card with glassmorphism and animations
 *
 * @performance Memoized to prevent unnecessary re-renders when props haven't changed
 */
const DashboardStatsCardComponent = ({
  icon: Icon,
  label,
  value,
  trend,
  color = 'blue',
  delay = 0,
}: DashboardStatsCardProps): JSX.Element => {
  const prefersReducedMotion = useReducedMotion();
  const config = colorConfig[color];

  // Memoize animation variants to prevent recreation on every render
  const cardVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.4,
        delay: prefersReducedMotion ? 0 : delay,
        ease: 'easeInOut' as const,
      },
    },
  }), [prefersReducedMotion, delay]);

  const iconVariants = useMemo(() => ({
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        delay: prefersReducedMotion ? 0 : delay + 0.2,
        ease: 'easeOut' as const,
      },
    },
  }), [prefersReducedMotion, delay]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={
        prefersReducedMotion
          ? {}
          : {
            scale: 1.03,
            y: -4,
            transition: { duration: 0.2 },
          }
      }
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${
        config.gradient
      } backdrop-blur-sm ${config.glow} hover:${config.glow.replace(
        '0.3',
        '0.5',
      )} transition-shadow duration-300`}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
      </div>

      <div className="relative px-6 py-6">
        {/* Icon with animation */}
        <div className="flex items-center justify-between mb-4">
          <motion.div
            variants={iconVariants}
            className={`p-3 rounded-xl ${config.iconBg} backdrop-blur-sm`}
          >
            <Icon className={`w-7 h-7 ${config.iconColor}`} aria-hidden="true" />
          </motion.div>
        </div>

        {/* Value */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: prefersReducedMotion ? 0 : delay + 0.3, duration: 0.3 }}
          className="text-4xl font-bold text-white mb-2"
        >
          {value}
        </motion.div>

        {/* Label */}
        <div className="text-base text-white/90 font-medium mb-2">{label}</div>

        {/* Trend indicator */}
        {trend && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : delay + 0.4, duration: 0.3 }}
            className="text-sm text-white/70"
          >
            {trend}
          </motion.div>
        )}
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute -inset-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </motion.div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const DashboardStatsCard = memo(DashboardStatsCardComponent);
