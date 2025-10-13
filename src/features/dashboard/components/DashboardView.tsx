import { DashboardStatsCard } from '@/components/dashboard/DashboardStatsCard';
import { QuickActionButton } from '@/components/dashboard/QuickActionButton';
import { DashboardEmptyState } from '@/components/ui/DashboardEmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCases } from '@/features/cases';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import { AlertTriangle, FileText, MessageSquare, Scale, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface DashboardViewProps {
  onViewChange: (view: 'dashboard' | 'chat' | 'cases' | 'documents' | 'settings') => void;
}

export function DashboardView({ onViewChange }: DashboardViewProps): JSX.Element {
  const { cases, loading, error } = useCases();
  const prefersReducedMotion = useReducedMotion();

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
        sessionsCount: 0,
      };
    }

    return {
      totalCases: cases.length,
      activeCases: cases.filter((c) => c.status === 'active').length,
      documentsUploaded: 0,
      sessionsCount: 0,
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
    <div className="h-full w-full overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-12 lg:py-12 xl:px-16 xl:py-14 2xl:px-20 2xl:py-16 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <div className="max-w-[1600px] mx-auto">
        {/* Welcome Section */}
        <motion.div
          className="mb-8 sm:mb-10 md:mb-12 lg:mb-14 xl:mb-16 2xl:mb-20"
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
          variants={containerVariants}
        >
          <motion.div
            className="glass-effect rounded-xl sm:rounded-2xl px-6 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-12 2xl:px-16 2xl:py-16 mb-8 sm:mb-10 md:mb-12 2xl:mb-16 border border-slate-700/50 shadow-2xl"
            variants={itemVariants}
          >
            <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-7 md:gap-8 lg:gap-10 2xl:gap-12 mb-6 sm:mb-8 md:mb-10 2xl:mb-12">
              <motion.div
                className="p-4 sm:p-5 2xl:p-6 bg-gradient-to-br from-blue-600/30 to-indigo-600/30 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-blue-500/20"
                whileHover={prefersReducedMotion ? {} : { scale: 1.05, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <Scale className="w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20 text-blue-300" />
              </motion.div>
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl 2xl:text-7xl font-black mb-3 sm:mb-4 2xl:mb-5 bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text text-transparent">
                  Welcome to Justice Companion
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl 2xl:text-4xl text-blue-200/90 font-semibold">
                  Your personal legal information assistant
                </p>
              </div>
            </div>

            <div className="space-y-6 text-blue-100 text-lg leading-relaxed">
              <p className="text-slate-300">
                Justice Companion helps you organize legal information, track case details, and
                understand your legal matters better. Use this tool to keep notes, manage documents,
                and stay informed about your situation.
              </p>

              {/* Legal Disclaimer - Enhanced with Glassmorphism */}
              <motion.div
                className="glass-effect rounded-2xl px-8 py-6 border border-yellow-500/30 bg-yellow-900/10 backdrop-blur-md"
                variants={itemVariants}
                whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="w-10 h-10 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-yellow-200 mb-4 text-2xl">
                      Important Legal Disclaimer
                    </h3>
                    <p className="text-lg text-yellow-100/90 leading-relaxed">
                      <strong>This app provides information only, not legal advice.</strong> Justice
                      Companion is designed to help you organize and understand legal information,
                      but it cannot replace professional legal counsel. For legal advice tailored to
                      your specific situation, please consult a qualified attorney. Nothing in this
                      application creates an attorney-client relationship.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Feature Cards - Enhanced with Glassmorphism */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4"
                variants={containerVariants}
              >
                <motion.div
                  className="glass-effect rounded-xl px-6 py-6 border border-green-500/20 hover:border-green-500/40 transition-all duration-300"
                  variants={itemVariants}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -4 }}
                >
                  <div className="flex items-start gap-5">
                    <div className="text-green-400 mt-1 text-3xl">✓</div>
                    <div>
                      <h4 className="font-black text-white text-xl mb-2">Track Your Cases</h4>
                      <p className="text-lg text-slate-300">
                        Organize facts, documents, and timelines
                      </p>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  className="glass-effect rounded-xl px-6 py-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300"
                  variants={itemVariants}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -4 }}
                >
                  <div className="flex items-start gap-5">
                    <div className="text-blue-400 mt-1 text-3xl">✓</div>
                    <div>
                      <h4 className="font-black text-white text-xl mb-2">Stay Informed</h4>
                      <p className="text-lg text-slate-300">Access legal information resources</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  className="glass-effect rounded-xl px-6 py-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
                  variants={itemVariants}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -4 }}
                >
                  <div className="flex items-start gap-5">
                    <div className="text-purple-400 mt-1 text-3xl">✓</div>
                    <div>
                      <h4 className="font-black text-white text-xl mb-2">Manage Documents</h4>
                      <p className="text-lg text-slate-300">Keep important files organized</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Error State */}
        {error && (
          <div className="mb-10 bg-red-900/30 border-2 border-red-700/50 rounded-2xl px-8 py-6 text-red-200 text-xl">
            Failed to load dashboard data: {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {loading ? (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
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
              <DashboardStatsCard
                icon={MessageSquare}
                label="Total Chats"
                value={stats.sessionsCount.toString()}
                trend="+0 this week"
                color="blue"
                delay={0}
              />
              <DashboardStatsCard
                icon={Scale}
                label="Active Cases"
                value={stats.activeCases.toString()}
                trend={`${stats.totalCases} total`}
                color="indigo"
                delay={0.1}
              />
              <DashboardStatsCard
                icon={FileText}
                label="Documents"
                value={stats.documentsUploaded.toString()}
                trend="+0 uploaded"
                color="purple"
                delay={0.2}
              />
              <DashboardStatsCard
                icon={TrendingUp}
                label="Sessions"
                value={stats.sessionsCount.toString()}
                trend="+0 this week"
                color="cyan"
                delay={0.3}
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass-effect rounded-2xl px-8 py-8 mb-12 border border-slate-700/50">
          <h2 className="text-3xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <QuickActionButton
              icon={MessageSquare}
              label="Start New Chat"
              description="Get instant legal information"
              onClick={() => onViewChange('chat')}
              color="blue"
              delay={0}
            />
            <QuickActionButton
              icon={Scale}
              label="Create Case"
              description="Track your legal matter"
              onClick={() => onViewChange('cases')}
              color="indigo"
              delay={0.1}
            />
            <QuickActionButton
              icon={FileText}
              label="Upload Document"
              description="Analyze legal documents"
              onClick={() => onViewChange('documents')}
              color="purple"
              delay={0.2}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <motion.div
          className="glass-effect rounded-2xl px-10 py-10 border border-slate-700/50 shadow-2xl"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' as const }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-white">Recent Activity</h2>
            <div className="flex items-center gap-2 px-4 py-2 glass-effect rounded-lg border border-blue-500/30">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm text-blue-300 font-medium">Live Updates</span>
            </div>
          </div>

          {/* Empty State - Enhanced */}
          <motion.div
            className="text-center py-16"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 mb-6">
              <TrendingUp className="w-12 h-12 text-blue-400/60" />
            </div>
            <p className="text-slate-400 text-xl mb-4">No recent activity yet</p>
            <p className="text-slate-500 text-base max-w-md mx-auto mb-8">
              Start a chat, create a case, or upload a document to see your activity here
            </p>
            <div className="flex items-center justify-center gap-4">
              <motion.button
                onClick={() => onViewChange('chat')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300"
                whileHover={prefersReducedMotion ? {} : { scale: 1.05, y: -2 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                Start Your First Chat
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
