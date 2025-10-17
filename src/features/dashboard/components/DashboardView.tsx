import { DashboardStatsCard } from '@/components/dashboard/DashboardStatsCard';
import { QuickActionButton } from '@/components/dashboard/QuickActionButton';
import { ViewContainer } from '@/components/layouts/ViewContainer';
import { DashboardEmptyState } from '@/components/ui/DashboardEmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCases } from '@/features/cases';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  MessageSquare,
  Minus,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface DashboardViewProps {
  onViewChange: (view: 'dashboard' | 'chat' | 'cases' | 'documents' | 'settings') => void;
}

interface CollapsibleDisclaimerProps {
  prefersReducedMotion: boolean;
}

interface TrendIndicatorProps {
  type: 'positive' | 'negative' | 'neutral';
  text: string;
}

function TrendIndicator({ type, text }: TrendIndicatorProps): JSX.Element {
  const icons = {
    positive: <TrendingUp className="w-3 h-3 text-green-400" />,
    negative: <TrendingDown className="w-3 h-3 text-red-400" />,
    neutral: <Minus className="w-3 h-3 text-gray-400" />,
  };

  const colors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-gray-400',
  };

  return (
    <div className="flex items-center gap-1">
      {icons[type]}
      <span className={colors[type]}>{text}</span>
    </div>
  );
}

