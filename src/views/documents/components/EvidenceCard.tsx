import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Eye,
  FileText,
  Image,
  Video,
  File,
  Calendar,
  Clock,
} from "lucide-react";
import type { Evidence } from "../../../models/Evidence.ts";
import { evidenceTypeMetadata } from "../constants.ts";
import { Card } from "../../../components/ui/Card.tsx";
import { Badge } from "../../../components/ui/Badge.tsx";

interface EvidenceCardProps {
  evidence: Evidence;
  onDelete: (id: number) => void;
  onView?: (id: number) => void;
}

export function EvidenceCard({
  evidence,
  onDelete,
  onView,
}: EvidenceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const metadata = evidenceTypeMetadata[evidence.evidenceType];

  // Get file type icon
  const FileIcon = getFileTypeIcon(evidence.evidenceType);

  return (
    <Card
      variant="glass"
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col justify-between h-full">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <motion.div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold ${metadata.accent}`}
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <FileIcon className="h-6 w-6" />
          </motion.div>

          {/* Hover Actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                {onView && (
                  <motion.button
                    onClick={() => onView(evidence.id)}
                    className="p-2 text-white/90 transition-colors hover:text-cyan-400 rounded-lg hover:bg-white/5"
                    title="View evidence"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Eye className="h-4 w-4" />
                  </motion.button>
                )}
                <motion.button
                  onClick={() => onDelete(evidence.id)}
                  className="p-2 text-white/90 transition-colors hover:text-danger-400 rounded-lg hover:bg-white/5"
                  title="Delete evidence"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            {evidence.title}
          </h3>

          <Badge variant="info" size="sm" className="mb-3">
            {metadata.label}
          </Badge>

          {renderEvidenceDetails(evidence)}
        </div>

        {/* Footer Metadata */}
        <dl className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-white/90">
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Obtained</span>
            </dt>
            <dd className="font-medium text-white">
              {formatDate(evidence.obtainedDate)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Uploaded</span>
            </dt>
            <dd className="font-medium text-white">
              {formatDate(evidence.createdAt)}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

function getFileTypeIcon(evidenceType: string) {
  const iconMap: Record<string, typeof FileText> = {
    document: FileText,
    photo: Image,
    video: Video,
    audio: File,
    physical: File,
    digital: FileText,
    witness_statement: FileText,
    expert_report: FileText,
    correspondence: FileText,
  };

  return iconMap[evidenceType] || File;
}

function renderEvidenceDetails(evidence: Evidence) {
  if (evidence.content) {
    return (
      <p className="line-clamp-3 text-sm text-white leading-relaxed">
        {evidence.content}
      </p>
    );
  }

  if (evidence.filePath) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
        <FileText className="h-4 w-4 text-cyan-400 flex-shrink-0" />
        <p className="text-sm text-white font-mono truncate">
          {evidence.filePath.split(/[\\/]/).pop()}
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm text-white/80 italic">
      No additional details provided.
    </p>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }
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
