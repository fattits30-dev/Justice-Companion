import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Case,
  CaseStatus,
  CaseType,
  CreateCaseInput,
} from "../../domains/cases/entities/Case.ts";
import { useAppContext } from "../../hooks/useAppContext.ts";
import { CaseToolbar } from "./components/CaseToolbar.tsx";
import {
  CasesEmptyState,
  CasesErrorState,
  CasesFilteredEmptyState,
  CasesLoadingState,
} from "./components/CaseStates.tsx";
import { CaseList } from "./components/CaseList.tsx";
import { CreateCaseDialog } from "./components/CreateCaseDialog.tsx";
import { CaseSummaryCards } from "./components/CaseSummaryCards.tsx";
import { showSuccess, showError } from "../../components/ui/Toast.tsx";

type LoadState = "idle" | "loading" | "error" | "ready";

export function CasesView() {
  const { auth, api } = useAppContext();
  const { sessionId, isLoading: authLoading } = auth;
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<CaseStatus | "all">("all");
  const [filterType, setFilterType] = useState<CaseType | "all">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadCases = useCallback(async () => {
    const currentSessionId = sessionId;
    if (!currentSessionId) {
      setError("No active session");
      setLoadState("error");
      return;
    }

    try {
      setLoadState("loading");
      setError(null);

      // Use mode-aware API client
      const response = await api.cases.list();

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to load cases");
      }

      if (response.data && "items" in response.data) {
        // Handle paginated response
        setCases(response.data.items);
        setLoadState("ready");
      } else if (response.data) {
        // Handle direct array response
        setCases(response.data as Case[]);
        setLoadState("ready");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoadState("error");
    }
  }, [sessionId, api]);

  useEffect(() => {
    let mounted = true;

    const fetchCases = async () => {
      if (!sessionId || authLoading) {
        return;
      }

      try {
        setLoadState("loading");
        setError(null);

        const response = await api.cases.list();

        if (!mounted) {
          return;
        }

        if (!response.success) {
          throw new Error(response.error?.message || "Failed to load cases");
        }

        if (response.data && "items" in response.data) {
          setCases(response.data.items);
          setLoadState("ready");
        } else if (response.data) {
          setCases(response.data as Case[]);
          setLoadState("ready");
        }
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoadState("error");
      }
    };

    fetchCases();

    return () => {
      mounted = false;
    };
  }, [sessionId, authLoading, api]);

  const handleCreateCase = useCallback(
    async (input: CreateCaseInput) => {
      if (!sessionId) {
        showError("No active session", { title: "Failed to create case" });
        return;
      }

      try {
        // Use mode-aware API client
        const response = await api.cases.create(input);

        if (!response.success) {
          throw new Error(response.error?.message || "Failed to create case");
        }

        if (response.data) {
          const newCase = response.data;
          setCases((previous) => [newCase, ...previous]);
          setShowCreateDialog(false);
          showSuccess(`${input.title} has been added to your cases`, {
            title: "Case created successfully",
          });
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Unknown error", {
          title: "Failed to create case",
        });
      }
    },
    [sessionId, api],
  );

  const handleDeleteCase = useCallback(
    async (caseId: number) => {
      if (!sessionId) {
        showError("No active session", { title: "Failed to delete case" });
        return;
      }

      const confirmed = confirm(
        "Are you sure you want to delete this case? This cannot be undone.",
      );
      if (!confirmed) {
        return;
      }

      try {
        // Use mode-aware API client
        const response = await api.cases.delete(caseId);
        if (response.success) {
          setCases((previous) => previous.filter((item) => item.id !== caseId));
          showSuccess("The case has been permanently removed", {
            title: "Case deleted",
          });
          return;
        }

        throw new Error(response.error?.message || "Failed to delete case");
      } catch (err) {
        showError(err instanceof Error ? err.message : "Unknown error", {
          title: "Failed to delete case",
        });
      }
    },
    [sessionId, api],
  );

  const handleViewCase = useCallback(
    (caseId: number) => {
      navigate(`/cases/${caseId}`);
    },
    [navigate],
  );

  const filteredCases = useMemo(() => {
    return cases.filter((caseItem) => {
      if (filterStatus !== "all" && caseItem.status !== filterStatus) {
        return false;
      }
      if (filterType !== "all" && caseItem.caseType !== filterType) {
        return false;
      }
      return true;
    });
  }, [cases, filterStatus, filterType]);

  if (loadState === "loading") {
    return <CasesLoadingState />;
  }

  if (loadState === "error" && error) {
    return <CasesErrorState message={error} onRetry={loadCases} />;
  }

  const hasCases = cases.length > 0;
  const hasFilteredResults = filteredCases.length > 0;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
      {/* Sticky Header with Toolbar */}
      <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="px-8 py-6">
          <CaseToolbar
            filterStatus={filterStatus}
            filterType={filterType}
            onStatusChange={setFilterStatus}
            onTypeChange={setFilterType}
            onCreateCase={() => setShowCreateDialog(true)}
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {!hasCases ? (
          <CasesEmptyState onCreateCase={() => setShowCreateDialog(true)} />
        ) : (
          <>
            {/* Summary Statistics Cards */}
            <CaseSummaryCards cases={cases} />

            {/* Case List or Filtered Empty State */}
            {!hasFilteredResults ? (
              <CasesFilteredEmptyState />
            ) : (
              <CaseList
                cases={filteredCases}
                onDelete={handleDeleteCase}
                onView={handleViewCase}
              />
            )}
          </>
        )}
      </div>

      {showCreateDialog && (
        <CreateCaseDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreateCase}
        />
      )}
    </div>
  );
}
