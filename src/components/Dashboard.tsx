/**
 * Dashboard Component
 *
 * Built with TDD - All tests written FIRST
 *
 * Features:
 * - Welcome message with user greeting
 * - Stats cards (cases, evidence, activity)
 * - Quick action buttons (New Case, Upload Evidence, AI Chat)
 * - Recent cases list with status badges
 * - Loading state
 * - Empty state
 * - Error handling
 * - Accessible headings and landmarks
 */

interface Stats {
  totalCases: number;
  activeCases: number;
  totalEvidence: number;
  recentActivity: number;
}

interface RecentCase {
  id: string;
  title: string;
  status: 'active' | 'closed' | 'pending';
  lastUpdated: string;
}

interface DashboardProps {
  username: string;
  stats?: Stats;
  recentCases?: RecentCase[];
  isLoading?: boolean;
  error?: string;
  onNewCase?: () => void;
  onUploadEvidence?: () => void;
  onStartChat?: () => void;
  onCaseClick?: (caseId: string) => void;
}

export function Dashboard({
  username,
  stats = { totalCases: 0, activeCases: 0, totalEvidence: 0, recentActivity: 0 },
  recentCases = [],
  isLoading = false,
  error,
  onNewCase,
  onUploadEvidence,
  onStartChat,
  onCaseClick
}: DashboardProps) {
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Status badge color mapping
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500 text-white';
      case 'closed':
        return 'bg-gray-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-300 text-lg">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Legal Disclaimer Banner - ALWAYS VISIBLE */}
      <div className="mb-6 bg-amber-900/30 border-l-4 border-amber-500 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-amber-200 mb-1">This app provides information, not legal advice</p>
            <p className="text-sm text-amber-100/80">
              Justice Companion helps you organize your case and understand legal concepts.
              It's NOT a replacement for a qualified lawyer. For legal advice specific to your situation,
              please consult a solicitor or legal professional.
            </p>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {username}</h1>
        <p className="text-gray-400">You're building your case. Here's where you stand.</p>
      </div>

      {/* Stats Grid - People-friendly language */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Cases */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Your Cases</p>
              <p className="text-3xl font-bold">{stats.totalCases}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalCases === 0 ? 'Ready to start' : 'Cases you\'re tracking'}
              </p>
            </div>
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        {/* Active Cases */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Currently Active</p>
              <p className="text-3xl font-bold">{stats.activeCases}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.activeCases === 0 ? 'All caught up' : 'Ongoing matters'}
              </p>
            </div>
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Total Evidence */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Evidence Collected</p>
              <p className="text-3xl font-bold">{stats.totalEvidence}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalEvidence === 0 ? 'Start gathering proof' : 'Documents & records'}
              </p>
            </div>
            <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Recent Activity</p>
              <p className="text-3xl font-bold">{stats.recentActivity}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.recentActivity === 0 ? 'No recent changes' : 'Updates this week'}
              </p>
            </div>
            <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={onNewCase}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Case
          </button>

          <button
            onClick={onUploadEvidence}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Evidence
          </button>

          <button
            onClick={onStartChat}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Start Chat
          </button>
        </div>
      </div>

      {/* Recent Cases */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Recent Cases</h2>

        {recentCases.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 text-lg mb-2">Ready to start your first case?</p>
            <p className="text-gray-500 mb-4">Click "New Case" above to begin organizing your evidence and building your record.</p>
            <p className="text-sm text-gray-600">Remember: Start documenting early. Evidence collected at the time is more credible than memories later.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentCases.map((case_) => (
              <div
                key={case_.id}
                role="button"
                tabIndex={0}
                onClick={() => onCaseClick && onCaseClick(case_.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onCaseClick && onCaseClick(case_.id);
                  }
                }}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{case_.title}</h3>
                    <p className="text-gray-400 text-sm">
                      Last updated: {formatDate(case_.lastUpdated)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(case_.status)}`}>
                    {case_.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* When to Get a Lawyer - Practical Advice */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-300 mb-2">When You Should Get Professional Legal Advice</h3>
            <div className="text-sm text-blue-100/80 space-y-2">
              <p>This app helps you organize your case, but some situations need a qualified solicitor:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Employment tribunals or court proceedings</li>
                <li>Negotiating settlements or redundancy packages</li>
                <li>Complex discrimination or whistleblowing cases</li>
                <li>If you're facing legal action from your employer</li>
                <li>When you need representation at a hearing</li>
              </ul>
              <p className="mt-3 text-xs text-blue-200/60">
                💡 Tip: Many solicitors offer free initial consultations. Some trade unions provide free legal advice to members.
                Citizens Advice Bureau can also help point you to free or low-cost legal support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
