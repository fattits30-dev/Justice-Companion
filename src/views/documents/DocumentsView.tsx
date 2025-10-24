import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Evidence, EvidenceType } from '../../models/Evidence.ts';
import type { Case } from '../../models/Case.ts';
import { DocumentsToolbar } from './components/DocumentsToolbar.tsx';
import {
  DocumentsEmptyEvidenceState,
  DocumentsErrorState,
  DocumentsFilteredEmptyState,
  DocumentsLoadingState,
  DocumentsNoCasesState,
} from './components/DocumentsStates.tsx';
import { EvidenceList } from './components/EvidenceList.tsx';
import {
  UploadEvidenceDialog,
  type UploadEvidenceInput,
} from './components/UploadEvidenceDialog.tsx';
import { showSuccess, showError } from '../../components/ui/Toast.tsx';

type LoadState = 'idle' | 'loading' | 'error' | 'ready';

interface LightweightCase {
  id: number;
  title: string;
}

export function DocumentsView() {
  const [cases, setCases] = useState<LightweightCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [casesState, setCasesState] = useState<LoadState>('loading');
  const [casesError, setCasesError] = useState<string | null>(null);

  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceState, setEvidenceState] = useState<LoadState>('idle');
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<EvidenceType | 'all'>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const loadCases = useCallback(async () => {
    try {
      setCasesState('loading');
      setCasesError(null);
      const sessionId = getSessionId();
      const response = await window.justiceAPI.getAllCases(sessionId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load cases');
      }

      const mappedCases = (response.data as Case[]).map((caseItem) => ({
        id: caseItem.id,
        title: caseItem.title,
      }));

      setCases(mappedCases);
      setCasesState('ready');

      if (mappedCases.length > 0) {
        setSelectedCaseId(mappedCases[0].id);
      } else {
        setSelectedCaseId(null);
        setEvidence([]);
        setEvidenceState('idle');
      }
    } catch (err) {
      setCasesError(err instanceof Error ? err.message : 'Unknown error');
      setCasesState('error');
    }
  }, []);

  const loadEvidence = useCallback(async (caseId: number) => {
    try {
      setEvidenceState('loading');
      setEvidenceError(null);
      const sessionId = getSessionId();
      const response = await window.justiceAPI.getAllEvidence(caseId.toString(), sessionId);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load evidence');
      }

      setEvidence(response.data);
      setEvidenceState('ready');
    } catch (err) {
      setEvidenceError(err instanceof Error ? err.message : 'Unknown error');
      setEvidenceState('error');
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (selectedCaseId !== null) {
      loadEvidence(selectedCaseId);
    }
  }, [selectedCaseId, loadEvidence]);

  const handleUploadEvidence = useCallback(
    async (input: UploadEvidenceInput) => {
      try {
        if (selectedCaseId === null) {
          throw new Error('No case selected');
        }

        const sessionId = getSessionId();
        const response = await window.justiceAPI.uploadFile(
          selectedCaseId.toString(),
          input.file,
          sessionId
        );

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to upload evidence');
        }

        setEvidence((previous) => [response.data as Evidence, ...previous]);
        setShowUploadDialog(false);
        showSuccess(`${input.file.name} has been added to evidence`, {
          title: 'Evidence uploaded',
        });
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Unknown error', {
          title: 'Failed to upload evidence',
        });
      }
    },
    [selectedCaseId]
  );

  const handleDeleteEvidence = useCallback(async (evidenceId: number) => {
    const confirmed = confirm('Are you sure you want to delete this evidence? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      const sessionId = getSessionId();
      const response = await window.justiceAPI.deleteEvidence(evidenceId.toString(), sessionId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete evidence');
      }

      setEvidence((previous) => previous.filter((item) => item.id !== evidenceId));
      showSuccess('The evidence has been permanently removed', {
        title: 'Evidence deleted',
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unknown error', {
        title: 'Failed to delete evidence',
      });
    }
  }, []);

  const filteredEvidence = useMemo(() => {
    if (filterType === 'all') {
      return evidence;
    }
    return evidence.filter((item) => item.evidenceType === filterType);
  }, [evidence, filterType]);

  if (casesState === 'loading') {
    return <DocumentsLoadingState />;
  }

  if (casesState === 'error' && casesError) {
    return <DocumentsErrorState message={casesError} onRetry={loadCases} />;
  }

  if (cases.length === 0) {
    return <DocumentsNoCasesState onReload={loadCases} />;
  }

  if (selectedCaseId === null) {
    return <DocumentsNoCasesState onReload={loadCases} />;
  }

  if (evidenceState === 'loading') {
    return <DocumentsLoadingState />;
  }

  if (evidenceState === 'error' && evidenceError) {
    return <DocumentsErrorState message={evidenceError} onRetry={() => loadEvidence(selectedCaseId)} />;
  }

  const showFilteredEmpty = evidence.length > 0 && filteredEvidence.length === 0;
  const showEmptyEvidence = evidence.length === 0;

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <DocumentsToolbar
        cases={cases}
        selectedCaseId={selectedCaseId}
        onCaseSelect={setSelectedCaseId}
        filterType={filterType}
        onFilterChange={setFilterType}
        onUploadClick={() => setShowUploadDialog(true)}
        isUploadDisabled={selectedCaseId === null}
      />

      {showEmptyEvidence ? (
        <DocumentsEmptyEvidenceState onUpload={() => setShowUploadDialog(true)} />
      ) : showFilteredEmpty ? (
        <DocumentsFilteredEmptyState />
      ) : (
        <EvidenceList evidence={filteredEvidence} onDelete={handleDeleteEvidence} />
      )}

      {showUploadDialog && (
        <UploadEvidenceDialog
          onClose={() => setShowUploadDialog(false)}
          onUpload={handleUploadEvidence}
        />
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
