import { useState, useEffect } from 'react';
import type { UserFact, CreateUserFactInput, UpdateUserFactInput } from '../models/UserFact';

export function useUserFacts(caseId: number) {
  const [userFacts, setUserFacts] = useState<UserFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserFacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.userFacts.list(caseId);
      if (result.success) {
        setUserFacts(result.data || []);
      } else {
        setError(result.error || 'Failed to load user facts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadFactsByType = async (factType: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.userFacts.listByType(caseId, factType);
      if (result.success) {
        setUserFacts(result.data || []);
      } else {
        setError(result.error || 'Failed to load user facts by type');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createUserFact = async (input: CreateUserFactInput) => {
    try {
      const result = await window.electron.userFacts.create(input);
      if (result.success && result.data) {
        setUserFacts((prev) => [...prev, result.data!]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create user fact');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateUserFact = async (id: number, input: UpdateUserFactInput) => {
    try {
      const result = await window.electron.userFacts.update(id, input);
      if (result.success && result.data) {
        setUserFacts((prev) =>
          prev.map((fact) => (fact.id === id ? result.data! : fact)),
        );
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update user fact');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteUserFact = async (id: number) => {
    try {
      const result = await window.electron.userFacts.delete(id);
      if (result.success) {
        setUserFacts((prev) => prev.filter((fact) => fact.id !== id));
      } else {
        throw new Error(result.error || 'Failed to delete user fact');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  useEffect(() => {
    void loadUserFacts();
  }, [caseId]);

  return {
    userFacts,
    loading,
    error,
    createUserFact,
    updateUserFact,
    deleteUserFact,
    loadFactsByType,
    refresh: loadUserFacts,
  };
}
