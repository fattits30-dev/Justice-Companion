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

import {
  TrendingUp,
  Briefcase,
  FileText,
  Activity,
  Plus,
  Upload,
  MessageSquare,
  AlertCircle,
  Info,
  Lightbulb,
} from "lucide-react";
import { Card } from "./ui/Card.tsx";
import { Button } from "./ui/Button.tsx";
import { Badge } from "./ui/Badge.tsx";
import { SkeletonCard } from "./ui/Skeleton.tsx";

interface Stats {
  totalCases: number;
  activeCases: number;
  totalEvidence: number;
  recentActivity: number;
}

interface RecentCase {
  id: string;
  title: string;
  status: "active" | "closed" | "pending";
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
  stats = {
    totalCases: 0,
    activeCases: 0,
    totalEvidence: 0,
    recentActivity: 0,
  },
  recentCases = [],
  isLoading = false,
  error,
  onNewCase,
  onUploadEvidence,
  onStartChat,
  onCaseClick,
}: DashboardProps) {
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Status badge variant mapping
  const getStatusVariant = (
    status: string,
  ): "success" | "warning" | "neutral" => {
    switch (status) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "closed":
      default:
        return "neutral";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-primary-900 text-white">
        <div className="flex-shrink-0 p-8 pb-4">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {username}</h1>
          <p className="text-white/90">Loading your dashboard...</p>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={1} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-primary-900 p-8">
        <Card variant="glass" className="max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">
              Error Loading Dashboard
            </h2>
            <p className="text-white">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-primary-900 text-white">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 p-8 pb-0">
        {/* Legal Disclaimer Banner */}
        <Card
          variant="glass"
          className="mb-6 bg-amber-900/30 border-l-4 border-amber-500"
        >
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200 mb-1">
                This app provides information, not legal advice
              </p>
              <p className="text-sm text-amber-100/80">
                Justice Companion helps you organize your case and understand
                legal concepts. It's NOT a replacement for a qualified lawyer. For
                legal advice specific to your situation, please consult a
                solicitor or legal professional.
              </p>
            </div>
          </div>
        </Card>

        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {username}</h1>
          <p className="text-white/90">
            You're building your case. Here's where you stand.
          </p>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">

      {/* Stats Grid - People-friendly language */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Cases */}
        <Card variant="glass" hoverable shine>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Your Cases</p>
              <p className="text-3xl font-bold">{stats.totalCases}</p>
              <p className="text-xs text-white/80 mt-1">
                {stats.totalCases === 0
                  ? "Ready to start"
                  : "Cases you're tracking"}
              </p>
            </div>
            <Briefcase className="w-12 h-12 text-cyan-400" />
          </div>
        </Card>

        {/* Active Cases */}
        <Card variant="glass" hoverable shine>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Currently Active</p>
              <p className="text-3xl font-bold">{stats.activeCases}</p>
              <p className="text-xs text-white/80 mt-1">
                {stats.activeCases === 0 ? "All caught up" : "Ongoing matters"}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-400" />
          </div>
        </Card>

        {/* Total Evidence */}
        <Card variant="glass" hoverable shine>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Evidence Collected</p>
              <p className="text-3xl font-bold">{stats.totalEvidence}</p>
              <p className="text-xs text-white/80 mt-1">
                {stats.totalEvidence === 0
                  ? "Start gathering proof"
                  : "Documents & records"}
              </p>
            </div>
            <FileText className="w-12 h-12 text-pink-400" />
          </div>
        </Card>

        {/* Recent Activity */}
        <Card variant="glass" hoverable shine>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Recent Activity</p>
              <p className="text-3xl font-bold">{stats.recentActivity}</p>
              <p className="text-xs text-white/80 mt-1">
                {stats.recentActivity === 0
                  ? "No recent changes"
                  : "Updates this week"}
              </p>
            </div>
            <Activity className="w-12 h-12 text-yellow-400" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={onNewCase}
            variant="secondary"
            size="lg"
            icon={<Plus />}
            iconPosition="left"
          >
            New Case
          </Button>

          <Button
            onClick={onUploadEvidence}
            variant="secondary"
            size="lg"
            icon={<Upload />}
            iconPosition="left"
          >
            Upload Evidence
          </Button>

          <Button
            onClick={onStartChat}
            variant="secondary"
            size="lg"
            icon={<MessageSquare />}
            iconPosition="left"
            className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500"
          >
            Start Chat
          </Button>
        </div>
      </div>

      {/* Recent Cases */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Recent Cases</h2>

        {recentCases.length === 0 ? (
          <Card variant="glass">
            <div className="text-center">
              <Briefcase className="w-16 h-16 text-white/70 mx-auto mb-4" />
              <p className="text-white/90 text-lg mb-2">
                Ready to start your first case?
              </p>
              <p className="text-white/80 mb-4">
                Click "New Case" above to begin organizing your evidence and
                building your record.
              </p>
              <p className="text-sm text-white/70">
                Remember: Start documenting early. Evidence collected at the
                time is more credible than memories later.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {recentCases.map((case_) => (
              <Card
                key={case_.id}
                variant="glass"
                hoverable
                role="button"
                tabIndex={0}
                onClick={() => onCaseClick && onCaseClick(case_.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (onCaseClick) {
                      onCaseClick(case_.id);
                    }
                  }
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {case_.title}
                    </h3>
                    <p className="text-white/90 text-sm">
                      Last updated: {formatDate(case_.lastUpdated)}
                    </p>
                  </div>
                  <Badge
                    variant={getStatusVariant(case_.status)}
                    size="md"
                    dot
                    pulse
                  >
                    {case_.status.toUpperCase()}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* When to Get a Lawyer - Practical Advice */}
      <Card variant="glass" className="bg-primary-900/20 border-primary-700/50">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-2">
              When You Should Get Professional Legal Advice
            </h3>
            <div className="text-sm text-white/90 space-y-2">
              <p>
                This app helps you organize your case, but some situations need
                a qualified solicitor:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Employment tribunals or court proceedings</li>
                <li>Negotiating settlements or redundancy packages</li>
                <li>Complex discrimination or whistleblowing cases</li>
                <li>If you're facing legal action from your employer</li>
                <li>When you need representation at a hearing</li>
              </ul>
              <p className="mt-3 text-xs text-white/70 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Tip: Many solicitors offer free initial consultations. Some
                  trade unions provide free legal advice to members. Citizens
                  Advice Bureau can also help point you to free or low-cost
                  legal support.
                </span>
              </p>
            </div>
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
}
