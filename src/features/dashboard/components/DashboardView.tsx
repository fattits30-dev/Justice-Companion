import React, { useMemo } from 'react';
import { MessageSquare, Scale, FileText, TrendingUp } from 'lucide-react';
import { useCases } from '@/features/cases';
import { DashboardEmptyState } from '@/components/ui/DashboardEmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

interface DashboardViewProps {
  onViewChange: (view: 'dashboard' | 'chat' | 'cases' | 'documents' | 'settings') => void;
}

export function DashboardView({ onViewChange }: DashboardViewProps): JSX.Element {
  const { cases, loading, error } = useCases();

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
    <div className="flex-1 overflow-y-auto px-12 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-blue-950/50 to-indigo-950/50 border-2 border-blue-800/30 rounded-3xl px-12 py-12 mb-12">
            <div className="flex items-start gap-8 mb-10">
              <div className="p-5 bg-blue-600/20 rounded-2xl">
                <Scale className="w-14 h-14 text-blue-300" />
              </div>
              <div className="flex-1">
                <h1 className="text-5xl font-black text-white mb-4">
                  Welcome to Justice Companion
                </h1>
                <p className="text-2xl text-blue-200 font-semibold">
                  Your personal legal information assistant
                </p>
              </div>
            </div>

            <div className="space-y-6 text-blue-100 text-lg leading-relaxed">
              <p>
                Justice Companion helps you organize legal information, track case details, and
                understand your legal matters better. Use this tool to keep notes, manage documents,
                and stay informed about your situation.
              </p>

              <div className="bg-yellow-900/20 border-2 border-yellow-600/50 rounded-2xl px-8 py-6">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-10 h-10 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                <div className="flex items-start gap-5">
                  <div className="text-green-400 mt-1 text-2xl">✓</div>
                  <div>
                    <h4 className="font-black text-white text-xl mb-2">Track Your Cases</h4>
                    <p className="text-lg text-blue-300">
                      Organize facts, documents, and timelines
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="text-green-400 mt-1 text-2xl">✓</div>
                  <div>
                    <h4 className="font-black text-white text-xl mb-2">Stay Informed</h4>
                    <p className="text-lg text-blue-300">Access legal information resources</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="text-green-400 mt-1 text-2xl">✓</div>
                  <div>
                    <h4 className="font-black text-white text-xl mb-2">Manage Documents</h4>
                    <p className="text-lg text-blue-300">Keep important files organized</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-10 bg-red-900/30 border-2 border-red-700/50 rounded-2xl px-8 py-6 text-red-200 text-xl">
            Failed to load dashboard data: {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
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
              <StatCard
                icon={MessageSquare}
                label="Total Chats"
                value={stats.sessionsCount.toString()}
                trend="+0 this week"
                color="blue"
              />
              <StatCard
                icon={Scale}
                label="Active Cases"
                value={stats.activeCases.toString()}
                trend={`${stats.totalCases} total`}
                color="indigo"
              />
              <StatCard
                icon={FileText}
                label="Documents"
                value={stats.documentsUploaded.toString()}
                trend="+0 uploaded"
                color="purple"
              />
              <StatCard
                icon={TrendingUp}
                label="Sessions"
                value={stats.sessionsCount.toString()}
                trend="+0 this week"
                color="cyan"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-slate-900/50 to-blue-950/50 border-2 border-blue-800/30 rounded-3xl px-10 py-10 mb-12">
          <h2 className="text-3xl font-black text-white mb-8">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickActionButton
              icon={MessageSquare}
              label="Start New Chat"
              description="Get instant legal information"
              onClick={() => onViewChange('chat')}
            />
            <QuickActionButton
              icon={Scale}
              label="Create Case"
              description="Track your legal matter"
              onClick={() => onViewChange('cases')}
            />
            <QuickActionButton
              icon={FileText}
              label="Upload Document"
              description="Analyze legal documents"
              onClick={() => onViewChange('documents')}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-slate-900/50 to-blue-950/50 border-2 border-blue-800/30 rounded-3xl px-10 py-10">
          <h2 className="text-3xl font-black text-white mb-8">Recent Activity</h2>
          <p className="text-blue-300 text-center py-12 text-xl">
            No recent activity yet. Start a chat to get legal information!
          </p>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend: string;
  color: 'blue' | 'indigo' | 'purple' | 'cyan';
}

function StatCard({ icon: Icon, label, value, trend, color }: StatCardProps): JSX.Element {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700',
    indigo: 'from-indigo-600 to-indigo-700',
    purple: 'from-purple-600 to-purple-700',
    cyan: 'from-cyan-600 to-cyan-700',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-3xl px-8 py-8 shadow-lg`}>
      <div className="flex items-center justify-between mb-6">
        <Icon className="w-12 h-12 text-white/80" />
      </div>
      <div className="text-5xl font-black text-white mb-3">{value}</div>
      <div className="text-xl text-white/80 mb-3 font-semibold">{label}</div>
      <div className="text-lg text-white/60">{trend}</div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
}

function QuickActionButton({
  icon: Icon,
  label,
  description,
  onClick,
}: QuickActionButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 p-4 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700/30 rounded-lg transition-all text-left group"
    >
      <div className="p-3 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition-colors">
        <Icon className="w-6 h-6 text-blue-300" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-white mb-1">{label}</h3>
        <p className="text-sm text-blue-300">{description}</p>
      </div>
    </button>
  );
}
