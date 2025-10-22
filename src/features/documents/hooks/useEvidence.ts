import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.tsx';
import type { Evidence, CreateEvidenceInput, UpdateEvidenceInput } from '@/models/Evidence';

/**
 * React hook for evidence management operations
 * Provides type-safe access to evidence database via IPC
 */
export function useEvidence() {
  const { sessionId } = useAuth();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all evidence from database
   */
  const fetchEvidence = useCallback(async (evidenceType?: string) => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await window.justiceAPI.getAllEvidence(evidenceType, sessionId);

      if (response.success) {
        setEvidence(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch evidence');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  /**
   * Create new evidence
   */
  const createEvidence = useCallback(
    async (input: CreateEvidenceInput): Promise<Evidence | null> => {
      if (!sessionId) {
        setError('No active session');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await window.justiceAPI.createEvidence(input, sessionId);

        if (response.success) {
          // Refresh evidence list
          await fetchEvidence();
          return response.data;
        } else {
          setError(response.error);
          return null;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to create evidence';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sessionId, fetchEvidence],
  );

  /**
   * Get evidence by ID
   */
  const getEvidenceById = useCallback(async (id: number): Promise<Evidence | null> => {
    if (!sessionId) {
      setError('No active session');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await window.justiceAPI.getEvidenceById(id, sessionId);

      if (response.success) {
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to get evidence';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  /**
   * Get evidence by case ID
   */
  const getEvidenceByCaseId = useCallback(async (caseId: number): Promise<Evidence[]> => {
    if (!sessionId) {
      setError('No active session');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await window.justiceAPI.getEvidenceByCaseId(caseId, sessionId);

      if (response.success) {
        return response.data;
      } else {
        setError(response.error);
        return [];
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to get evidence by case';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  /**
   * Update evidence
   */
  const updateEvidence = useCallback(
    async (id: number, input: UpdateEvidenceInput): Promise<Evidence | null> => {
      if (!sessionId) {
        setError('No active session');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await window.justiceAPI.updateEvidence(id, input, sessionId);

        if (response.success) {
          // Refresh evidence list
          await fetchEvidence();
          return response.data;
        } else {
          setError(response.error);
          return null;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to update evidence';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sessionId, fetchEvidence],
  );

  /**
   * Delete evidence
   */
  const deleteEvidence = useCallback(
    async (id: number): Promise<boolean> => {
      if (!sessionId) {
        setError('No active session');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await window.justiceAPI.deleteEvidence(id, sessionId);

        if (response.success) {
          // Refresh evidence list
          await fetchEvidence();
          return true;
        } else {
          setError(response.error);
          return false;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to delete evidence';
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [sessionId, fetchEvidence],
  );

  // Fetch evidence on mount
  useEffect(() => {
    void fetchEvidence();
  }, [fetchEvidence]);

  return {
    // State
    evidence,
    loading,
    error,

    // Methods
    fetchEvidence,
    createEvidence,
    getEvidenceById,
    getEvidenceByCaseId,
    updateEvidence,
    deleteEvidence,
  };
}
