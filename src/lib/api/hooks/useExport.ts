/**
 * React Query hooks for Export API.
 *
 * @module api/hooks/useExport
 */

import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "../index";

// ====================
// Mutation Hooks
// ====================

/**
 * Hook to export a case to various formats
 */
export function useExportCase(
  mutationOptions?: UseMutationOptions<
    Blob,
    Error,
    { caseId: number; format: "json" | "pdf" | "docx" }
  >,
) {
  return useMutation({
    mutationFn: ({ caseId, format }) =>
      apiClient.export.exportCase(caseId, format),
    ...mutationOptions,
  });
}

/**
 * Hook to export evidence to various formats
 */
export function useExportEvidence(
  mutationOptions?: UseMutationOptions<
    Blob,
    Error,
    { evidenceId: number; format: "json" | "pdf" | "docx" }
  >,
) {
  return useMutation({
    mutationFn: ({ evidenceId, format }) =>
      apiClient.export.exportEvidence(evidenceId, format),
    ...mutationOptions,
  });
}

/**
 * Hook to export search results
 */
export function useExportSearchResults(
  mutationOptions?: UseMutationOptions<
    Blob,
    Error,
    { query: string; format: "json" | "csv" }
  >,
) {
  return useMutation({
    mutationFn: ({ query, format }) =>
      apiClient.export.exportSearchResults(query, format),
    ...mutationOptions,
  });
}

/**
 * Helper hook to download an exported blob
 */
export function useDownloadExport() {
  return {
    download: (blob: Blob, filename: string) => {
      apiClient.export.downloadBlob(blob, filename);
    },
  };
}
