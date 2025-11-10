import { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  FileText,
  Calendar,
  Building,
  User,
  Hash,
} from "lucide-react";

interface SuggestedCaseData {
  title?: string;
  caseType?: string;
  description?: string;
  opposingParty?: string;
  caseNumber?: string;
  courtName?: string;
  filingDeadline?: string;
  nextHearingDate?: string;
  confidence?: {
    title?: number;
    caseType?: number;
    description?: number;
    opposingParty?: number;
    caseNumber?: number;
    courtName?: number;
    filingDeadline?: number;
    nextHearingDate?: number;
  };
  extractedFrom?: {
    title?: { source: string; text: string };
    description?: { source: string; text: string };
    opposingParty?: { source: string; text: string };
    caseNumber?: { source: string; text: string };
    courtName?: { source: string; text: string };
    filingDeadline?: { source: string; text: string };
    nextHearingDate?: { source: string; text: string };
  };
}

interface AICaseCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (caseData: any) => void;
  suggestedData: SuggestedCaseData;
  documentFilename: string;
  isCreating?: boolean;
}

const getConfidenceColor = (confidence?: number) => {
  if (!confidence) {
    return "text-gray-400";
  }
  if (confidence >= 0.8) {
    return "text-green-400";
  }
  if (confidence >= 0.6) {
    return "text-yellow-400";
  }
  return "text-red-400";
};

const getConfidenceIcon = (confidence?: number) => {
  if (!confidence) {
    return <AlertTriangle className="w-4 h-4 text-gray-400" />;
  }
  if (confidence >= 0.8) {
    return <CheckCircle className="w-4 h-4 text-green-400" />;
  }
  if (confidence >= 0.6) {
    return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  }
  return <AlertTriangle className="w-4 h-4 text-red-400" />;
};

const getConfidenceLabel = (confidence?: number) => {
  if (!confidence) {
    return "Not extracted";
  }
  if (confidence >= 0.8) {
    return "High confidence";
  }
  if (confidence >= 0.6) {
    return "Medium confidence";
  }
  return "Low confidence";
};

