/**
 * CasesView Component - HTTP API Migration
 *
 * Migrated from Electron IPC to HTTP REST API.
 * All case management operations now use apiClient instead of window.justiceAPI.
 *
 * Changes:
 * - Replace window.justiceAPI.getAllCases() with apiClient.cases.list()
 * - Replace window.justiceAPI.createCase() with apiClient.cases.create()
 * - Replace window.justiceAPI.deleteCase() with apiClient.cases.delete()
 * - Add proper HTTP error handling
 * - Maintain same UI/UX and loading states
 *
 * @module CasesView
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Case,
  CaseStatus,
  CaseType,
  CreateCaseInput,
} from "../../domains/cases/entities/Case.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
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
import { apiClient, ApiError } from "../../lib/apiClient.ts";

type LoadState = "idle" | "loading" | "error" | "ready";

export function CasesView() {
  const { sessionId, isLoading: authLoading } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<CaseStatus | "all">("all");
  const [filterType, setFilterType] = useState<CaseType | "all">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  /**
   * Load cases from HTTP API
   */
  const loadCases = useCallback(async () => {
    if (!sessionId) {
      setError("No active session");
      setLoadState("error");
      return;
    }

    try {
      setLoadState("loading");
      setError(null);

      // Set session ID for authenticated requests
      apiClient.setSessionId(sessionId);

      // Call HTTP API instead of IPC
      const response = await apiClient.cases.list();

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to load cases");
      }

      // Handle paginated response
      if (response.data) {
        const { items } = response.data;
        setCases(items);
        setLoadState("ready");
      }
    } catch (err) {
      // Handle HTTP errors
      if (err instanceof ApiError) {
        if (err.isStatus(403)) {
          setError("Access denied. Please check your permissions.");
        } else if (err.isStatus(401)) {
          setError("Session expired. Please log in again.");
        } else if (err.isStatus(404)) {
          setError(
            "API endpoint not found. Please check server configuration.",
          );
        } else if (err.status >= 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(err.message || "Failed to load cases");
        }
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
      setLoadState("error");
    }
  }, [sessionId]);

  /**
   * Load cases on mount and when auth state changes
   */
  useEffect(() => {
    if (!authLoading) {
      loadCases();
    }
  }, [loadCases, authLoading]);

  /**
   * Create new case via HTTP API
   */
  const handleCreateCase = useCallback(
    async (input: CreateCaseInput) => {
      if (!sessionId) {
        showError("No active session", { title: "Failed to create case" });
        return;
      }

      try {
        // Set session ID for authenticated requests
        apiClient.setSessionId(sessionId);

        // Call HTTP API instead of IPC
        const response = await apiClient.cases.create(input);

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
        // Handle HTTP errors
        if (err instanceof ApiError) {
          if (err.isStatus(400)) {
            showError("Invalid case data. Please check your inputs.", {
              title: "Validation error",
            });
          } else if (err.isStatus(403)) {
            showError("You don't have permission to create cases.", {
              title: "Access denied",
            });
          } else if (err.isStatus(409)) {
            showError("A case with this title already exists.", {
              title: "Duplicate case",
            });
          } else {
            showError(err.message, { title: "Failed to create case" });
          }
        } else {
          showError(err instanceof Error ? err.message : "Unknown error", {
            title: "Failed to create case",
          });
        }
      }
    },
    [sessionId],
  );

  /**
   * Delete case via HTTP API
   */
  const handleDeleteCase = useCallback(
    async (caseId: number) => {
      if (!sessionId) {
        showError("No active session", { title: "Failed to delete case" });
        return;
      }

      // Show confirmation dialog
      const confirmed = confirm(
        "Are you sure you want to delete this case? This cannot be undone.",
      );
      if (!confirmed) {
        return;
      }

      try {
        // Set session ID for authenticated requests
        apiClient.setSessionId(sessionId);

        // Call HTTP API instead of IPC
        const response = await apiClient.cases.delete(caseId);

        if (response.success) {
          // Remove case from local state
          setCases((previous) => previous.filter((item) => item.id !== caseId));
          showSuccess("The case has been permanently removed", {
            title: "Case deleted",
          });
          return;
        }

        throw new Error(response.error?.message || "Failed to delete case");
      } catch (err) {
        // Handle HTTP errors
        if (err instanceof ApiError) {
          if (err.isStatus(404)) {
            showError("Case not found. It may have been already deleted.", {
              title: "Case not found",
            });
          } else if (err.isStatus(403)) {
            showError("You don't have permission to delete this case.", {
              title: "Access denied",
            });
          } else if (err.isStatus(409)) {
            showError(
              "Cannot delete case with associated evidence. Please delete evidence first.",
              { title: "Conflict" },
            );
          } else {
            showError(err.message, { title: "Failed to delete case" });
          }
        } else {
          showError(err instanceof Error ? err.message : "Unknown error", {
            title: "Failed to delete case",
          });
        }
      }
    },
    [sessionId],
  );

  /**
   * Filter cases by status and type
   */
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

  // Loading state
  if (loadState === "loading") {
    return <CasesLoadingState />;
  }

  // Error state
  if (loadState === "error" && error) {
    return <CasesErrorState message={error} onRetry={loadCases} />;
  }

  const hasCases = cases.length > 0;
  const hasFilteredResults = filteredCases.length > 0;

  return (
    <div className="h-full flex flex-col bg-linear-to-br from-gray-900 via-primary-900 to-gray-900">
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
              <CaseList cases={filteredCases} onDelete={handleDeleteCase} />
            )}
          </>
        )}
      </div>

      {/* Create Case Dialog */}
      {showCreateDialog && (
        <CreateCaseDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreateCase}
        />
      )}
    </div>
  );
}
