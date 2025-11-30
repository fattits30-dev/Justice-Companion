import { motion } from "framer-motion";
import {
  X,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Search,
} from "lucide-react";
import { Card } from "../../../components/ui/Card.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import type {
  EvidenceAnalysisResponse,
  EvidenceGap,
  EvidenceImportance,
} from "../../../types/ai-analysis.ts";

interface EvidenceAnalysisDialogProps {
  onClose: () => void;
  analysis: EvidenceAnalysisResponse;
  isLoading?: boolean;
}

export function EvidenceAnalysisDialog({
  onClose,
  analysis,
  isLoading,
}: EvidenceAnalysisDialogProps) {
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-4xl"
        >
          <Card variant="glass" className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              <p className="text-lg text-white">Analyzing your evidence...</p>
              <p className="text-sm text-gray-400">
                Justice Companion AI is reviewing your evidence collection
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  const getImportanceColor = (importance: EvidenceImportance) => {
    switch (importance) {
      case "critical":
        return "text-red-400 bg-red-900/30 border-red-700";
      case "important":
        return "text-orange-400 bg-orange-900/30 border-orange-700";
      case "helpful":
        return "text-yellow-400 bg-yellow-900/30 border-yellow-700";
      default:
        return "text-gray-400 bg-gray-900/30 border-gray-700";
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "strong":
        return "text-green-400";
      case "moderate":
        return "text-yellow-400";
      case "weak":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  // Filter gaps by importance level
  const criticalGaps = analysis.gaps.filter(
    (gap) => gap.importance === "critical",
  );
  const importantGaps = analysis.gaps.filter(
    (gap) => gap.importance === "important",
  );
  const helpfulGaps = analysis.gaps.filter(
    (gap) => gap.importance === "helpful",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <Card variant="glass" className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-700">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Evidence Analysis
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  AI-powered assessment of your evidence collection
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6 p-6 overflow-y-auto flex-1">
            {/* Overall Assessment */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Overall Assessment
              </h3>
              <Card variant="default" className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 rounded-lg bg-primary-900/50">
                    <p className="text-xs text-gray-400 mb-1">
                      Overall Strength
                    </p>
                    <p
                      className={`text-3xl font-bold ${getStrengthColor(analysis.strength ?? "unknown")}`}
                    >
                      {(analysis.strength ?? "unknown").toUpperCase()}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-primary-900/50">
                    <p className="text-xs text-gray-400 mb-1">Total Gaps</p>
                    <p className="text-3xl font-bold text-orange-400">
                      {analysis.gaps.length}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-primary-900/50">
                    <p className="text-xs text-gray-400 mb-1">Critical Gaps</p>
                    <p className="text-3xl font-bold text-red-400">
                      {criticalGaps.length}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">{analysis.explanation}</p>
              </Card>
            </section>

            {/* Critical Gaps */}
            {criticalGaps.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Critical Evidence Gaps
                </h3>
                <div className="space-y-3">
                  {criticalGaps.map((gap: EvidenceGap, index: number) => (
                    <Card
                      key={index}
                      variant="default"
                      className="p-4 border-l-4 border-red-500"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-white">
                              {gap.description}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getImportanceColor(gap.importance)}`}
                            >
                              {gap.importance.toUpperCase()}
                            </span>
                          </div>
                          {gap.suggestedSources &&
                            gap.suggestedSources.length > 0 && (
                              <div className="mt-3 p-3 rounded bg-primary-900/50 border border-gray-700">
                                <div className="flex items-start gap-2">
                                  <Search className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-blue-400 mb-2">
                                      Where to find this evidence:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                                      {gap.suggestedSources.map(
                                        (source: string, idx: number) => (
                                          <li key={idx}>{source}</li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Important Gaps */}
            {importantGaps.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                  Important Evidence Gaps
                </h3>
                <div className="space-y-3">
                  {importantGaps.map((gap: EvidenceGap, index: number) => (
                    <Card
                      key={index}
                      variant="default"
                      className="p-4 border-l-4 border-orange-500"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-white">
                              {gap.description}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getImportanceColor(gap.importance)}`}
                            >
                              {gap.importance.toUpperCase()}
                            </span>
                          </div>
                          {gap.suggestedSources &&
                            gap.suggestedSources.length > 0 && (
                              <div className="mt-3 p-3 rounded bg-primary-900/50 border border-gray-700">
                                <div className="flex items-start gap-2">
                                  <Search className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-blue-400 mb-2">
                                      Where to find this evidence:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                                      {gap.suggestedSources.map(
                                        (source: string, idx: number) => (
                                          <li key={idx}>{source}</li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Helpful Gaps */}
            {helpfulGaps.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-yellow-400" />
                  Helpful Additional Evidence
                </h3>
                <div className="space-y-3">
                  {helpfulGaps.map((gap: EvidenceGap, index: number) => (
                    <Card
                      key={index}
                      variant="default"
                      className="p-4 border-l-4 border-yellow-500"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-white">
                              {gap.description}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getImportanceColor(gap.importance)}`}
                            >
                              {gap.importance.toUpperCase()}
                            </span>
                          </div>
                          {gap.suggestedSources &&
                            gap.suggestedSources.length > 0 && (
                              <div className="mt-3 p-3 rounded bg-primary-900/50 border border-gray-700">
                                <div className="flex items-start gap-2">
                                  <Search className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-blue-400 mb-2">
                                      Where to find this evidence:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                                      {gap.suggestedSources.map(
                                        (source: string, idx: number) => (
                                          <li key={idx}>{source}</li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Suggestions */}
            {analysis.suggestions && analysis.suggestions.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Recommendations
                </h3>
                <Card variant="default" className="p-4">
                  <ul className="space-y-2">
                    {analysis.suggestions.map(
                      (suggestion: string, index: number) => (
                        <li
                          key={index}
                          className="flex items-start gap-3 text-sm text-gray-300"
                        >
                          <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                          <span>{suggestion}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </Card>
              </section>
            )}

            {/* Disclaimer */}
            <Card
              variant="default"
              className="p-4 bg-yellow-900/20 border-yellow-700/50"
            >
              <p className="text-xs text-yellow-200 italic">
                {analysis.disclaimer}
              </p>
            </Card>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
            <Button onClick={onClose} variant="primary">
              Close
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