export function AICaseCreationDialog({
  isOpen,
  onClose,
  onConfirm,
  suggestedData,
  isCreating = false,
}: Omit<AICaseCreationDialogProps, "documentFilename">) {
  const [showSources, setShowSources] = useState(false);
  const [editedData, setEditedData] = useState(() => ({
    title: suggestedData?.title || "",
    caseType: suggestedData?.caseType || "other",
    description: suggestedData?.description || "",
    opposingParty: suggestedData?.opposingParty || "",
    caseNumber: suggestedData?.caseNumber || "",
    courtName: suggestedData?.courtName || "",
    filingDeadline: suggestedData?.filingDeadline || "",
    nextHearingDate: suggestedData?.nextHearingDate || "",
  }));

  // Update editedData when suggestedData changes (when dialog opens with new data)
  useEffect(() => {
    setEditedData({
      title: suggestedData?.title || "",
      caseType: suggestedData?.caseType || "other",
      description: suggestedData?.description || "",
      opposingParty: suggestedData?.opposingParty || "",
      caseNumber: suggestedData?.caseNumber || "",
      courtName: suggestedData?.courtName || "",
      filingDeadline: suggestedData?.filingDeadline || "",
      nextHearingDate: suggestedData?.nextHearingDate || "",
    });
  }, [suggestedData]);

  const handleConfirm = () => {
    onConfirm({
      ...editedData,
      // Only include non-empty strings
      title: editedData.title.trim() || undefined,
      description: editedData.description.trim() || undefined,
      opposingParty: editedData.opposingParty.trim() || undefined,
      caseNumber: editedData.caseNumber.trim() || undefined,
      courtName: editedData.courtName.trim() || undefined,
      filingDeadline: editedData.filingDeadline.trim() || undefined,
      nextHearingDate: editedData.nextHearingDate.trim() || undefined,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Confirm AI-Extracted Case Details
              </h2>
              <p className="text-white/70 mt-1">
                AI has analyzed your document and filled out the case details
                below. Please review, make any necessary changes, and confirm to
                create the case.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white p-2 flex-shrink-0"
              disabled={isCreating}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* AI Transparency Notice */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-blue-200 font-medium mb-2">
                  AI Analysis Transparency
                </h3>
                <p className="text-blue-100/80 text-sm">
                  The information below was automatically extracted from your
                  document by AI. Each field shows a confidence score indicating
                  how certain the AI is about the extraction. You can review,
                  edit, or override any information before creating the case.
                </p>
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="mt-2 flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm"
                >
                  {showSources ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {showSources ? "Hide" : "Show"} extraction sources
                </button>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Case Title *
              </label>
              <div className="flex items-center gap-3 mb-2">
                {getConfidenceIcon(suggestedData.confidence?.title)}
                <span
                  className={`text-sm ${getConfidenceColor(suggestedData.confidence?.title)}`}
                >
                  {getConfidenceLabel(suggestedData.confidence?.title)}
                </span>
              </div>
              <input
                type="text"
                value={editedData.title}
                onChange={(e) =>
                  setEditedData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter case title"
              />
              {showSources && suggestedData.extractedFrom?.title && (
                <div className="mt-2 p-3 bg-gray-800/50 rounded border border-gray-600">
                  <p className="text-xs text-gray-400 mb-1">
                    Extracted from: {suggestedData.extractedFrom.title.source}
                  </p>
                  <p className="text-sm text-gray-300">
                    "{suggestedData.extractedFrom.title.text}"
                  </p>
                </div>
              )}
            </div>

            {/* Case Type */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Case Type *
              </label>
              <div className="flex items-center gap-3 mb-2">
                {getConfidenceIcon(suggestedData.confidence?.caseType)}
                <span
                  className={`text-sm ${getConfidenceColor(suggestedData.confidence?.caseType)}`}
                >
                  {getConfidenceLabel(suggestedData.confidence?.caseType)}
                </span>
              </div>
              <select
                value={editedData.caseType}
                onChange={(e) =>
                  setEditedData((prev) => ({
                    ...prev,
                    caseType: e.target.value,
                  }))
                }
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="employment">Employment</option>
                <option value="housing">Housing</option>
                <option value="consumer">Consumer</option>
                <option value="family">Family</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Case Description
              </label>
              <div className="flex items-center gap-3 mb-2">
                {getConfidenceIcon(suggestedData.confidence?.description)}
                <span
                  className={`text-sm ${getConfidenceColor(suggestedData.confidence?.description)}`}
                >
                  {getConfidenceLabel(suggestedData.confidence?.description)}
                </span>
              </div>
              <textarea
                value={editedData.description}
                onChange={(e) =>
                  setEditedData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Brief description of the case"
              />
              {showSources && suggestedData.extractedFrom?.description && (
                <div className="mt-2 p-3 bg-gray-800/50 rounded border border-gray-600">
                  <p className="text-xs text-gray-400 mb-1">
                    Extracted from:{" "}
                    {suggestedData.extractedFrom.description.source}
                  </p>
                  <p className="text-sm text-gray-300">
                    "{suggestedData.extractedFrom.description.text}"
                  </p>
                </div>
              )}
            </div>

            {/* Two Column Layout for remaining fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opposing Party */}
              <div>
                <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Opposing Party
                </label>
                <div className="flex items-center gap-3 mb-2">
                  {getConfidenceIcon(suggestedData.confidence?.opposingParty)}
                  <span
                    className={`text-sm ${getConfidenceColor(suggestedData.confidence?.opposingParty)}`}
                  >
                    {getConfidenceLabel(
                      suggestedData.confidence?.opposingParty,
                    )}
                  </span>
                </div>
                <input
                  type="text"
                  value={editedData.opposingParty}
                  onChange={(e) =>
                    setEditedData((prev) => ({
                      ...prev,
                      opposingParty: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Name of opposing party"
                />
                {showSources && suggestedData.extractedFrom?.opposingParty && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded border border-gray-600">
                    <p className="text-xs text-gray-400">
                      "{suggestedData.extractedFrom.opposingParty.text}"
                    </p>
                  </div>
                )}
              </div>

              {/* Case Number */}
              <div>
                <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Case/Reference Number
                </label>
                <div className="flex items-center gap-3 mb-2">
                  {getConfidenceIcon(suggestedData.confidence?.caseNumber)}
                  <span
                    className={`text-sm ${getConfidenceColor(suggestedData.confidence?.caseNumber)}`}
                  >
                    {getConfidenceLabel(suggestedData.confidence?.caseNumber)}
                  </span>
                </div>
                <input
                  type="text"
                  value={editedData.caseNumber}
                  onChange={(e) =>
                    setEditedData((prev) => ({
                      ...prev,
                      caseNumber: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Case reference number"
                />
                {showSources && suggestedData.extractedFrom?.caseNumber && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded border border-gray-600">
                    <p className="text-xs text-gray-400">
                      "{suggestedData.extractedFrom.caseNumber.text}"
                    </p>
                  </div>
                )}
              </div>

              {/* Court Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Court/Tribunal Name
                </label>
                <div className="flex items-center gap-3 mb-2">
                  {getConfidenceIcon(suggestedData.confidence?.courtName)}
                  <span
                    className={`text-sm ${getConfidenceColor(suggestedData.confidence?.courtName)}`}
                  >
                    {getConfidenceLabel(suggestedData.confidence?.courtName)}
                  </span>
                </div>
                <input
                  type="text"
                  value={editedData.courtName}
                  onChange={(e) =>
                    setEditedData((prev) => ({
                      ...prev,
                      courtName: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Court or tribunal name"
                />
                {showSources && suggestedData.extractedFrom?.courtName && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded border border-gray-600">
                    <p className="text-xs text-gray-400">
                      "{suggestedData.extractedFrom.courtName.text}"
                    </p>
                  </div>
                )}
              </div>

              {/* Filing Deadline */}
              <div>
                <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Filing Deadline
                </label>
                <div className="flex items-center gap-3 mb-2">
                  {getConfidenceIcon(suggestedData.confidence?.filingDeadline)}
                  <span
                    className={`text-sm ${getConfidenceColor(suggestedData.confidence?.filingDeadline)}`}
                  >
                    {getConfidenceLabel(
                      suggestedData.confidence?.filingDeadline,
                    )}
                  </span>
                </div>
                <input
                  type="date"
                  value={editedData.filingDeadline}
                  onChange={(e) =>
                    setEditedData((prev) => ({
                      ...prev,
                      filingDeadline: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {showSources && suggestedData.extractedFrom?.filingDeadline && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded border border-gray-600">
                    <p className="text-xs text-gray-400">
                      "{suggestedData.extractedFrom.filingDeadline.text}"
                    </p>
                  </div>
                )}
              </div>

              {/* Next Hearing Date */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Next Hearing Date
                </label>
                <div className="flex items-center gap-3 mb-2">
                  {getConfidenceIcon(suggestedData.confidence?.nextHearingDate)}
                  <span
                    className={`text-sm ${getConfidenceColor(suggestedData.confidence?.nextHearingDate)}`}
                  >
                    {getConfidenceLabel(
                      suggestedData.confidence?.nextHearingDate,
                    )}
                  </span>
                </div>
                <input
                  type="date"
                  value={editedData.nextHearingDate}
                  onChange={(e) =>
                    setEditedData((prev) => ({
                      ...prev,
                      nextHearingDate: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {showSources &&
                  suggestedData.extractedFrom?.nextHearingDate && (
                    <div className="mt-2 p-2 bg-gray-800/50 rounded border border-gray-600">
                      <p className="text-xs text-gray-400">
                        "{suggestedData.extractedFrom.nextHearingDate.text}"
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Flow Chart */}
          <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              AI Case Creation Flow
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span>Document Upload</span>
              </div>
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex items-center gap-2 text-purple-400">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <span>AI Analysis</span>
              </div>
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span>Human Review</span>
              </div>
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex items-center gap-2 text-orange-400">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span>Case Created</span>
              </div>
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex items-center gap-2 text-cyan-400">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <span>Case Building</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 text-white/70 hover:text-white border border-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isCreating || !editedData.title.trim()}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Creating Case...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Create Case
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
