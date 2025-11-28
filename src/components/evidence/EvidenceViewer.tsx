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
 * - AI Document Analysis with NAME DETECTION
 *
 * @module EvidenceViewer
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Brain,
  Download,
  Loader,
  Maximize,
  Printer,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Evidence } from "../../domains/evidence/entities/Evidence.ts";
import { aiApi } from "../../lib/aiApiClient.ts";
import { evidenceApi } from "../../lib/evidenceApiClient.ts";
import type { AIDocumentAnalysis } from "../../types/ai.ts";
import { Badge } from "../ui/Badge.tsx";
import { Button } from "../ui/Button.tsx";
import { Card } from "../ui/Card.tsx";
import { DocumentAnalysisResults } from "./DocumentAnalysisResults.tsx";

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

  // AI Analysis state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<AIDocumentAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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
        evidence.filePath?.split(/[\\/]/).pop() || "evidence"
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

  /**
   * Run AI document analysis
   */
  const handleAnalyze = async () => {
    if (!evidence) {
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      // Fetch the file blob for AI analysis
      const blob = await evidenceApi.getFileBlob(evidenceId);

      // Convert blob to File
      const fileName =
        evidence.filePath?.split(/[\\/]/).pop() || evidence.title || "document";
      const file = new File([blob], fileName, {
        type: mimeType || "application/octet-stream",
      });

      // Send to AI service for analysis
      const result = await aiApi.analyzeDocument(
        file,
        `Case evidence: ${evidence.title}`
      );

      setAnalysisResult(result);
      setShowAnalysis(true);
    } catch (err) {
      console.error("Analysis failed:", err);
      setAnalysisError(
        err instanceof Error ? err.message : "AI analysis failed"
      );
    } finally {
      setAnalyzing(false);
    }
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
          {/* AI Analyze Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="bg-purple-600 hover:bg-purple-500"
          >
            {analyzing ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                AI Analyze
              </>
            )}
          </Button>

          <div className="w-px h-6 bg-white/10 mx-2" />

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

      {/* Analysis Error */}
      <AnimatePresence>
        {analysisError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 bg-red-500/10 border-b border-red-500/30"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{analysisError}</span>
              <button
                onClick={() => setAnalysisError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-8 flex gap-6">
        {/* Document Preview */}
        <div
          className={`flex-1 flex items-center justify-center ${showAnalysis ? "max-w-[50%]" : ""}`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-full w-full"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {renderContent(mimeType, previewUrl, evidence)}
          </motion.div>
        </div>

        {/* Analysis Results Panel */}
        <AnimatePresence>
          {showAnalysis && analysisResult && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-[500px] shrink-0 overflow-y-auto"
            >
              <DocumentAnalysisResults
                analysis={analysisResult}
                fileName={evidence.filePath?.split(/[\\/]/).pop()}
                onClose={() => setShowAnalysis(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function renderContent(
  mimeType: string,
  previewUrl: string,
  evidence: Evidence
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
