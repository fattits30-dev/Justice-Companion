import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Case, CaseStatus, CaseType, CreateCaseInput } from '../../models/Case.ts';
import { CaseToolbar } from './components/CaseToolbar.tsx';
import {
  CasesEmptyState,
  CasesErrorState,
  CasesFilteredEmptyState,
  CasesLoadingState,
} from './components/CaseStates.tsx';
import { CaseList } from './components/CaseList.tsx';
import { CreateCaseDialog } from './components/CreateCaseDialog.tsx';
import { showSuccess, showError } from '../../components/ui/Toast.tsx';

type LoadState = 'idle' | 'loading' | 'error' | 'ready';

export function CasesView() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<CaseStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<CaseType | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadCases = useCallback(async () => {
    try {
      setLoadState('loading');
      setError(null);

      const sessionId = getSessionId();
      const response = await window.justiceAPI.getAllCases(sessionId);

      if (response.success && response.data) {
        setCases(response.data);
        setLoadState('ready');
        return;
      }

      throw new Error(response.error || 'Failed to load cases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleCreateCase = useCallback(
    async (input: CreateCaseInput) => {
      try {
        const sessionId = getSessionId();
        const response = await window.justiceAPI.createCase(input, sessionId);

        if (response.success && response.data) {
          setCases((previous) => [response.data, ...previous]);
          setShowCreateDialog(false);
          showSuccess(`${input.title} has been added to your cases`, {
            title: 'Case created successfully',
          });
          return;
        }

        throw new Error(response.error || 'Failed to create case');
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Unknown error', {
          title: 'Failed to create case',
        });
      }
    },
    []
  );

  const handleDeleteCase = useCallback(async (caseId: number) => {
    const confirmed = confirm('Are you sure you want to delete this case? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      const sessionId = getSessionId();
      const response = await window.justiceAPI.deleteCase(caseId.toString(), sessionId);
      if (response.success) {
        setCases((previous) => previous.filter((item) => item.id !== caseId));
        showSuccess('The case has been permanently removed', {
          title: 'Case deleted',
        });
        return;
      }

      throw new Error(response.error || 'Failed to delete case');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unknown error', {
        title: 'Failed to delete case',
      });
    }
  }, []);

  const filteredCases = useMemo(() => {
    return cases.filter((caseItem) => {
      if (filterStatus !== 'all' && caseItem.status !== filterStatus) {
        return false;
      }
      if (filterType !== 'all' && caseItem.caseType !== filterType) {
        return false;
      }
      return true;
    });
  }, [cases, filterStatus, filterType]);

  if (loadState === 'loading') {
    return <CasesLoadingState />;
  }

  if (loadState === 'error' && error) {
    return <CasesErrorState message={error} onRetry={loadCases} />;
  }

  const hasCases = cases.length > 0;
  const hasFilteredResults = filteredCases.length > 0;

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <CaseToolbar
        filterStatus={filterStatus}
        filterType={filterType}
        onStatusChange={setFilterStatus}
        onTypeChange={setFilterType}
        onCreateCase={() => setShowCreateDialog(true)}
      />

      {!hasCases ? (
        <CasesEmptyState onCreateCase={() => setShowCreateDialog(true)} />
      ) : !hasFilteredResults ? (
        <CasesFilteredEmptyState />
      ) : (
        <CaseList cases={filteredCases} onDelete={handleDeleteCase} />
      )}

      {showCreateDialog && (
        <CreateCaseDialog onClose={() => setShowCreateDialog(false)} onCreate={handleCreateCase} />
      )}
    </div>
  );
}

function getSessionId(): string {
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    throw new Error('No session');
  }
  return sessionId;
}
