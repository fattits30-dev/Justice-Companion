import { useState, useEffect } from 'react';
import type { CaseFact, CreateCaseFactInput, UpdateCaseFactInput } from '../models/CaseFact';

export function useCaseFacts(caseId: number) {
  const [caseFacts, setCaseFacts] = useState<CaseFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCaseFacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.caseFacts.list(caseId);
      if (result.success) {
        setCaseFacts(result.data || []);
      } else {
        setError(result.error || 'Failed to load case facts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadFactsByCategory = async (factCategory: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.caseFacts.listByCategory(caseId, factCategory);
      if (result.success) {
        setCaseFacts(result.data || []);
      } else {
        setError(result.error || 'Failed to load case facts by category');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadFactsByImportance = async (importance: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.caseFacts.listByImportance(caseId, importance);
      if (result.success) {
        setCaseFacts(result.data || []);
      } else {
        setError(result.error || 'Failed to load case facts by importance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createCaseFact = async (input: CreateCaseFactInput) => {
    try {
      const result = await window.electron.caseFacts.create(input);
      if (result.success && result.data) {
        setCaseFacts((prev) => [...prev, result.data!]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create case fact');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateCaseFact = async (id: number, input: UpdateCaseFactInput) => {
    try {
      const result = await window.electron.caseFacts.update(id, input);
      if (result.success && result.data) {
        setCaseFacts((prev) =>
          prev.map((fact) => (fact.id === id ? result.data! : fact)),
        );
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update case fact');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteCaseFact = async (id: number) => {
    try {
      const result = await window.electron.caseFacts.delete(id);
      if (result.success) {
        setCaseFacts((prev) => prev.filter((fact) => fact.id !== id));
      } else {
        throw new Error(result.error || 'Failed to delete case fact');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  useEffect(() => {
    void loadCaseFacts();
  }, [caseId]);

  return {
    caseFacts,
    loading,
    error,
    createCaseFact,
    updateCaseFact,
    deleteCaseFact,
    loadFactsByCategory,
    loadFactsByImportance,
    refresh: loadCaseFacts,
  };
}
