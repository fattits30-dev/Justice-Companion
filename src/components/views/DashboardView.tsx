import { MessageSquare, Scale, FileText, TrendingUp } from 'lucide-react';

export function DashboardView(): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-blue-200">Your legal information companion overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={MessageSquare}
            label="Total Chats"
            value="0"
            trend="+0 this week"
            color="blue"
          />
          <StatCard
            icon={Scale}
            label="Active Cases"
            value="0"
            trend="+0 this month"
            color="indigo"
          />
          <StatCard
            icon={FileText}
            label="Documents"
            value="0"
            trend="+0 uploaded"
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="Sessions"
            value="0"
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
            />
            <QuickActionButton
              icon={Scale}
              label="Create Case"
              description="Track your legal matter"
            />
            <QuickActionButton
              icon={FileText}
              label="Upload Document"
              description="Analyze legal documents"
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
}

function QuickActionButton({ icon: Icon, label, description }: QuickActionButtonProps): JSX.Element {
  return (
    <button className="flex items-start gap-4 p-4 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700/30 rounded-lg transition-all text-left group">
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
