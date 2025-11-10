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
  DocumentsErrorState,
  DocumentsFilteredEmptyState,
  DocumentsLoadingState,
  DocumentsNoCasesState,
} from "./components/DocumentsStates.tsx";
import { EvidenceList } from "./components/EvidenceList.tsx";
import {
  UploadEvidenceDialog,
  type UploadEvidenceInput,
} from "./components/UploadEvidenceDialog.tsx";
import { showSuccess, showError } from "../../components/ui/Toast.tsx";

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
      const response = await window.justiceAPI.getAllCases(sessionId);

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to load cases");
      }

      if (!response.data) {
        throw new Error("No data returned from getAllCases");
      }

      const mappedCases = (response.data as Case[]).map((caseItem) => ({
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
        const response = await window.justiceAPI.getAllEvidence(
          caseId.toString(),
          sessionId,
        );

        if (!response.success) {
          throw new Error(response.error?.message || "Failed to load evidence");
        }

        if (!response.data) {
          throw new Error("No data returned from getAllEvidence");
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
        const response = await window.justiceAPI.uploadFile(
          selectedCaseId.toString(),
          input.file,
          sessionId,
        );

        if (!response.success) {
          throw new Error(
            response.error?.message || "Failed to upload evidence",
          );
        }

        if (!response.data) {
          throw new Error("No data returned from uploadFile");
        }

        setEvidence((previous) => [response.data as Evidence, ...previous]);
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

  const handleDeleteEvidence = useCallback(async (evidenceId: number) => {
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
      const response = await window.justiceAPI.deleteEvidence(
        evidenceId.toString(),
        sessionId,
      );

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to delete evidence");
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
  }, []);

  const filteredEvidence = useMemo(() => {
    if (filterType === "all") {
      return evidence;
    }
    return evidence.filter((item) => item.evidenceType === filterType);
  }, [evidence, filterType]);

  if (casesState === "loading") {
    return <DocumentsLoadingState />;
  }

  if (casesState === "error" && casesError) {
    return <DocumentsErrorState message={casesError} onRetry={loadCases} />;
  }

  if (cases.length === 0) {
    return <DocumentsNoCasesState onReload={loadCases} />;
  }

  if (selectedCaseId === null) {
    return <DocumentsNoCasesState onReload={loadCases} />;
  }

  if (evidenceState === "loading") {
    return <DocumentsLoadingState />;
  }

  if (evidenceState === "error" && evidenceError) {
    return (
      <DocumentsErrorState
        message={evidenceError}
        onRetry={() => loadEvidence(selectedCaseId)}
      />
    );
  }

  const showFilteredEmpty =
    evidence.length > 0 && filteredEvidence.length === 0;
  const showEmptyEvidence = evidence.length === 0;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
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
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {showEmptyEvidence ? (
          <DocumentsEmptyEvidenceState
            onUpload={() => setShowUploadDialog(true)}
          />
        ) : showFilteredEmpty ? (
          <DocumentsFilteredEmptyState />
        ) : (
          <EvidenceList
            evidence={filteredEvidence}
            onDelete={handleDeleteEvidence}
          />
        )}
      </div>

      {showUploadDialog && (
        <UploadEvidenceDialog
          onClose={() => setShowUploadDialog(false)}
          onUpload={handleUploadEvidence}
        />
      )}
    </div>
  );
}
