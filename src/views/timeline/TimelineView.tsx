import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { TimelineItem } from './components/TimelineItem';
import { TimelineEmpty } from './components/TimelineEmpty';
import { AddDeadlineDialog } from './components/AddDeadlineDialog';
import type { DeadlineWithCase, CreateDeadlineInput, UpdateDeadlineInput } from '../../domains/timeline/entities/Deadline';

interface Case {
  id: number;
  title: string;
  status: 'active' | 'pending' | 'closed';
}

// Helper to get session ID from localStorage
function getSessionId(): string {
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    throw new Error('No active session - please log in again');
  }
  return sessionId;
}

export function TimelineView() {
  const [deadlines, setDeadlines] = useState<DeadlineWithCase[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<DeadlineWithCase | null>(null);
  const [deletingDeadline, setDeletingDeadline] = useState<DeadlineWithCase | null>(null);

  // Load deadlines and cases - wrapped in useCallback to stabilize reference
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionId = getSessionId();

      // Load deadlines
      const deadlinesResult = await window.justiceAPI.getDeadlines(sessionId);
      if (!deadlinesResult.success) {
        const errorMsg = typeof deadlinesResult.error === 'string'
          ? deadlinesResult.error
          : deadlinesResult.error?.message || 'Failed to fetch deadlines';
        throw new Error(errorMsg);
      }

      // Load cases
      const casesResult = await window.justiceAPI.getAllCases(sessionId);
      if (!casesResult.success) {
        const errorMsg = typeof casesResult.error === 'string'
          ? casesResult.error
          : casesResult.error?.message || 'Failed to fetch cases';
        throw new Error(errorMsg);
      }

      const deadlinesData = deadlinesResult.data || [];
      const casesData = casesResult.data || [];

      // Transform Deadline[] to DeadlineWithCase[] by joining with case data
      const casesMap = new Map(casesData.map(c => [c.id, c]));
      const deadlinesWithCase: DeadlineWithCase[] = deadlinesData.map(deadline => {
        const caseData = casesMap.get(deadline.caseId);
        return {
          ...deadline,
          caseTitle: caseData?.title || 'Unknown Case',
          caseStatus: caseData?.status || 'active',
        };
      });

      setDeadlines(deadlinesWithCase);
      setCases(casesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies - uses only setState functions and getSessionId

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  const handleAddDeadline = useCallback(async (input: CreateDeadlineInput) => {
    try {
      const sessionId = getSessionId();
      const result = await window.justiceAPI.createDeadline(input, sessionId);

      if (result.success) {
        await loadData(); // Reload to get updated data
        return { success: true };
      }

      const errorMsg = typeof result.error === 'string'
        ? result.error
        : result.error?.message || 'Failed to create deadline';
      return { success: false, error: errorMsg };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create deadline',
      };
    }
  }, [loadData]);

  const handleEditDeadline = useCallback((deadline: DeadlineWithCase) => {
    setEditingDeadline(deadline);
  }, []);

  const handleUpdateDeadline = useCallback(async (input: UpdateDeadlineInput) => {
    if (!editingDeadline) {return { success: false, error: 'No deadline selected' };}

    try {
      const sessionId = getSessionId();
      const result = await window.justiceAPI.updateDeadline(
        editingDeadline.id,
        input,
        sessionId,
      );

      if (result.success) {
        await loadData();
        setEditingDeadline(null);
        return { success: true };
      }

      const errorMsg = typeof result.error === 'string'
        ? result.error
        : result.error?.message || 'Failed to update deadline';
      return { success: false, error: errorMsg };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update deadline',
      };
    }
  }, [editingDeadline, loadData]);

  const handleCompleteDeadline = useCallback(async (deadline: DeadlineWithCase) => {
    const newStatus = deadline.status === 'completed' ? 'upcoming' : 'completed';

    try {
      const sessionId = getSessionId();
      const result = await window.justiceAPI.updateDeadline(
        deadline.id,
        { status: newStatus },
        sessionId,
      );

      if (result.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to update deadline status:', err);
    }
  }, [loadData]);

  const handleDeleteDeadline = useCallback((deadline: DeadlineWithCase) => {
    setDeletingDeadline(deadline);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingDeadline) {return;}

    try {
      const sessionId = getSessionId();
      const result = await window.justiceAPI.deleteDeadline(
        deletingDeadline.id,
        sessionId,
      );

      if (result.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to delete deadline:', err);
    } finally {
      setDeletingDeadline(null);
    }
  }, [deletingDeadline, loadData]);

  const handleCaseClick = useCallback((caseId: number) => {
    // TODO: Navigate to case detail view
    console.log('Navigate to case:', caseId);
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary-400" />
              <h1 className="text-2xl font-bold text-white">Timeline Tracker</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Case Filter */}
              <select
                value={selectedCaseId || ''}
                onChange={(e) =>
                  setSelectedCaseId(e.target.value ? parseInt(e.target.value, 10) : null)
                }
                className="
                  px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-white
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  transition-all
                "
                role="combobox"
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
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pt-20">
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
              description: input.description,
            })
          }
          cases={cases}
          userId={userId}
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
              Are you sure you want to delete "{deletingDeadline.title}"? This action
              cannot be undone.
            </p>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeletingDeadline(null)}
                fullWidth
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                fullWidth
              >
                Confirm
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
