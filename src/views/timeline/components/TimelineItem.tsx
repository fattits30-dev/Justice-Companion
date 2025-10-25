import { Edit2, Trash2, CheckCircle, Circle, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { DeadlineWithCase } from '../../../models/Deadline';
import {
  formatDeadlineStatus,
  isDeadlineUrgent,
} from '../../../models/Deadline';

interface TimelineItemProps {
  deadline: DeadlineWithCase;
  onEdit: (deadline: DeadlineWithCase) => void;
  onComplete: (deadline: DeadlineWithCase) => void;
  onDelete: (deadline: DeadlineWithCase) => void;
  onCaseClick: (caseId: number) => void;
}

export function TimelineItem({
  deadline,
  onEdit,
  onComplete,
  onDelete,
  onCaseClick,
}: TimelineItemProps) {
  // Determine urgency level
  const getUrgency = (): 'overdue' | 'urgent' | 'future' | 'completed' => {
    if (deadline.status === 'completed') return 'completed';
    if (deadline.status === 'overdue') return 'overdue';

    if (isDeadlineUrgent(deadline.deadlineDate)) return 'urgent';
    return 'future';
  };

  const urgency = getUrgency();

  // Color mapping for urgency
  const urgencyColors = {
    overdue: {
      dot: 'bg-danger-500',
      line: 'bg-danger-500/30',
      glow: 'shadow-danger',
    },
    urgent: {
      dot: 'bg-warning-500',
      line: 'bg-warning-500/30',
      glow: 'shadow-warning',
    },
    future: {
      dot: 'bg-success-500',
      line: 'bg-success-500/30',
      glow: 'shadow-success',
    },
    completed: {
      dot: 'bg-gray-500',
      line: 'bg-gray-500/30',
      glow: '',
    },
  };

  // Priority badge variant
  const priorityVariant = {
    high: 'danger' as const,
    medium: 'warning' as const,
    low: 'neutral' as const,
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusText = formatDeadlineStatus(deadline);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="relative flex gap-4"
      data-testid={`timeline-item-${deadline.id}`}
      data-urgency={urgency}
    >
      {/* Timeline Connector */}
      <div className="flex flex-col items-center">
        {/* Dot */}
        <motion.div
          whileHover={{ scale: 1.2 }}
          className={`
            w-4 h-4 rounded-full border-2 border-gray-900 z-10
            ${urgencyColors[urgency].dot}
            ${urgencyColors[urgency].glow}
          `}
          data-timeline="dot"
        />

        {/* Vertical Line */}
        <div
          className={`w-0.5 flex-1 mt-2 ${urgencyColors[urgency].line}`}
          data-timeline="connector"
        />
      </div>

      {/* Content Card */}
      <div className="flex-1 pb-8">
        <Card
          variant="glass"
          className="relative overflow-visible"
          data-variant="glass"
        >
          {/* Date Badge (positioned above card) */}
          <div className="absolute -top-3 left-4">
            <Badge variant="info" glow>
              {formatDate(deadline.deadlineDate)}
            </Badge>
          </div>

          {/* Card Content */}
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pt-2">
              <div className="flex-1 space-y-2">
                {/* Title */}
                <h3 className="text-lg font-semibold text-white">
                  {deadline.title}
                </h3>

                {/* Case Link */}
                <button
                  onClick={() => onCaseClick(deadline.caseId)}
                  className="
                    inline-flex items-center gap-2 text-sm text-primary-400
                    hover:text-primary-300 transition-colors
                  "
                  type="button"
                >
                  <FolderOpen className="w-4 h-4" />
                  {deadline.caseTitle}
                </button>
              </div>

              {/* Priority Badge */}
              <Badge
                variant={priorityVariant[deadline.priority]}
                data-variant={priorityVariant[deadline.priority]}
              >
                {deadline.priority.charAt(0).toUpperCase() + deadline.priority.slice(1)}
              </Badge>
            </div>

            {/* Description */}
            {deadline.description && (
              <p className="text-sm text-white/70 description">
                {deadline.description}
              </p>
            )}

            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  urgency === 'overdue'
                    ? 'danger'
                    : urgency === 'urgent'
                      ? 'warning'
                      : urgency === 'completed'
                        ? 'neutral'
                        : 'success'
                }
                dot
                pulse={urgency === 'overdue'}
              >
                {statusText}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                icon={<Edit2 />}
                onClick={() => onEdit(deadline)}
              >
                Edit
              </Button>

              <Button
                variant="ghost"
                size="sm"
                icon={deadline.status === 'completed' ? <Circle /> : <CheckCircle />}
                onClick={() => onComplete(deadline)}
              >
                {deadline.status === 'completed' ? 'Mark Incomplete' : 'Complete'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 />}
                onClick={() => onDelete(deadline)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
