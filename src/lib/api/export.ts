/**
 * Export API
 */

import { ApiError, type ApiClient } from "./client.ts";

export function createExportApi(client: ApiClient) {
  return {
    /**
     * Export single case
     */
    exportCase: async (
      caseId: number,
      format: "json" | "pdf" | "docx"
    ): Promise<Blob> => {
      const sessionId = client.getSessionId();
      const response = await fetch(
        `${client.getBaseURL()}/export/case/${caseId}?format=${format}`,
        {
          headers: sessionId ? { "X-Session-Id": sessionId } : undefined,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Export failed",
          "EXPORT_ERROR",
          errorData
        );
      }

      return response.blob();
    },

    /**
     * Export single evidence item
     */
    exportEvidence: async (
      evidenceId: number,
      format: "json" | "pdf" | "docx"
    ): Promise<Blob> => {
      const sessionId = client.getSessionId();
      const response = await fetch(
        `${client.getBaseURL()}/export/evidence/${evidenceId}?format=${format}`,
        {
          headers: sessionId ? { "X-Session-Id": sessionId } : undefined,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Export failed",
          "EXPORT_ERROR",
          errorData
        );
      }

      return response.blob();
    },

    /**
     * Export search results
     */
    exportSearchResults: async (
      query: string,
      format: "json" | "csv"
    ): Promise<Blob> => {
      const sessionId = client.getSessionId();
      const response = await fetch(
        `${client.getBaseURL()}/export/search-results?query=${encodeURIComponent(query)}&format=${format}`,
        {
          headers: sessionId ? { "X-Session-Id": sessionId } : undefined,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Export failed",
          "EXPORT_ERROR",
          errorData
        );
      }

      return response.blob();
    },

    /**
     * Download blob as file
     */
    downloadBlob: (blob: Blob, filename: string): void => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}