function CollapsibleDisclaimer({ prefersReducedMotion }: CollapsibleDisclaimerProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className="glass-effect rounded-lg px-3 py-2 border border-yellow-500/30 bg-yellow-900/10 backdrop-blur-md"
      whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <h3 className="font-bold text-yellow-200 text-sm">Important Legal Disclaimer</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 pl-6"
        >
          <p className="text-xs text-yellow-100/90 leading-relaxed">
            <strong>This app provides information only, not legal advice.</strong> Justice Companion
            is designed to help you organize and understand legal information, but it cannot replace
            professional legal counsel. For legal advice tailored to your specific situation, please
            consult a qualified attorney. Nothing in this application creates an attorney-client
            relationship.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

export function DashboardView({ onViewChange }: DashboardViewProps): JSX.Element {
  const { cases, loading, error } = useCases();
  const prefersReducedMotion = useReducedMotion();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Ctrl+N: New Chat
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        onViewChange('chat');
      } else if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        // Ctrl+Shift+C: Create Case
        event.preventDefault();
        onViewChange('cases');
      } else if (event.ctrlKey && event.key === 'u') {
        // Ctrl+U: Upload Document
        event.preventDefault();
        onViewChange('documents');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onViewChange]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        ease: 'easeInOut' as const,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { ease: 'easeOut' as const, duration: 0.5 },
    },
  };

  const stats = useMemo(() => {
    if (!cases || cases.length === 0) {
      return {
        totalCases: 0,
        activeCases: 0,
        documentsUploaded: 0,
        recentActivity: 0,
        casesTrend: { type: 'neutral' as const, text: 'No data' },
        documentsTrend: { type: 'neutral' as const, text: 'No uploads' },
        activityTrend: { type: 'neutral' as const, text: 'No activity' },
      };
    }

    // Calculate trends (placeholder logic - would be replaced with real data)
    const activeCases = cases.filter((c) => c.status === 'active').length;
    const casesTrend =
      activeCases > 0
        ? { type: 'positive' as const, text: `${cases.length} total` }
        : { type: 'neutral' as const, text: 'No cases yet' };

    return {
      totalCases: cases.length,
      activeCases,
      documentsUploaded: 0,
      recentActivity: 0,
      casesTrend,
      documentsTrend: { type: 'neutral' as const, text: 'No uploads' },
      activityTrend: { type: 'neutral' as const, text: 'No recent actions' },
    };
  }, [cases]);

  // Show empty state when no cases exist (and not loading)
  if (!loading && cases && cases.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <DashboardEmptyState
          onCreateCase={() => onViewChange('cases')}
          onStartChat={() => onViewChange('chat')}
          onUploadDocument={() => onViewChange('documents')}
        />
      </div>
    );
  }

  return (
    <ViewContainer>
      {/* Welcome Section */}
      <motion.div
        className="mb-6"
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          className="glass-effect rounded-xl px-6 py-8 mb-4 border border-slate-700/50 shadow-2xl bg-gradient-to-r from-slate-900/60 to-blue-900/40"
          variants={itemVariants}
        >
          {/* Centered Legal Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-2xl" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border-2 border-blue-500/40 flex items-center justify-center shadow-2xl backdrop-blur-sm">
                <Scale className="w-12 h-12 text-blue-300" />
              </div>
            </div>
          </div>

          {/* Enhanced Welcome Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent mb-2">
                Welcome back
              </h1>
              <p className="text-base text-blue-200/90">Your legal information assistant</p>
            </div>
          </div>

          {/* Collapsible Legal Disclaimer */}
          <CollapsibleDisclaimer prefersReducedMotion={prefersReducedMotion} />
        </motion.div>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          className="mb-6 bg-gradient-to-r from-red-900/40 to-red-800/30 border-2 border-red-600/60 rounded-xl px-6 py-4 text-red-200 shadow-lg"
          initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="font-semibold mb-1">Failed to load dashboard data</p>
              <p className="text-sm text-red-300/80">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions - Enhanced with better styling */}
      <div className="glass-effect rounded-xl px-6 py-6 mb-6 border border-slate-700/50 shadow-xl bg-gradient-to-br from-slate-900/50 to-blue-950/30">
        <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-5">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <QuickActionButton
            icon={MessageSquare}
            label="Start New Chat"
            description="Get instant legal information"
            onClick={() => onViewChange('chat')}
            color="blue"
            delay={0}
            shortcut="Ctrl+N"
          />
          <QuickActionButton
            icon={Scale}
            label="Create Case"
            description="Track your legal matter"
            onClick={() => onViewChange('cases')}
            color="indigo"
            delay={0.1}
            shortcut="Ctrl+Shift+C"
          />
          <QuickActionButton
            icon={FileText}
            label="Upload Document"
            description="Analyze legal documents"
            onClick={() => onViewChange('documents')}
            color="purple"
            delay={0.2}
            shortcut="Ctrl+U"
          />
        </div>
      </div>

      {/* Stats Grid - Enhanced */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-5">
          Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-slate-900/50 to-blue-950/50 rounded-xl p-6 shadow-lg"
                  role="status"
                  aria-label="Loading statistics"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onViewChange('cases')}
                className="hover:scale-105 transition-transform cursor-pointer"
                aria-label="View active cases"
              >
                <DashboardStatsCard
                  icon={Scale}
                  label="Active Cases"
                  value={stats.activeCases.toString()}
                  trend={
                    <div className="flex items-center gap-1">
                      <TrendIndicator type={stats.casesTrend.type} text={stats.casesTrend.text} />
                    </div>
                  }
                  color="indigo"
                  delay={0}
                />
              </button>
              <button
                type="button"
                onClick={() => onViewChange('documents')}
                className="hover:scale-105 transition-transform cursor-pointer"
                aria-label="View documents"
              >
                <DashboardStatsCard
                  icon={FileText}
                  label="Documents"
                  value={stats.documentsUploaded.toString()}
                  trend={
                    <div className="flex items-center gap-1">
                      <TrendIndicator
                        type={stats.documentsTrend.type}
                        text={stats.documentsTrend.text}
                      />
                    </div>
                  }
                  color="purple"
                  delay={0.1}
                />
              </button>
              <div className="cursor-default">
                <DashboardStatsCard
                  icon={TrendingUp}
                  label="Recent Activity"
                  value={stats.recentActivity.toString()}
                  trend={
                    <div className="flex items-center gap-1">
                      <TrendIndicator
                        type={stats.activityTrend.type}
                        text={stats.activityTrend.text}
                      />
                    </div>
                  }
                  color="cyan"
                  delay={0.2}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <motion.div
        className="glass-effect rounded-xl px-6 py-6 border border-slate-700/50 shadow-2xl bg-gradient-to-br from-slate-900/50 to-blue-950/30"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' as const }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            Recent Activity
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 glass-effect rounded-lg border border-blue-500/30">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm text-blue-300 font-medium">Live Updates</span>
          </div>
        </div>

        {/* Empty State - Enhanced */}
        <motion.div
          className="text-center py-12"
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border-2 border-blue-500/40 mb-4 shadow-lg">
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-slate-300 text-base font-medium mb-2">No recent activity</p>
          <p className="text-slate-500 text-sm">Your recent actions will appear here</p>
        </motion.div>
      </motion.div>
    </ViewContainer>
  );
}
