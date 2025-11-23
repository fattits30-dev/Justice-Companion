/**
 * Document Parser Component
 *
 * Extract and display text and metadata from evidence documents.
 *
 * Features:
 * - Parse PDF, DOCX, TXT files
 * - Extract metadata (author, dates, page count)
 * - Display extracted text
 * - Copy to clipboard
 * - Search within text
 * - Export extracted text
 *
 * @module DocumentParser
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Copy,
  Download,
  Search,
  Loader,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Hash,
} from "lucide-react";
import {
  evidenceApi,
  type ParsedDocument,
} from "../../lib/evidenceApiClient.ts";
import type { Evidence } from "../../domains/evidence/entities/Evidence.ts";
import { Card } from "../ui/Card.tsx";
import { Button } from "../ui/Button.tsx";

interface DocumentParserProps {
  evidence: Evidence;
  onClose?: () => void;
}

export function DocumentParser({ evidence, onClose }: DocumentParserProps) {
  const [parsed, setParsed] = useState<ParsedDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const safeSearchQuery = searchQuery.trim().slice(0, 200);

  const highlightData = useMemo(() => {
    if (!parsed?.text || !safeSearchQuery) {
      return {
        segments: null as null | Array<{ text: string; isMatch: boolean }>,
        matchCount: 0,
      };
    }

    const escaped = safeSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    let matchCount = 0;
    const segments = parsed.text.split(regex).map((segment, index) => {
      const isMatch = index % 2 === 1 && segment.length > 0;
      if (isMatch) {
        matchCount += 1;
      }
      return { text: segment, isMatch };
    });

    return { segments, matchCount };
  }, [parsed?.text, safeSearchQuery]);

  const buildExportFilename = (suffix: string) => {
    const sanitizedTitle =
      evidence.title.replace(/[\\/:*?"<>|]/g, "_") || "document";
    return `${sanitizedTitle}${suffix}`;
  };

  const handleParse = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await evidenceApi.parse(evidence.id);
      setParsed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse document");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!parsed) {
      return;
    }

    try {
      await navigator.clipboard.writeText(parsed.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleExport = () => {
    if (!parsed) {
      return;
    }

    const blob = new Blob([parsed.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${buildExportFilename("-extracted")}.txt`;
    link.rel = "noopener";
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const highlightedSegments = highlightData.segments;

  return (
    <Card variant="glass" className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <FileText className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Document Parser
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

      {/* Parse Button */}
      {!parsed && !loading && !error && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70 mb-6">
            Extract text and metadata from this document
          </p>
          <Button onClick={handleParse}>
            <FileText className="h-4 w-4 mr-2" />
            Parse Document
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <Loader className="h-12 w-12 mx-auto mb-4 text-cyan-400 animate-spin" />
          <p className="text-white/70">Parsing document...</p>
          <p className="text-sm text-white/50 mt-2">
            This may take a few moments for large documents
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={handleParse}>Try Again</Button>
        </div>
      )}

      {/* Parsed Content */}
      {parsed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Metadata */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-3">
              Document Metadata
            </h4>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="flex items-center gap-2 text-white/60 mb-1">
                  <Hash className="h-4 w-4" />
                  Pages
                </dt>
                <dd className="text-white font-medium">{parsed.pages}</dd>
              </div>
              {parsed.metadata.wordCount && (
                <div>
                  <dt className="flex items-center gap-2 text-white/60 mb-1">
                    <Hash className="h-4 w-4" />
                    Words
                  </dt>
                  <dd className="text-white font-medium">
                    {parsed.metadata.wordCount.toLocaleString()}
                  </dd>
                </div>
              )}
              {parsed.metadata.author && (
                <div>
                  <dt className="flex items-center gap-2 text-white/60 mb-1">
                    <User className="h-4 w-4" />
                    Author
                  </dt>
                  <dd className="text-white font-medium">
                    {parsed.metadata.author}
                  </dd>
                </div>
              )}
              {parsed.metadata.creationDate && (
                <div>
                  <dt className="flex items-center gap-2 text-white/60 mb-1">
                    <Calendar className="h-4 w-4" />
                    Created
                  </dt>
                  <dd className="text-white font-medium">
                    {new Date(
                      parsed.metadata.creationDate,
                    ).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in text..."
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />
            </div>
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

          {/* Extracted Text */}
          <div className="p-4 bg-gray-900/50 rounded-lg border border-white/10 max-h-[600px] overflow-y-auto">
            <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap font-mono">
              {highlightedSegments && safeSearchQuery
                ? highlightedSegments.map((segment, index) =>
                    segment.isMatch ? (
                      <mark
                        key={`${segment.text}-${index}`}
                        className="bg-yellow-400 text-black rounded px-0.5"
                      >
                        {segment.text}
                      </mark>
                    ) : (
                      <span key={`${segment.text}-${index}`}>
                        {segment.text}
                      </span>
                    ),
                  )
                : parsed.text}
            </div>
          </div>

          {/* Statistics */}
          <div className="mt-4 flex items-center justify-between text-xs text-white/60">
            <span>{parsed.text.length.toLocaleString()} characters</span>
            {safeSearchQuery && (
              <span>{highlightData.matchCount} matches found</span>
            )}
          </div>
        </motion.div>
      )}
    </Card>
  );
}
