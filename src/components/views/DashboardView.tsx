import { MessageSquare, Scale, FileText, TrendingUp } from 'lucide-react';
import { useCases } from '../../hooks/useCases';
import { useMemo } from 'react';
import { DashboardEmptyState } from '../ui/DashboardEmptyState';

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
      activeCases: cases.filter(c => c.status === 'active').length,
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
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-blue-200">Your legal information companion overview</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-200">
            Failed to load dashboard data: {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={MessageSquare}
            label="Total Chats"
            value={loading ? '...' : stats.sessionsCount.toString()}
            trend="+0 this week"
            color="blue"
          />
          <StatCard
            icon={Scale}
            label="Active Cases"
            value={loading ? '...' : stats.activeCases.toString()}
            trend={`${stats.totalCases} total`}
            color="indigo"
          />
          <StatCard
            icon={FileText}
            label="Documents"
            value={loading ? '...' : stats.documentsUploaded.toString()}
            trend="+0 uploaded"
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="Sessions"
            value={loading ? '...' : stats.sessionsCount.toString()}
            trend="+0 this week"
            color="cyan"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-slate-900/50 to-blue-950/50 border border-blue-800/30 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="bg-gradient-to-br from-slate-900/50 to-blue-950/50 border border-blue-800/30 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          <p className="text-blue-300 text-center py-8">No recent activity yet. Start a chat to get legal information!</p>
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
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-8 h-8 text-white/80" />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-white/80 mb-2">{label}</div>
      <div className="text-xs text-white/60">{trend}</div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
}

function QuickActionButton({ icon: Icon, label, description, onClick }: QuickActionButtonProps): JSX.Element {
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
