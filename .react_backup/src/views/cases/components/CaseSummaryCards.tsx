import type { Case } from "../../../domains/cases/entities/Case.ts";
import { Card } from "../../../components/ui/Card.tsx";
import { Briefcase, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useMemo } from "react";

interface CaseSummaryCardsProps {
  cases: Case[];
}

export function CaseSummaryCards({ cases }: CaseSummaryCardsProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const total = cases.length;
    const active = cases.filter((c) => c.status === "active").length;
    const pending = cases.filter((c) => c.status === "pending").length;
    const closed = cases.filter((c) => c.status === "closed").length;

    // Calculate case type breakdown
    const byType = cases.reduce(
      (acc, c) => {
        acc[c.caseType] = (acc[c.caseType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Find most common case type
    const mostCommonType = Object.entries(byType).sort(
      (a, b) => b[1] - a[1],
    )[0];

    return {
      total,
      active,
      pending,
      closed,
      mostCommonType: mostCommonType?.[0] || "none",
      mostCommonCount: mostCommonType?.[1] || 0,
    };
  }, [cases]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Cases */}
      <Card variant="glass" hoverable shine>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm mb-1">Total Cases</p>
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-white/80 mt-1">
              {stats.total === 0
                ? "Ready to start"
                : stats.total === 1
                  ? "Case you're tracking"
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
            <p className="text-white/90 text-sm mb-1">Active Cases</p>
            <p className="text-3xl font-bold text-green-400">{stats.active}</p>
            <p className="text-xs text-white/80 mt-1">
              {stats.active === 0
                ? "All caught up"
                : stats.active === 1
                  ? "Ongoing matter"
                  : "Ongoing matters"}
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-green-400" />
        </div>
      </Card>

      {/* Pending Cases */}
      <Card variant="glass" hoverable shine>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm mb-1">Pending Cases</p>
            <p className="text-3xl font-bold text-yellow-400">
              {stats.pending}
            </p>
            <p className="text-xs text-white/80 mt-1">
              {stats.pending === 0
                ? "None pending"
                : stats.pending === 1
                  ? "Awaiting action"
                  : "Awaiting action"}
            </p>
          </div>
          <Clock className="w-12 h-12 text-yellow-400" />
        </div>
      </Card>

      {/* Closed Cases */}
      <Card variant="glass" hoverable shine>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm mb-1">Closed Cases</p>
            <p className="text-3xl font-bold text-gray-400">{stats.closed}</p>
            <p className="text-xs text-white/80 mt-1">
              {stats.closed === 0
                ? "None completed"
                : stats.closed === 1
                  ? "Resolved matter"
                  : "Resolved matters"}
            </p>
          </div>
          <CheckCircle className="w-12 h-12 text-gray-400" />
        </div>
      </Card>
    </div>
  );
}
