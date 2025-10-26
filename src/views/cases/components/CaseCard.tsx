import { useState, memo } from "react";
import type { Case } from "../../../domains/cases/entities/Case.ts";
import { caseTypeMetadata } from "../constants.ts";
import { Card } from "../../../components/ui/Card.tsx";
import { Badge } from "../../../components/ui/Badge.tsx";
import { Trash2, Eye, Edit, Clock, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CaseCardProps {
  caseItem: Case;
  onDelete: (caseId: number) => void;
  onView?: (caseId: number) => void;
  onEdit?: (caseId: number) => void;
}

function CaseCardComponent({
  caseItem,
  onDelete,
  onView,
  onEdit,
}: CaseCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const metadata = caseTypeMetadata[caseItem.caseType];

  // Map status to badge variant
  const statusVariant = {
    active: "success" as const,
    pending: "warning" as const,
    closed: "neutral" as const,
  };

  // Map status to icon indicator
  const statusDot = {
    active: true,
    pending: false,
    closed: false,
  };

  // Map status to pulse animation
  const statusPulse = {
    active: true,
    pending: true,
    closed: false,
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group"
    >
      <Card
        variant="glass"
        gradientBorder={isHovered}
        shine
        hoverable
        className="h-full"
      >
        {/* Header with case type badge and actions */}
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Case Type Badge */}
          <div
            className={`
              flex h-12 w-12 items-center justify-center rounded-xl
              text-xs font-bold tracking-wider
              ${metadata.accent}
              border border-white/10
              shadow-lg
              transition-transform duration-300
              group-hover:scale-110
            `}
          >
            {metadata.shortLabel}
          </div>

          {/* Actions - show on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                {onEdit && (
                  <button
                    onClick={() => onEdit(caseItem.id)}
                    className="
                      p-2 rounded-lg
                      bg-white/5 hover:bg-white/10
                      border border-white/10 hover:border-white/20
                      text-white/90 hover:text-white
                      transition-all duration-200
                    "
                    title="Edit case"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                {onView && (
                  <button
                    onClick={() => onView(caseItem.id)}
                    className="
                      p-2 rounded-lg
                      bg-white/5 hover:bg-white/10
                      border border-white/10 hover:border-white/20
                      text-white/90 hover:text-white
                      transition-all duration-200
                    "
                    title="View case"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(caseItem.id)}
                  className="
                    p-2 rounded-lg
                    bg-danger-500/10 hover:bg-danger-500/20
                    border border-danger-500/20 hover:border-danger-500/40
                    text-danger-400 hover:text-danger-300
                    transition-all duration-200
                  "
                  title="Delete case"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Title and Status */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
              {caseItem.title}
            </h3>
            <Badge
              variant={statusVariant[caseItem.status]}
              dot={statusDot[caseItem.status]}
              pulse={statusPulse[caseItem.status]}
              glow={caseItem.status === "active"}
              className="capitalize"
            >
              {caseItem.status}
            </Badge>
          </div>

          {/* Description */}
          {caseItem.description ? (
            <p className="mb-4 line-clamp-3 text-sm text-white/90 leading-relaxed">
              {caseItem.description}
            </p>
          ) : (
            <p className="mb-4 text-sm text-white/80 italic">
              No description provided.
            </p>
          )}
        </div>

        {/* Footer - Metadata */}
        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Type */}
            <div className="flex items-center gap-2 text-white/90">
              <div className="w-1 h-1 rounded-full bg-gray-500" />
              <span className="font-medium">Type:</span>
              <span className="text-white">{metadata.displayLabel}</span>
            </div>

            {/* Created Date */}
            <div className="flex items-center gap-2 text-white/90">
              <Calendar className="w-3 h-3" />
              <span className="font-medium">Created:</span>
              <span className="text-white">
                {formatDate(caseItem.createdAt)}
              </span>
            </div>

            {/* Updated Date */}
            <div className="flex items-center gap-2 text-white/90 col-span-2">
              <Clock className="w-3 h-3" />
              <span className="font-medium">Updated:</span>
              <span className="text-white">
                {formatDate(caseItem.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Export memoized component to prevent unnecessary re-renders
export const CaseCard = memo(CaseCardComponent);
