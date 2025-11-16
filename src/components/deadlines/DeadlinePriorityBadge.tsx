/**
 * DeadlinePriorityBadge Component
 *
 * Displays priority indicator with color coding
 */

import React from "react";
import {
  PRIORITY_COLORS,
  formatPriority,
  type DeadlinePriorityBadgeProps,
} from "./types.ts";

export const DeadlinePriorityBadge: React.FC<DeadlinePriorityBadgeProps> = ({
  priority,
  compact = false,
}) => {
  const colors = PRIORITY_COLORS[priority];

  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${colors.bg}`}
        title={formatPriority(priority)}
        aria-label={`Priority: ${formatPriority(priority)}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} text-white`}
      aria-label={`Priority: ${formatPriority(priority)}`}
    >
      {formatPriority(priority)}
    </span>
  );
};

export default DeadlinePriorityBadge;
