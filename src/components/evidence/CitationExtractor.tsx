/**
 * Citation Extractor Component
 *
 * Extract and display legal citations from evidence documents.
 *
 * Features:
 * - Extract case citations
 * - Extract statute citations
 * - Extract regulation citations
 * - Show citation context
 * - Search citations in UK legal databases
 * - Export citations to CSV
 *
 * @module CitationExtractor
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Scale,
  Search,
  Download,
  ExternalLink,
  Loader,
  AlertCircle,
  FileText,
} from "lucide-react";
import { evidenceApi, type Citation } from "../../lib/evidenceApiClient.ts";
import type { Evidence } from "../../domains/evidence/entities/Evidence.ts";
import { Card } from "../ui/Card.tsx";
import { Button } from "../ui/Button.tsx";
import { Badge } from "../ui/Badge.tsx";

interface CitationExtractorProps {
  evidence: Evidence;
  onClose?: () => void;
}

export function CitationExtractor({
  evidence,
  onClose,
}: CitationExtractorProps) {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleExtract = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await evidenceApi.extractCitations(evidence.id);
      setCitations(result.citations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract citations",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCitation = (citation: string) => {
    // Open UK legal database search in new tab
    const searchUrl = `https://www.legislation.gov.uk/search?query=${encodeURIComponent(citation)}`;
    window.open(searchUrl, "_blank");
  };

  const handleExportCSV = () => {
    if (citations.length === 0) {
      return;
    }

    const csv = [
      ["Type", "Citation", "Context", "Position"],
      ...citations.map((c) => [
        c.type,
        c.text,
        c.context || "",
        `${c.startIndex}-${c.endIndex}`,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${evidence.title}-citations.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter citations
  const filteredCitations = citations.filter((citation) => {
    if (selectedType && citation.type !== selectedType) {
      return false;
    }
    if (
      searchQuery &&
      !citation.text.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Citation type counts
  const typeCounts = citations.reduce(
    (acc, citation) => {
      acc[citation.type] = (acc[citation.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Card variant="glass" className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Scale className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Citation Extractor
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

      {/* Extract Button */}
      {citations.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Scale className="h-16 w-16 mx-auto mb-4 text-white/30" />
          <p className="text-white/70 mb-6">
            Extract legal citations from this document
          </p>
          <p className="text-sm text-white/50 mb-6">
            Supports UK case law, statutes, and regulations
          </p>
          <Button onClick={handleExtract}>
            <Scale className="h-4 w-4 mr-2" />
            Extract Citations
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <Loader className="h-12 w-12 mx-auto mb-4 text-cyan-400 animate-spin" />
          <p className="text-white/70">Extracting citations...</p>
          <p className="text-sm text-white/50 mt-2">
            Analyzing document for legal references
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={handleExtract}>Try Again</Button>
        </div>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Statistics */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-3">
              Citation Statistics
            </h4>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="info" size="lg">
                {citations.length} Total Citations
              </Badge>
              {Object.entries(typeCounts).map(([type, count]) => (
                <Badge
                  key={type}
                  variant={selectedType === type ? "primary" : "secondary"}
                  size="sm"
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedType(selectedType === type ? null : type)
                  }
                >
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search citations..."
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Citation List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredCitations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/70">No citations match your filters</p>
              </div>
            ) : (
              filteredCitations.map((citation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="info"
                          size="sm"
                          className={getCitationTypeColor(citation.type)}
                        >
                          {citation.type}
                        </Badge>
                        <span className="text-xs text-white/50">
                          Position: {citation.startIndex}-{citation.endIndex}
                        </span>
                      </div>
                      <p className="text-white font-medium mb-2">
                        {citation.text}
                      </p>
                      {citation.context && (
                        <p className="text-sm text-white/70 line-clamp-2">
                          {citation.context}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSearchCitation(citation.text)}
                      title="Search in UK legal databases"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Results Count */}
          <div className="mt-4 text-xs text-white/60 text-center">
            Showing {filteredCitations.length} of {citations.length} citations
          </div>
        </motion.div>
      )}
    </Card>
  );
}

function getCitationTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    case: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    statute: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    regulation: "bg-green-500/20 text-green-400 border-green-500/30",
    article: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  return (
    colorMap[type.toLowerCase()] ||
    "bg-gray-500/20 text-gray-400 border-gray-500/30"
  );
}
