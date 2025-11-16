import type { Evidence } from "../../../domains/evidence/entities/Evidence.ts";
import { Card } from "../../../components/ui/Card.tsx";
import { FileText, Image, Video, File } from "lucide-react";
import { useMemo } from "react";

interface EvidenceSummaryCardsProps {
  evidence: Evidence[];
}

export function EvidenceSummaryCards({ evidence }: EvidenceSummaryCardsProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const total = evidence.length;
    const documents = evidence.filter(
      (e) => e.evidenceType === "document",
    ).length;
    const photos = evidence.filter((e) => e.evidenceType === "photo").length;
    const recordings = evidence.filter((e) => e.evidenceType === "recording").length;
    const other = total - documents - photos - recordings;

    return {
      total,
      documents,
      photos,
      recordings,
      other,
    };
  }, [evidence]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Evidence */}
      <Card variant="glass" hoverable shine>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm mb-1">Total Evidence</p>
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-white/80 mt-1">
              {stats.total === 0
                ? "Ready to upload"
                : stats.total === 1
                  ? "Item collected"
                  : "Items collected"}
            </p>
          </div>
          <FileText className="w-12 h-12 text-cyan-400" />
        </div>
      </Card>

      {/* Documents */}
      <Card variant="glass" hoverable shine>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm mb-1">Documents</p>
            <p className="text-3xl font-bold text-blue-400">
              {stats.documents}
            </p>
            <p className="text-xs text-white/80 mt-1">
              {stats.documents === 0
                ? "No documents"
                : stats.documents === 1
                  ? "PDF, Word, etc."
                  : "PDF, Word, etc."}
            </p>
          </div>
          <File className="w-12 h-12 text-blue-400" />
        </div>
      </Card>

      {/* Photos */}
      <Card variant="glass" hoverable shine>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm mb-1">Photos</p>
            <p className="text-3xl font-bold text-pink-400">{stats.photos}</p>
            <p className="text-xs text-white/80 mt-1">
              {stats.photos === 0
                ? "No photos"
                : stats.photos === 1
                  ? "Photo evidence"
                  : "Photo evidence"}
            </p>
          </div>
          <Image className="w-12 h-12 text-pink-400" />
        </div>
      </Card>

      {/* Recordings */}
      <Card variant="glass" hoverable shine>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm mb-1">Recordings</p>
            <p className="text-3xl font-bold text-purple-400">{stats.recordings}</p>
            <p className="text-xs text-white/80 mt-1">
              {stats.recordings === 0
                ? "No recordings"
                : stats.recordings === 1
                  ? "Audio/Video"
                  : "Audio/Video"}
            </p>
          </div>
          <Video className="w-12 h-12 text-purple-400" />
        </div>
      </Card>
    </div>
  );
}
