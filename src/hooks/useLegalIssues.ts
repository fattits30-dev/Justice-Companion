import { useState, useEffect } from 'react';
import type { LegalIssue, CreateLegalIssueInput, UpdateLegalIssueInput } from '../models/LegalIssue';

export function useLegalIssues(caseId: number) {
  const [legalIssues, setLegalIssues] = useState<LegalIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLegalIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.legalIssues.list(caseId);
      if (result.success) {
        setLegalIssues(result.data || []);
      } else {
        setError(result.error || 'Failed to load legal issues');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createLegalIssue = async (input: CreateLegalIssueInput) => {
    try {
      const result = await window.electron.legalIssues.create(input);
      if (result.success && result.data) {
        setLegalIssues((prev) => [...prev, result.data!]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create legal issue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateLegalIssue = async (id: number, input: UpdateLegalIssueInput) => {
    try {
      const result = await window.electron.legalIssues.update(id, input);
      if (result.success && result.data) {
        setLegalIssues((prev) =>
          prev.map((issue) => (issue.id === id ? result.data! : issue)),
        );
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update legal issue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteLegalIssue = async (id: number) => {
    try {
      const result = await window.electron.legalIssues.delete(id);
      if (result.success) {
        setLegalIssues((prev) => prev.filter((issue) => issue.id !== id));
      } else {
        throw new Error(result.error || 'Failed to delete legal issue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  useEffect(() => {
    void loadLegalIssues();
  }, [caseId]);

  return {
    legalIssues,
    loading,
    error,
    createLegalIssue,
    updateLegalIssue,
    deleteLegalIssue,
    refresh: loadLegalIssues,
  };
}
