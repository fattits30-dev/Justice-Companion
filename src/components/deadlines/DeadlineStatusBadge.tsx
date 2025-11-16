/**
 * DeadlineStatusBadge Component
 *
 * Displays status indicator with color coding
 */

import React from "react";
import { STATUS_COLORS, type DeadlineStatusBadgeProps } from "./types.ts";

export const DeadlineStatusBadge: React.FC<DeadlineStatusBadgeProps> = ({
  status,
  compact = false,
}) => {
  const colors = STATUS_COLORS[status];
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${colors.bg}`}
        title={statusText}
        aria-label={`Status: ${statusText}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
      aria-label={`Status: ${statusText}`}
    >
      {statusText}
    </span>
  );
};

export default DeadlineStatusBadge;
