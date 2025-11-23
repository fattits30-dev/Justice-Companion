/**
 * Evidence Viewer Component
 *
 * Universal viewer for evidence files:
 * - PDF documents (with page navigation)
 * - Images (with zoom and lightbox)
 * - Videos (HTML5 player)
 * - Audio (HTML5 player)
 * - Text files
 *
 * Features:
 * - Download original file
 * - Print support
 * - Fullscreen mode
 * - Navigation controls
 *
 * @module EvidenceViewer
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize,
  Loader,
} from "lucide-react";
import { evidenceApi } from "../../lib/evidenceApiClient.ts";
import type { Evidence } from "../../domains/evidence/entities/Evidence.ts";
import { Card } from "../ui/Card.tsx";
import { Button } from "../ui/Button.tsx";
import { Badge } from "../ui/Badge.tsx";

interface EvidenceViewerProps {
  evidenceId: number;
  onClose?: () => void;
}

export function EvidenceViewer({ evidenceId, onClose }: EvidenceViewerProps) {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const loadEvidence = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load evidence metadata
      const evidenceData = await evidenceApi.get(evidenceId);
      setEvidence(evidenceData);

      // Load preview
      const preview = await evidenceApi.preview(evidenceId);
      setPreviewUrl(preview.previewUrl);
      setMimeType(preview.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, [evidenceId]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  const handleDownload = async () => {
    if (!evidence) {
      return;
    }

    try {
      await evidenceApi.download(
        evidenceId,
        evidence.filePath?.split(/[\\/]/).pop() || "evidence",
      );
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleFullscreen = () => {
    document.documentElement.requestFullscreen();
  };

  if (loading) {
    return (
      <Card variant="glass" className="p-12 text-center">
        <Loader className="h-12 w-12 mx-auto mb-4 text-cyan-400 animate-spin" />
        <p className="text-white/70">Loading evidence...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="glass" className="p-12 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadEvidence}>Retry</Button>
      </Card>
    );
  }

  if (!evidence) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900/50 border-b border-white/10">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {evidence.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="info" size="sm">
              {evidence.evidenceType}
            </Badge>
            {evidence.filePath && (
              <span className="text-xs text-white/60">
                {evidence.filePath.split(/[\\/]/).pop()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-white/70 min-w-[60px] text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleFullscreen}>
            <Maximize className="h-4 w-4" />
          </Button>
          {onClose && (
            <>
              <div className="w-px h-6 bg-white/10 mx-2" />
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-6xl w-full"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {renderContent(mimeType, previewUrl, evidence)}
        </motion.div>
      </div>
    </div>
  );
}

function renderContent(
  mimeType: string,
  previewUrl: string,
  evidence: Evidence,
) {
  // PDF
  if (mimeType === "application/pdf") {
    return (
      <iframe
        src={previewUrl}
        className="w-full h-[800px] bg-white rounded-lg"
        title={evidence.title}
      />
    );
  }

  // Images
  if (mimeType.startsWith("image/")) {
    return (
      <img
        src={previewUrl}
        alt={evidence.title}
        className="max-w-full h-auto rounded-lg shadow-2xl"
      />
    );
  }

  // Video
  if (mimeType.startsWith("video/")) {
    return (
      <video
        src={previewUrl}
        controls
        className="w-full max-h-[800px] rounded-lg shadow-2xl"
      >
        Your browser does not support video playback.
      </video>
    );
  }

  // Audio
  if (mimeType.startsWith("audio/")) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-gray-900/50 rounded-lg border border-white/10">
        <audio src={previewUrl} controls className="w-full">
          Your browser does not support audio playback.
        </audio>
        <p className="text-center text-white/70 mt-4">{evidence.title}</p>
      </div>
    );
  }

  // Text
  if (mimeType.startsWith("text/")) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-gray-900/50 rounded-lg border border-white/10">
        <pre className="text-sm text-white/90 whitespace-pre-wrap font-mono">
          {evidence.content || "No content available"}
        </pre>
      </div>
    );
  }

  // Unsupported
  return (
    <div className="text-center p-12">
      <p className="text-white/70 mb-4">
        Preview not available for this file type
      </p>
      <Button onClick={() => evidenceApi.download(evidence.id, evidence.title)}>
        <Download className="h-4 w-4 mr-2" />
        Download File
      </Button>
    </div>
  );
}
