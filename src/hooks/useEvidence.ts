import { useState, useCallback, useEffect } from 'react';
import type { Evidence, CreateEvidenceInput, UpdateEvidenceInput } from '../models/Evidence';
import type {
  IPCResponse,
  EvidenceCreateResponse,
  EvidenceGetByIdResponse,
  EvidenceGetAllResponse,
  EvidenceGetByCaseResponse,
  EvidenceUpdateResponse,
  EvidenceDeleteResponse,
} from '../types/ipc';

/**
 * React hook for evidence management operations
 * Provides type-safe access to evidence database via IPC
 */
export function useEvidence() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all evidence from database
   */
  const fetchEvidence = useCallback(async (evidenceType?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response: IPCResponse<EvidenceGetAllResponse> =
        await window.justiceAPI.getAllEvidence(evidenceType);

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
  }, []);

  /**
   * Create new evidence
   */
  const createEvidence = useCallback(
    async (input: CreateEvidenceInput): Promise<Evidence | null> => {
      setLoading(true);
      setError(null);

      try {
        const response: IPCResponse<EvidenceCreateResponse> =
          await window.justiceAPI.createEvidence(input);

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
    [fetchEvidence],
  );

  /**
   * Get evidence by ID
   */
  const getEvidenceById = useCallback(async (id: number): Promise<Evidence | null> => {
    setLoading(true);
    setError(null);

    try {
      const response: IPCResponse<EvidenceGetByIdResponse> =
        await window.justiceAPI.getEvidenceById(id);

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
  }, []);

  /**
   * Get evidence by case ID
   */
  const getEvidenceByCaseId = useCallback(async (caseId: number): Promise<Evidence[]> => {
    setLoading(true);
    setError(null);

    try {
      const response: IPCResponse<EvidenceGetByCaseResponse> =
        await window.justiceAPI.getEvidenceByCaseId(caseId);

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
  }, []);

  /**
   * Update evidence
   */
  const updateEvidence = useCallback(
    async (id: number, input: UpdateEvidenceInput): Promise<Evidence | null> => {
      setLoading(true);
      setError(null);

      try {
        const response: IPCResponse<EvidenceUpdateResponse> =
          await window.justiceAPI.updateEvidence(id, input);

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
    [fetchEvidence],
  );

  /**
   * Delete evidence
   */
  const deleteEvidence = useCallback(
    async (id: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response: IPCResponse<EvidenceDeleteResponse> =
          await window.justiceAPI.deleteEvidence(id);

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
    [fetchEvidence],
  );

  // Fetch evidence on mount
  useEffect(() => {
    fetchEvidence();
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
