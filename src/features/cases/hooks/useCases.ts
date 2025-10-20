import { useState, useCallback, useEffect } from 'react';
import type { Case, CreateCaseInput, UpdateCaseInput } from '../../../models/Case.ts';
import type {
  IPCResponse,
  CaseCreateResponse,
  CaseGetByIdResponse,
  CaseGetAllResponse,
  CaseUpdateResponse,
  CaseDeleteResponse,
  CaseCloseResponse,
  CaseGetStatisticsResponse,
} from '../../../types/ipc.ts';

/**
 * React hook for case management operations
 * Provides type-safe access to database via IPC
 */
export function useCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all cases from database
   */
  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: IPCResponse<CaseGetAllResponse> =
        await window.justiceAPI.getAllCases();

      if (response.success) {
        setCases(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new case
   */
  const createCase = useCallback(
    async (input: CreateCaseInput): Promise<Case | null> => {
      setLoading(true);
      setError(null);

      try {
        const response: IPCResponse<CaseCreateResponse> =
          await window.justiceAPI.createCase(input);

        if (response.success) {
          // Refresh cases list
          await fetchCases();
          return response.data;
        } else {
          setError(response.error);
          return null;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to create case';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchCases],
  );

  /**
   * Get case by ID
   */
  const getCaseById = useCallback(async (id: number): Promise<Case | null> => {
    setLoading(true);
    setError(null);

    try {
      const response: IPCResponse<CaseGetByIdResponse> =
        await window.justiceAPI.getCaseById(id);

      if (response.success) {
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to get case';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update a case
   */
  const updateCase = useCallback(
    async (id: number, input: UpdateCaseInput): Promise<Case | null> => {
      setLoading(true);
      setError(null);

      try {
        const response: IPCResponse<CaseUpdateResponse> =
          await window.justiceAPI.updateCase(id, input);

        if (response.success) {
          // Refresh cases list
          await fetchCases();
          return response.data;
        } else {
          setError(response.error);
          return null;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to update case';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchCases],
  );

  /**
   * Delete a case
   */
  const deleteCase = useCallback(
    async (id: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response: IPCResponse<CaseDeleteResponse> =
          await window.justiceAPI.deleteCase(id);

        if (response.success) {
          // Refresh cases list
          await fetchCases();
          return true;
        } else {
          setError(response.error);
          return false;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to delete case';
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchCases],
  );

  /**
   * Close a case
   */
  const closeCase = useCallback(
    async (id: number): Promise<Case | null> => {
      setLoading(true);
      setError(null);

      try {
        const response: IPCResponse<CaseCloseResponse> =
          await window.justiceAPI.closeCase(id);

        if (response.success) {
          // Refresh cases list
          await fetchCases();
          return response.data;
        } else {
          setError(response.error);
          return null;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to close case';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchCases],
  );

  /**
   * Get case statistics
   */
  const getCaseStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: IPCResponse<CaseGetStatisticsResponse> =
        await window.justiceAPI.getCaseStatistics();

      if (response.success) {
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to get statistics';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch cases on mount
  useEffect(() => {
    void fetchCases();
  }, [fetchCases]);

  return {
    // State
    cases,
    loading,
    error,

    // Methods
    fetchCases,
    createCase,
    getCaseById,
    updateCase,
    deleteCase,
    closeCase,
    getCaseStatistics,
  };
}
