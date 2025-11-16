import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Evidence,
  EvidenceType,
} from "../../domains/evidence/entities/Evidence.ts";
import type { Case } from "../../domains/cases/entities/Case.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { DocumentsToolbar } from "./components/DocumentsToolbar.tsx";
import {
  DocumentsEmptyEvidenceState,
  DocumentsFilteredEmptyState,
  DocumentsLoadingState,
  DocumentsNoCasesState,
} from "./components/DocumentsStates.tsx";
import { EvidenceList } from "./components/EvidenceList.tsx";
import { EvidenceSummaryCards } from "./components/EvidenceSummaryCards.tsx";
import {
  UploadEvidenceDialog,
  type UploadEvidenceInput,
} from "./components/UploadEvidenceDialog.tsx";
import { showSuccess, showError } from "../../components/ui/Toast.tsx";
import { apiClient } from "../../lib/apiClient.ts";

type LoadState = "idle" | "loading" | "error" | "ready";

interface LightweightCase {
  id: number;
  title: string;
}

export function DocumentsView() {
  const { sessionId, isLoading: authLoading } = useAuth();
  const [cases, setCases] = useState<LightweightCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [casesState, setCasesState] = useState<LoadState>("loading");
  const [casesError, setCasesError] = useState<string | null>(null);

  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceState, setEvidenceState] = useState<LoadState>("idle");
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<EvidenceType | "all">("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const loadCases = useCallback(async () => {
    if (!sessionId) {
      setCasesError("No active session");
      setCasesState("error");
      return;
    }

    try {
      setCasesState("loading");
      setCasesError(null);

      // Use HTTP API client instead of Electron IPC
      const response = await apiClient.cases.list();

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to load cases");
      }

      if (!response.data) {
        throw new Error("No data returned from cases.list");
      }

      // Handle both paginated and direct array responses
      const casesArray =
        "items" in response.data
          ? response.data.items
          : (response.data as Case[]);

      const mappedCases = casesArray.map((caseItem) => ({
        id: caseItem.id,
        title: caseItem.title,
      }));

      setCases(mappedCases);
      setCasesState("ready");

      if (mappedCases.length > 0) {
        setSelectedCaseId(mappedCases[0].id);
      } else {
        setSelectedCaseId(null);
        setEvidence([]);
        setEvidenceState("idle");
      }
    } catch (err) {
      setCasesError(err instanceof Error ? err.message : "Unknown error");
      setCasesState("error");
    }
  }, [sessionId]);

  const loadEvidence = useCallback(
    async (caseId: number) => {
      if (!sessionId) {
        setEvidenceError("No active session");
        setEvidenceState("error");
        return;
      }

      try {
        setEvidenceState("loading");
        setEvidenceError(null);

        // Use HTTP API client instead of Electron IPC
        const response = await apiClient.evidence.listByCase(caseId);

        if (!response.success) {
          throw new Error(response.error?.message || "Failed to load evidence");
        }

        if (!response.data) {
          throw new Error("No data returned from evidence.listByCase");
        }

        setEvidence(response.data);
        setEvidenceState("ready");
      } catch (err) {
        setEvidenceError(err instanceof Error ? err.message : "Unknown error");
        setEvidenceState("error");
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (!authLoading && sessionId) {
      loadCases();
    }
  }, [loadCases, sessionId, authLoading]);

  useEffect(() => {
    if (!authLoading && selectedCaseId !== null && sessionId) {
      loadEvidence(selectedCaseId);
    }
  }, [selectedCaseId, loadEvidence, sessionId, authLoading]);

  const handleUploadEvidence = useCallback(
    async (input: UploadEvidenceInput) => {
      if (!sessionId) {
        showError("No active session", { title: "Failed to upload evidence" });
        return;
      }

      try {
        if (selectedCaseId === null) {
          throw new Error("No case selected");
        }

        // Create FormData for file upload (multipart/form-data)
        const formData = new FormData();
        formData.append("case_id", selectedCaseId.toString());
        formData.append("title", input.file.name);
        formData.append("evidence_type", "document");
        formData.append("file", input.file);
        formData.append("parse_document", "true");
        formData.append("extract_citations", "true");

        // Get session ID from localStorage for Authorization header
        const sessionId = localStorage.getItem("sessionId");

        // Upload file to HTTP API
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/evidence/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${sessionId}`,
            },
            body: formData,
          },
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: "Upload failed" }));
          throw new Error(errorData.detail || "Failed to upload evidence");
        }

        const data = await response.json();
        const uploadedEvidence = data.evidence as Evidence;

        setEvidence((previous) => [uploadedEvidence, ...previous]);
        setShowUploadDialog(false);
        showSuccess(`${input.file.name} has been added to evidence`, {
          title: "Evidence uploaded",
        });
      } catch (err) {
        showError(err instanceof Error ? err.message : "Unknown error", {
          title: "Failed to upload evidence",
        });
      }
    },
    [selectedCaseId, sessionId],
  );

  const handleDeleteEvidence = useCallback(
    async (evidenceId: number) => {
      if (!sessionId) {
        showError("No active session", { title: "Failed to delete evidence" });
        return;
      }

      const confirmed = confirm(
        "Are you sure you want to delete this evidence? This cannot be undone.",
      );
      if (!confirmed) {
        return;
      }

      try {
        // Use HTTP API client instead of Electron IPC
        const response = await apiClient.evidence.delete(evidenceId);

        if (!response.success) {
          throw new Error(
            response.error?.message || "Failed to delete evidence",
          );
        }

        setEvidence((previous) =>
          previous.filter((item) => item.id !== evidenceId),
        );
        showSuccess("The evidence has been permanently removed", {
          title: "Evidence deleted",
        });
      } catch (err) {
        showError(err instanceof Error ? err.message : "Unknown error", {
          title: "Failed to delete evidence",
        });
      }
    },
    [sessionId],
  );

  const filteredEvidence = useMemo(() => {
    if (filterType === "all") {
      return evidence;
    }
    return evidence.filter((item) => item.evidenceType === filterType);
  }, [evidence, filterType]);

  const showFilteredEmpty =
    evidence.length > 0 && filteredEvidence.length === 0;
  const showEmptyEvidence = evidence.length === 0;
  const hasCases = cases.length > 0;

  // Determine what content to show
  let contentArea;

  if (casesState === "loading") {
    contentArea = <DocumentsLoadingState />;
  } else if (casesState === "error" && casesError) {
    contentArea = (
      <div className="rounded-lg border border-red-500 bg-red-900/20 p-6 max-w-md mx-auto mt-16">
        <h2 className="mb-2 text-xl font-bold text-red-400">
          Error Loading Documents
        </h2>
        <p className="text-white">{casesError}</p>
        <button
          onClick={loadCases}
          className="mt-4 rounded bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  } else if (!hasCases) {
    contentArea = <DocumentsNoCasesState onReload={loadCases} />;
  } else if (selectedCaseId === null) {
    contentArea = <DocumentsNoCasesState onReload={loadCases} />;
  } else if (evidenceState === "loading") {
    contentArea = <DocumentsLoadingState />;
  } else if (evidenceState === "error" && evidenceError) {
    contentArea = (
      <div className="rounded-lg border border-red-500 bg-red-900/20 p-6 max-w-md mx-auto mt-16">
        <h2 className="mb-2 text-xl font-bold text-red-400">
          Error Loading Evidence
        </h2>
        <p className="text-white">{evidenceError}</p>
        <button
          onClick={() => loadEvidence(selectedCaseId)}
          className="mt-4 rounded bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  } else if (showEmptyEvidence) {
    contentArea = (
      <DocumentsEmptyEvidenceState onUpload={() => setShowUploadDialog(true)} />
    );
  } else {
    contentArea = (
      <>
        {/* Summary Statistics Cards */}
        <EvidenceSummaryCards evidence={evidence} />

        {/* Evidence List or Filtered Empty State */}
        {showFilteredEmpty ? (
          <DocumentsFilteredEmptyState />
        ) : (
          <EvidenceList
            evidence={filteredEvidence}
            onDelete={handleDeleteEvidence}
          />
        )}
      </>
    );
  }

  return (
    <div className="h-full flex flex-col bg-linear-to-br from-gray-900 via-primary-900 to-gray-900">
      {/* Sticky Header with Toolbar */}
      <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="px-8 py-6">
          <DocumentsToolbar
            cases={cases}
            selectedCaseId={selectedCaseId}
            onCaseSelect={setSelectedCaseId}
            filterType={filterType}
            onFilterChange={setFilterType}
            onUploadClick={() => setShowUploadDialog(true)}
            isUploadDisabled={selectedCaseId === null}
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">{contentArea}</div>

      {showUploadDialog && (
        <UploadEvidenceDialog
          onClose={() => setShowUploadDialog(false)}
          onUpload={handleUploadEvidence}
        />
      )}
    </div>
  );
}
