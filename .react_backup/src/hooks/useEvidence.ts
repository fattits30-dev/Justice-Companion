/**
 * useEvidence - React Query hooks for evidence management
 *
 * Provides hooks for fetching, creating, updating, and deleting evidence
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Evidence, CreateEvidenceInput, UpdateEvidenceInput } from '../domains/evidence/entities/Evidence';
import { apiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

/**
 * Query key factory for evidence
 */
export const evidenceKeys = {
  all: ['evidence'] as const,
  lists: () => [...evidenceKeys.all, 'list'] as const,
  list: (caseId?: number) => [...evidenceKeys.lists(), { caseId }] as const,
  details: () => [...evidenceKeys.all, 'detail'] as const,
  detail: (id: string) => [...evidenceKeys.details(), id] as const,
};

/**
 * Fetch all evidence for a case
 */
async function fetchEvidence(caseId?: number): Promise<Evidence[]> {
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    return [];
  }

  apiClient.setSessionId(sessionId);
  const response = caseId
    ? await apiClient.evidence.list(caseId)
    : await apiClient.evidence.listAll();

  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

/**
 * Fetch single evidence by ID
 */
async function fetchSingleEvidence(evidenceId: number): Promise<Evidence> {
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    throw new Error('No session ID');
  }

  apiClient.setSessionId(sessionId);
  const response = await apiClient.evidence.get(evidenceId);

  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

/**
 * Hook to fetch all evidence (optionally filtered by case)
 */
export function useEvidence(caseId?: number) {
  return useQuery({
    queryKey: evidenceKeys.list(caseId),
    queryFn: () => fetchEvidence(caseId),
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch a single evidence item by ID
 */
export function useEvidenceItem(evidenceId: number | undefined) {
  return useQuery({
    queryKey: evidenceKeys.detail(String(evidenceId)),
    queryFn: () => fetchSingleEvidence(evidenceId!),
    enabled: !!evidenceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create new evidence
 */
export function useCreateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEvidenceInput) => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('No session ID');
      }

      apiClient.setSessionId(sessionId);
      const response = await apiClient.evidence.create(data);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate evidence list for this case
      queryClient.invalidateQueries({ queryKey: evidenceKeys.list(data.caseId) });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.lists() });
      logger.info('Evidence created successfully', { evidenceId: data.id });
    },
    onError: (error) => {
      logger.error('Failed to create evidence', { error });
    },
  });
}

/**
 * Hook to update evidence
 */
export function useUpdateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evidenceId, data }: { evidenceId: number; data: UpdateEvidenceInput }) => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('No session ID');
      }

      apiClient.setSessionId(sessionId);
      const response = await apiClient.evidence.update(evidenceId, data);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific evidence and lists
      queryClient.invalidateQueries({ queryKey: evidenceKeys.detail(String(variables.evidenceId)) });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.lists() });
      logger.info('Evidence updated successfully', { evidenceId: variables.evidenceId });
    },
    onError: (error) => {
      logger.error('Failed to update evidence', { error });
    },
  });
}

/**
 * Hook to delete evidence
 */
export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evidenceId: number) => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('No session ID');
      }

      apiClient.setSessionId(sessionId);
      const response = await apiClient.evidence.delete(evidenceId);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (_, evidenceId) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: evidenceKeys.detail(String(evidenceId)) });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.lists() });
      logger.info('Evidence deleted successfully', { evidenceId });
    },
    onError: (error) => {
      logger.error('Failed to delete evidence', { error });
    },
  });
}

/**
 * Hook to upload evidence file
 */
export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      file,
      title,
      type
    }: {
      caseId: number;
      file: File;
      title?: string;
      type?: string;
    }) => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('No session ID');
      }

      apiClient.setSessionId(sessionId);
      const response = await apiClient.evidence.upload({
        caseId,
        file,
        title: title || file.name,
        type: type || 'document',
      });

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate evidence lists
      queryClient.invalidateQueries({ queryKey: evidenceKeys.list(data.caseId) });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.lists() });
      logger.info('Evidence file uploaded successfully', { evidenceId: data.id });
    },
    onError: (error) => {
      logger.error('Failed to upload evidence file', { error });
    },
  });
}
