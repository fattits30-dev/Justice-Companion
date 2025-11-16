/**
 * DeadlineWidget Component
 *
 * Dashboard widget showing upcoming and overdue deadlines
 */

import React, { useEffect, useState } from "react";
import { Calendar, AlertCircle, ChevronRight, Plus } from "lucide-react";
import { apiClient } from "../../lib/apiClient.ts";
import { DeadlineBadge } from "./DeadlineBadge.tsx";
import type { Deadline, DeadlineWidgetProps } from "./types.ts";

export const DeadlineWidget: React.FC<DeadlineWidgetProps> = ({
  limit = 5,
  onClick,
  onViewAll,
}) => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeadlines = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.deadlines.getUpcoming(7, limit);

        if (response.success) {
          // Cast priority and status to proper enum types to fix type mismatch
          const deadlinesWithProperTypes = response.data.items.map(
            (deadline) => ({
              ...deadline,
              priority: deadline.priority as any, // Backend returns string, component expects DeadlinePriority enum
              status: deadline.status as any, // Backend returns string, component expects DeadlineStatus enum
            }),
          );
          setDeadlines(deadlinesWithProperTypes);
          setOverdueCount(response.data.overdueCount);
        } else {
          setError(response.error.message);
        }
      } catch (err) {
        console.error("Failed to fetch deadlines:", err);
        setError("Failed to load deadlines");
      } finally {
        setLoading(false);
      }
    };

    fetchDeadlines();
  }, [limit]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Upcoming Deadlines
          </h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Upcoming Deadlines
          </h3>
        </div>
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Upcoming Deadlines
          </h3>
          {overdueCount > 0 && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
              title={`${overdueCount} overdue deadline${overdueCount === 1 ? "" : "s"}`}
            >
              {overdueCount} Overdue
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Deadlines List */}
      <div className="p-6">
        {deadlines.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">No upcoming deadlines</p>
            <button
              onClick={() => onClick?.(null as any)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create Deadline</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.map((deadline) => (
              <DeadlineBadge
                key={deadline.id}
                deadline={deadline}
                onClick={() => onClick?.(deadline)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeadlineWidget;
