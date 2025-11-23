/**
 * OCR Component
 *
 * Optical Character Recognition for scanned documents.
 *
 * Features:
 * - Run OCR on scanned PDFs and images
 * - Language selection
 * - Confidence score display
 * - Edit OCR results
 * - Save corrected text
 * - Copy to clipboard
 * - Export text
 *
 * @module OCRComponent
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ScanLine,
  Copy,
  Download,
  Save,
  Edit2,
  Loader,
  AlertCircle,
  CheckCircle,
  Globe,
  Gauge,
} from "lucide-react";
import { evidenceApi, type OCRResult } from "../../lib/evidenceApiClient.ts";
import type { Evidence } from "../../domains/evidence/entities/Evidence.ts";
import { Card } from "../ui/Card.tsx";
import { Button } from "../ui/Button.tsx";
import { Badge } from "../ui/Badge.tsx";

interface OCRComponentProps {
  evidence: Evidence;
  onSave?: (text: string) => void;
  onClose?: () => void;
}

const SUPPORTED_LANGUAGES = [
  { code: "eng", name: "English" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "spa", name: "Spanish" },
  { code: "ita", name: "Italian" },
  { code: "por", name: "Portuguese" },
  { code: "nld", name: "Dutch" },
  { code: "pol", name: "Polish" },
  { code: "rus", name: "Russian" },
  { code: "chi_sim", name: "Chinese (Simplified)" },
  { code: "chi_tra", name: "Chinese (Traditional)" },
  { code: "jpn", name: "Japanese" },
  { code: "kor", name: "Korean" },
  { code: "ara", name: "Arabic" },
  { code: "hin", name: "Hindi" },
];

export function OCRComponent({ evidence, onSave, onClose }: OCRComponentProps) {
  const [result, setResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("eng");
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [copied, setCopied] = useState(false);

  const handleRunOCR = async () => {
    try {
      setLoading(true);
      setError(null);

      const ocrResult = await evidenceApi.runOCR(evidence.id, language);
      setResult(ocrResult);
      setEditedText(ocrResult.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run OCR");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleExport = () => {
    if (!result) {
      return;
    }

    const blob = new Blob([editedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle =
      evidence.title.replace(/[\\/:*?"<>|]/g, "_") || "document";
    link.download = `${safeTitle}-ocr.txt`;
    link.rel = "noopener";
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedText);
    }
    setIsEditing(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) {
      return "text-green-400";
    }
    if (confidence >= 70) {
      return "text-yellow-400";
    }
    return "text-red-400";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 90) {
      return "Excellent";
    }
    if (confidence >= 70) {
      return "Good";
    }
    if (confidence >= 50) {
      return "Fair";
    }
    return "Poor";
  };

  return (
    <Card variant="glass" className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/20 rounded-lg">
            <ScanLine className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              OCR - Text Recognition
            </h3>
            <p className="text-sm text-white/70">{evidence.title}</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Language Selection & Run Button */}
      {!result && !loading && !error && (
        <div className="text-center py-12">
          <ScanLine className="h-16 w-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70 mb-6">
            Extract text from scanned images and PDFs
          </p>

          <div className="max-w-md mx-auto mb-6">
            <label className="block text-sm font-medium text-white/90 mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Select Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleRunOCR}>
            <ScanLine className="h-4 w-4 mr-2" />
            Run OCR
          </Button>

          <p className="text-xs text-white/50 mt-4">
            Processing may take 30-60 seconds depending on document size
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <Loader className="h-12 w-12 mx-auto mb-4 text-cyan-400 animate-spin" />
          <p className="text-white/70">Running OCR...</p>
          <p className="text-sm text-white/50 mt-2">
            This may take a few moments
          </p>
          <div className="mt-6 max-w-md mx-auto">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 30, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={handleRunOCR}>Try Again</Button>
        </div>
      )}

      {/* OCR Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Metadata */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-3">
              OCR Results
            </h4>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="flex items-center gap-2 text-white/60 mb-1">
                  <Gauge className="h-4 w-4" />
                  Confidence
                </dt>
                <dd
                  className={`font-medium ${getConfidenceColor(result.confidence)}`}
                >
                  {result.confidence.toFixed(1)}% (
                  {getConfidenceLabel(result.confidence)})
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-white/60 mb-1">
                  <Globe className="h-4 w-4" />
                  Language
                </dt>
                <dd className="text-white font-medium">{result.language}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-white/60 mb-1">
                  Processing Time
                </dt>
                <dd className="text-white font-medium">
                  {result.processingTime.toFixed(2)}s
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {result.confidence < 70 && (
              <Badge variant="warning" size="sm">
                Low confidence - Please review
              </Badge>
            )}
          </div>

          {/* Extracted Text */}
          {isEditing ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full h-[600px] p-4 bg-gray-900/50 rounded-lg border border-white/10 text-sm text-white/90 leading-relaxed whitespace-pre-wrap font-mono focus:outline-hidden focus:ring-2 focus:ring-cyan-500 resize-none"
            />
          ) : (
            <div className="p-4 bg-gray-900/50 rounded-lg border border-white/10 max-h-[600px] overflow-y-auto">
              <pre className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap font-mono">
                {editedText}
              </pre>
            </div>
          )}

          {/* Statistics */}
          <div className="mt-4 flex items-center justify-between text-xs text-white/60">
            <span>{editedText.length.toLocaleString()} characters</span>
            <span>
              {editedText.split(/\s+/).filter(Boolean).length.toLocaleString()}{" "}
              words
            </span>
          </div>
        </motion.div>
      )}
    </Card>
  );
}
