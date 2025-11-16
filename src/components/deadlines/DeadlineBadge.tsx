/**
 * DeadlineBadge Component
 *
 * Displays deadline summary with priority indicator
 */

import React from "react";
import { Calendar, Clock } from "lucide-react";
import { DeadlinePriorityBadge } from "./DeadlinePriorityBadge.tsx";
import {
  formatDeadlineStatus,
  isDeadlineOverdue,
  type DeadlineBadgeProps,
} from "./types.ts";

export const DeadlineBadge: React.FC<DeadlineBadgeProps> = ({
  deadline,
  compact = false,
  onClick,
}) => {
  const isOverdue = isDeadlineOverdue(deadline);
  const statusText = formatDeadlineStatus(deadline);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
          isOverdue
            ? "bg-red-50 hover:bg-red-100 border border-red-200"
            : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
        } ${deadline.status === "completed" ? "opacity-60 line-through" : ""}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClick?.();
          }
        }}
        title={`${deadline.title} - ${statusText}`}
      >
        <DeadlinePriorityBadge priority={deadline.priority} compact />
        <span
          className={`truncate max-w-32 ${isOverdue ? "text-red-700 font-medium" : "text-gray-700"}`}
        >
          {deadline.title}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors cursor-pointer ${
        isOverdue
          ? "bg-red-50 hover:bg-red-100 border-red-300"
          : "bg-white hover:bg-gray-50 border-gray-200"
      } ${deadline.status === "completed" ? "opacity-60" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4
          className={`text-sm font-medium ${
            deadline.status === "completed"
              ? "line-through text-gray-500"
              : isOverdue
                ? "text-red-900"
                : "text-gray-900"
          }`}
        >
          {deadline.title}
        </h4>
        <DeadlinePriorityBadge priority={deadline.priority} />
      </div>

      {deadline.description && (
        <p className="text-xs text-gray-600 line-clamp-2">
          {deadline.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{new Date(deadline.deadlineDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            {statusText}
          </span>
        </div>
      </div>

      {deadline.caseTitle && (
        <div className="text-xs text-gray-500 italic">
          Case: {deadline.caseTitle}
        </div>
      )}
    </div>
  );
};

export default DeadlineBadge;
