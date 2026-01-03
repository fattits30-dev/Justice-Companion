/**
 * ExtractDatesDialog - Shows dates extracted from case evidence
 * Allows user to select dates and add them as deadlines
 */

import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  AlertTriangle,
  Plus,
  FileText,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../components/ui/Button.tsx";
import { apiClient } from "../../../lib/apiClient.ts";

interface ExtractedDate {
  date: string;
  originalText: string;
  context: string;
  isDeadline: boolean;
  deadlineType: string | null;
  confidence: number;
}

interface DateExtractionResult {
  dates: ExtractedDate[];
  deadlines: ExtractedDate[];
  documentDate: ExtractedDate | null;
  totalDates: number;
  totalDeadlines: number;
  errors: string[];
}

interface EvidenceWithDates {
  evidenceId: number;
  evidenceTitle: string;
  dates: DateExtractionResult;
}

interface ExtractDatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: number;
  caseTitle: string;
  onAddDeadline: (date: string, title: string, description: string) => void;
}

export function ExtractDatesDialog({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  onAddDeadline,
}: ExtractDatesDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceWithDates, setEvidenceWithDates] = useState<
    EvidenceWithDates[]
  >([]);
  const [addedDates, setAddedDates] = useState<Set<string>>(new Set());

  // Load and extract dates from all evidence in the case
  useEffect(() => {
    if (!isOpen || !caseId) {
      return;
    }

    async function extractDates() {
      setIsLoading(true);
      setError(null);
      setEvidenceWithDates([]);

      try {
        // First, get all evidence for the case
        const evidenceResult = await apiClient.evidence.listByCase(caseId);

        if (!evidenceResult.success) {
          throw new Error("Failed to load evidence");
        }

        const evidenceList = evidenceResult.data || [];

        if (evidenceList.length === 0) {
          setError("No evidence found for this case. Upload documents first.");
          setIsLoading(false);
          return;
        }

        // Extract dates from each piece of evidence
        const results: EvidenceWithDates[] = [];

        for (const evidence of evidenceList) {
          try {
            const response = await fetch(
              `http://127.0.0.1:8000/evidence/${evidence.id}/dates`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
                },
              },
            );

            if (response.ok) {
              const data = await response.json();
              const dateResult = data.data || data;

              if (dateResult.totalDates > 0) {
                results.push({
                  evidenceId: evidence.id,
                  evidenceTitle: evidence.title || `Evidence #${evidence.id}`,
                  dates: dateResult,
                });
              }
            }
          } catch (err) {
            console.warn(
              `Failed to extract dates from evidence ${evidence.id}:`,
              err,
            );
          }
        }

        setEvidenceWithDates(results);

        if (results.length === 0) {
          setError("No dates found in any evidence documents.");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to extract dates",
        );
      } finally {
        setIsLoading(false);
      }
    }

    extractDates();
  }, [isOpen, caseId]);

  const handleAddDeadline = (date: ExtractedDate, evidenceTitle: string) => {
    const dateKey = `${date.date}-${date.deadlineType}`;

    // Create user-friendly, action-oriented titles
    const deadlineTypeToTitle: Record<string, string> = {
      appeal: "⚠️ Submit Appeal",
      response: "📝 Submit Response",
      deadline: "⏰ Action Required",
      hearing: "🏛️ Court Hearing",
      payment: "💷 Payment Due",
      submission: "📤 Submit Documents",
      expiry: "⌛ Expires",
      return: "📦 Return Items",
    };

    const title = date.deadlineType
      ? deadlineTypeToTitle[date.deadlineType] ||
        `${date.deadlineType.charAt(0).toUpperCase() + date.deadlineType.slice(1)} Deadline`
      : "📅 Important Date";

    // Create clear, user-friendly description
    // Clean up context but keep it readable
    const cleanContext = date.context
      .replace(/^["']|["']$/g, "") // Remove surrounding quotes
      .trim();

    // Build a helpful, structured description
    const description = `📄 Source: ${evidenceTitle}\n\n📌 What this means:\n${cleanContext}\n\n💡 Original text: "${date.originalText}"`;

    onAddDeadline(date.date, title, description);
    setAddedDates((prev) => new Set(prev).add(dateKey));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) {
      return "text-green-600 bg-green-100";
    }
    if (confidence >= 0.7) {
      return "text-yellow-600 bg-yellow-100";
    }
    return "text-gray-600 bg-gray-100";
  };

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold">
                  Extract Dates from Evidence
                </h2>
                <p className="text-sm text-gray-500">{caseTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-130px)]">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Scanning evidence for dates...</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                <p className="text-gray-600">{error}</p>
              </div>
            )}

            {!isLoading && !error && evidenceWithDates.length > 0 && (
              <div className="space-y-6">
                {evidenceWithDates.map((evidence) => (
                  <div
                    key={evidence.evidenceId}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Evidence header */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {evidence.evidenceTitle}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({evidence.dates.totalDates} dates,{" "}
                        {evidence.dates.totalDeadlines} deadlines)
                      </span>
                    </div>

                    {/* Deadlines first */}
                    {evidence.dates.deadlines.length > 0 && (
                      <div className="p-4 bg-red-50 border-b">
                        <h4 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Important Deadlines Detected
                        </h4>
                        <div className="space-y-3">
                          {evidence.dates.deadlines.map((date, idx) => {
                            const dateKey = `${date.date}-${date.deadlineType}`;
                            const isAdded = addedDates.has(dateKey);

                            return (
                              <div
                                key={idx}
                                className="bg-white rounded-lg p-3 border border-red-200"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-red-700">
                                        {formatDate(date.date)}
                                      </span>
                                      {date.deadlineType && (
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                                          {date.deadlineType}
                                        </span>
                                      )}
                                      <span
                                        className={`px-2 py-0.5 text-xs rounded-full ${getConfidenceColor(date.confidence)}`}
                                      >
                                        {Math.round(date.confidence * 100)}%
                                        confident
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                      "{date.context}"
                                    </p>
                                  </div>
                                  <Button
                                    variant={isAdded ? "secondary" : "primary"}
                                    size="sm"
                                    onClick={() =>
                                      handleAddDeadline(
                                        date,
                                        evidence.evidenceTitle,
                                      )
                                    }
                                    disabled={isAdded}
                                  >
                                    {isAdded ? (
                                      "Added"
                                    ) : (
                                      <>
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Other dates */}
                    {evidence.dates.dates.filter((d) => !d.isDeadline).length >
                      0 && (
                      <div className="p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Other Dates Found
                        </h4>
                        <div className="space-y-2">
                          {evidence.dates.dates
                            .filter((d) => !d.isDeadline)
                            .map((date, idx) => {
                              const dateKey = `${date.date}-other`;
                              const isAdded = addedDates.has(dateKey);

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0"
                                >
                                  <div className="flex-1">
                                    <span className="font-medium">
                                      {formatDate(date.date)}
                                    </span>
                                    <span className="text-sm text-gray-500 ml-2">
                                      ({date.originalText})
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleAddDeadline(
                                        date,
                                        evidence.evidenceTitle,
                                      )
                                    }
                                    disabled={isAdded}
                                  >
                                    {isAdded ? "Added" : "Add as Deadline"}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
