/**
 * useCases - React Query hooks for case management
 *
 * Provides hooks for fetching, creating, updating, and deleting cases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Case, CreateCaseInput, UpdateCaseInput } from '../domains/cases/entities/Case';
import { apiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

/**
 * Query key factory for cases
 */
export const caseKeys = {
  all: ['cases'] as const,
  lists: () => [...caseKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...caseKeys.lists(), filters] as const,
  details: () => [...caseKeys.all, 'detail'] as const,
  detail: (id: string) => [...caseKeys.details(), id] as const,
};

/**
 * Fetch all cases
 */
async function fetchCases(): Promise<Case[]> {
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    return [];
  }

  apiClient.setSessionId(sessionId);
  const response = await apiClient.cases.list();

  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data.items;
}

/**
 * Fetch single case by ID
 */
async function fetchCase(caseId: number): Promise<Case> {
  const sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    throw new Error('No session ID');
  }

  apiClient.setSessionId(sessionId);
  const response = await apiClient.cases.get(caseId);

  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

/**
 * Hook to fetch all cases
 */
export function useCases() {
  return useQuery({
    queryKey: caseKeys.list(),
    queryFn: fetchCases,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch a single case by ID
 */
export function useCase(caseId: number | undefined) {
  return useQuery({
    queryKey: caseKeys.detail(String(caseId)),
    queryFn: () => fetchCase(caseId!),
    enabled: !!caseId, // Only run if caseId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new case
 */
export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCaseInput) => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('No session ID');
      }

      apiClient.setSessionId(sessionId);
      const response = await apiClient.cases.create(data);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch cases list
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      logger.info('Case created successfully');
    },
    onError: (error) => {
      logger.error('Failed to create case', { error });
    },
  });
}

/**
 * Hook to update an existing case
 */
export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, data }: { caseId: number; data: UpdateCaseInput }) => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('No session ID');
      }

      apiClient.setSessionId(sessionId);
      const response = await apiClient.cases.update(caseId, data);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific case and cases list
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(String(variables.caseId)) });
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      logger.info('Case updated successfully', { caseId: variables.caseId });
    },
    onError: (error) => {
      logger.error('Failed to update case', { error });
    },
  });
}

/**
 * Hook to delete a case
 */
export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: number) => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        throw new Error('No session ID');
      }

      apiClient.setSessionId(sessionId);
      const response = await apiClient.cases.delete(caseId);

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: (_, caseId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: caseKeys.detail(String(caseId)) });
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      logger.info('Case deleted successfully', { caseId });
    },
    onError: (error) => {
      logger.error('Failed to delete case', { error });
    },
  });
}
