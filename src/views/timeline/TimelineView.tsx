import { logger } from "../../utils/logger.ts";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Calendar, FileSearch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { TimelineItem } from "./components/TimelineItem.tsx";
import { TimelineEmpty } from "./components/TimelineEmpty.tsx";
import { AddDeadlineDialog } from "./components/AddDeadlineDialog.tsx";
import { ExtractDatesDialog } from "./components/ExtractDatesDialog.tsx";
import { apiClient } from "../../lib/apiClient.ts";
import type {
  DeadlineWithCase,
  CreateDeadlineInput,
  UpdateDeadlineInput,
} from "../../domains/timeline/entities/Deadline.ts";

interface Case {
  id: number;
  title: string;
  status: "active" | "pending" | "closed";
}

export function TimelineView() {
  const { sessionId, isLoading: authLoading } = useAuth();
  const [deadlines, setDeadlines] = useState<DeadlineWithCase[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isExtractDialogOpen, setIsExtractDialogOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] =
    useState<DeadlineWithCase | null>(null);
  const [deletingDeadline, setDeletingDeadline] =
    useState<DeadlineWithCase | null>(null);

  // Load deadlines and cases - wrapped in useCallback to stabilize reference
  const loadData = useCallback(async () => {
    if (!sessionId) {
      setError("No active session");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load deadlines using HTTP API client
      const deadlinesResult = await apiClient.deadlines.list();
      if (!deadlinesResult.success) {
        const errorMsg =
          typeof deadlinesResult.error === "string"
            ? deadlinesResult.error
            : deadlinesResult.error?.message || "Failed to fetch deadlines";
        throw new Error(errorMsg);
      }

      // Load cases using HTTP API client
      const casesResult = await apiClient.cases.list();
      if (!casesResult.success) {
        const errorMsg =
          typeof casesResult.error === "string"
            ? casesResult.error
            : casesResult.error?.message || "Failed to fetch cases";
        throw new Error(errorMsg);
      }

      // Handle paginated vs direct array responses
      const deadlinesData =
        deadlinesResult.data && "items" in deadlinesResult.data
          ? deadlinesResult.data.items
          : deadlinesResult.data || [];

      const casesData =
        casesResult.data && "items" in casesResult.data
          ? casesResult.data.items
          : casesResult.data || [];

      // Transform Deadline[] to DeadlineWithCase[] by joining with case data
      const casesMap = new Map(casesData.map((c: any) => [c.id, c]));
      const deadlinesWithCase: DeadlineWithCase[] = deadlinesData.map(
        (deadline: any) => {
          const caseData = casesMap.get(deadline.caseId);
          return {
            ...deadline,
            caseTitle: caseData?.title || "Unknown Case",
            caseStatus: caseData?.status || "active",
          };
        },
      );

      setDeadlines(deadlinesWithCase);
      setCases(casesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [loadData, authLoading]);

  // Filter and sort deadlines
  const filteredDeadlines = useMemo(() => {
    let filtered = deadlines;

    // Filter by case if selected
    if (selectedCaseId !== null) {
      filtered = filtered.filter((d) => d.caseId === selectedCaseId);
    }

    // Sort by date ascending (soonest first)
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.deadlineDate).getTime();
      const dateB = new Date(b.deadlineDate).getTime();
      return dateA - dateB;
    });

    return filtered;
  }, [deadlines, selectedCaseId]);

  // Handlers - all wrapped in useCallback to preserve memo benefits
  const handleAddDeadline = useCallback(
    async (input: CreateDeadlineInput) => {
      if (!sessionId) {
        return { success: false, error: "No active session" };
      }

      try {
        // Use HTTP API client instead of Electron IPC
        const result = await apiClient.deadlines.create(input);

        if (result.success) {
          await loadData(); // Reload to get updated data
          return { success: true };
        }

        const errorMsg =
          typeof result.error === "string"
            ? result.error
            : result.error?.message || "Failed to create deadline";
        return { success: false, error: errorMsg };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Failed to create deadline",
        };
      }
    },
    [sessionId, loadData],
  );

  // Handler for adding deadlines from extracted dates
  const handleAddExtractedDeadline = useCallback(
    async (date: string, title: string, description: string) => {
      if (!sessionId || !selectedCaseId) {
        return;
      }

      try {
        const result = await apiClient.deadlines.create({
          caseId: selectedCaseId,
          title,
          description,
          deadlineDate: date,
          priority: "high", // Extracted deadlines are likely important
        });

        if (result.success) {
          await loadData();
        }
      } catch (err) {
        logger.error("Failed to create deadline from extracted date", {
          error: err as Error,
        });
      }
    },
    [sessionId, selectedCaseId, loadData],
  );

  const handleEditDeadline = useCallback((deadline: DeadlineWithCase) => {
    setEditingDeadline(deadline);
  }, []);

  const handleUpdateDeadline = useCallback(
    async (input: UpdateDeadlineInput) => {
      if (!editingDeadline) {
        return { success: false, error: "No deadline selected" };
      }

      if (!sessionId) {
        return { success: false, error: "No active session" };
      }

      try {
        // Use HTTP API client instead of Electron IPC
        // Transform input to match expected API types
        const apiInput = {
          ...input,
          description: input.description || undefined,
        };
        const result = await apiClient.deadlines.update(
          editingDeadline.id,
          apiInput,
        );

        if (result.success) {
          await loadData();
          setEditingDeadline(null);
          return { success: true };
        }

        const errorMsg =
          typeof result.error === "string"
            ? result.error
            : result.error?.message || "Failed to update deadline";
        return { success: false, error: errorMsg };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Failed to update deadline",
        };
      }
    },
    [editingDeadline, sessionId, loadData],
  );

  const handleCompleteDeadline = useCallback(
    async (deadline: DeadlineWithCase) => {
      if (!sessionId) {
        logger.error("No active session");
        return;
      }

      const newStatus =
        deadline.status === "completed" ? "upcoming" : "completed";

      try {
        // Use HTTP API client instead of Electron IPC
        const result = await apiClient.deadlines.update(deadline.id, {
          status: newStatus,
        });

        if (result.success) {
          await loadData();
        }
      } catch (err) {
        logger.error("Failed to update deadline status", {
          error: err as Error,
        });
      }
    },
    [sessionId, loadData],
  );

  const handleDeleteDeadline = useCallback((deadline: DeadlineWithCase) => {
    setDeletingDeadline(deadline);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingDeadline) {
      return;
    }

    if (!sessionId) {
      logger.error("No active session");
      return;
    }

    try {
      // Use HTTP API client instead of Electron IPC
      const result = await apiClient.deadlines.delete(deletingDeadline.id);

      if (result.success) {
        await loadData();
      }
    } catch (err) {
      logger.error("Failed to delete deadline", { error: err as Error });
    } finally {
      setDeletingDeadline(null);
    }
  }, [deletingDeadline, sessionId, loadData]);

  const handleCaseClick = useCallback((caseId: number) => {
    // Navigate to case detail view using existing routing
    window.location.href = `/cases/${caseId}`;
  }, []);

  // Get userId from first deadline or default to 1
  const userId = deadlines[0]?.userId || 1;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/70">Loading deadlines...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-lg">
            <p className="text-danger-400">{error}</p>
          </div>
          <Button onClick={loadData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary-400" />
              <h1 className="text-2xl font-bold text-white">
                Timeline Tracker
              </h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Case Filter */}
              <select
                value={selectedCaseId || ""}
                onChange={(e) =>
                  setSelectedCaseId(
                    e.target.value ? Number.parseInt(e.target.value, 10) : null,
                  )
                }
                className="
                  px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-white
                  focus:outline-hidden focus:ring-2 focus:ring-primary-500
                  transition-all
                "
                aria-label="Filter deadlines by case"
              >
                <option value="">All Cases</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              {/* Add Deadline Button */}
              <Button
                variant="primary"
                icon={<Plus />}
                onClick={() => setIsAddDialogOpen(true)}
              >
                Add Deadline
              </Button>

              {/* Extract from Evidence Button - only show when case selected */}
              {selectedCaseId && (
                <Button
                  variant="secondary"
                  icon={<FileSearch />}
                  onClick={() => setIsExtractDialogOpen(true)}
                >
                  Extract from Evidence
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {filteredDeadlines.length === 0 ? (
            <TimelineEmpty onAddClick={() => setIsAddDialogOpen(true)} />
          ) : (
            <motion.div layout className="space-y-0">
              <AnimatePresence>
                {filteredDeadlines.map((deadline) => (
                  <TimelineItem
                    key={deadline.id}
                    deadline={deadline}
                    onEdit={handleEditDeadline}
                    onComplete={handleCompleteDeadline}
                    onDelete={handleDeleteDeadline}
                    onCaseClick={handleCaseClick}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add Deadline Dialog */}
      <AddDeadlineDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSubmit={handleAddDeadline}
        cases={cases}
        userId={userId}
      />

      {/* Edit Deadline Dialog */}
      {editingDeadline && (
        <AddDeadlineDialog
          open={true}
          onClose={() => setEditingDeadline(null)}
          onSubmit={(input) =>
            handleUpdateDeadline({
              title: input.title,
              deadlineDate: input.deadlineDate,
              priority: input.priority,
              description: input.description || undefined,
            })
          }
          cases={cases}
          userId={userId}
          mode="edit"
          initialValues={{
            title: editingDeadline.title,
            caseId: editingDeadline.caseId,
            deadlineDate: editingDeadline.deadlineDate,
            priority: editingDeadline.priority,
            description: editingDeadline.description || undefined,
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingDeadline && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeletingDeadline(null)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-gray-900 border border-white/10 rounded-lg p-6 max-w-md w-full"
            role="dialog"
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              Delete Deadline?
            </h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete "{deletingDeadline.title}"? This
              action cannot be undone.
            </p>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeletingDeadline(null)}
                fullWidth
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} fullWidth>
                Confirm
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Extract Dates Dialog */}
      {selectedCaseId && (
        <ExtractDatesDialog
          isOpen={isExtractDialogOpen}
          onClose={() => setIsExtractDialogOpen(false)}
          caseId={selectedCaseId}
          caseTitle={cases.find((c) => c.id === selectedCaseId)?.title || ""}
          onAddDeadline={handleAddExtractedDeadline}
        />
      )}
    </div>
  );
}
