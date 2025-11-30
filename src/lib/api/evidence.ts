/**
 * Evidence API module.
 *
 * Provides evidence management endpoints:
 * - list: Get evidence for a case
 * - listAll: Get all evidence
 * - get: Get single evidence
 * - create: Create evidence
 * - upload: Upload evidence with file
 * - update: Update evidence
 * - delete: Delete evidence
 * - download: Download evidence file
 * - preview: Get evidence preview
 * - parse: Parse evidence content
 * - extractCitations: Extract citations
 * - runOCR: Run OCR on evidence
 * - bulkUpload: Bulk upload files
 *
 * @module api/evidence
 */

import { BaseApiClient } from "./client";
import {
  ApiResponse,
  ApiError,
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from "./types";

// ====================
// Evidence API Factory
// ====================

/**
 * Creates evidence API methods bound to a client instance.
 */
export function createEvidenceApi(client: BaseApiClient) {
  return {
    /**
     * Get all evidence for a case
     */
    list: async (caseId: number): Promise<ApiResponse<Evidence[]>> => {
      return client.get<ApiResponse<Evidence[]>>(`/cases/${caseId}/evidence`);
    },

    /**
     * Get all evidence (global list)
     */
    listAll: async (options?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResponse<Evidence[]>> => {
      return client.get<ApiResponse<Evidence[]>>(
        "/evidence",
        options as Record<string, string | number | boolean> | undefined,
      );
    },

    /**
     * Get all evidence for a case (alias for list)
     */
    listByCase: async (caseId: number): Promise<ApiResponse<Evidence[]>> => {
      return client.get<ApiResponse<Evidence[]>>(`/cases/${caseId}/evidence`);
    },

    /**
     * Get single evidence by ID
     */
    get: async (evidenceId: number): Promise<ApiResponse<Evidence>> => {
      return client.get<ApiResponse<Evidence>>(`/evidence/${evidenceId}`);
    },

    /**
     * Create new evidence
     */
    create: async (
      input: CreateEvidenceInput,
    ): Promise<ApiResponse<Evidence>> => {
      return client.post<ApiResponse<Evidence>>("/evidence", input);
    },

    /**
     * Create evidence with file upload
     */
    upload: async (input: {
      caseId: number;
      title: string;
      content?: string;
      type: string;
      file?: File;
      fileName?: string;
    }): Promise<ApiResponse<Evidence>> => {
      const formData = new FormData();

      formData.append("case_id", input.caseId.toString());
      formData.append("title", input.title);
      formData.append("type", input.type);

      if (input.content) {
        formData.append("content", input.content);
      }

      if (input.fileName) {
        formData.append("file_name", input.fileName);
      }

      if (input.file) {
        formData.append("file", input.file);
      }

      const url = new URL(`${client.getBaseURL()}/evidence/upload`);
      const headers: Record<string, string> = {};

      const sessionId = client.getSessionId();
      if (sessionId) {
        headers["Authorization"] = `Bearer ${sessionId}`;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new ApiError(
          response.status,
          responseData?.error?.message ||
            responseData?.message ||
            "Upload failed",
          responseData?.error?.code || "UPLOAD_ERROR",
          responseData?.error?.details,
        );
      }

      return responseData as ApiResponse<Evidence>;
    },

    /**
     * Update existing evidence
     */
    update: async (
      evidenceId: number,
      input: UpdateEvidenceInput,
    ): Promise<ApiResponse<Evidence>> => {
      return client.put<ApiResponse<Evidence>>(
        `/evidence/${evidenceId}`,
        input,
      );
    },

    /**
     * Delete evidence
     */
    delete: async (evidenceId: number): Promise<ApiResponse<void>> => {
      return client.delete<ApiResponse<void>>(`/evidence/${evidenceId}`);
    },

    /**
     * Download evidence file
     */
    download: async (evidenceId: number): Promise<Blob> => {
      const sessionId = client.getSessionId();
      const response = await fetch(
        `${client.getBaseURL()}/evidence/${evidenceId}/download`,
        {
          headers: sessionId
            ? { Authorization: `Bearer ${sessionId}` }
            : undefined,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.detail || errorData.message || "Download failed",
          "DOWNLOAD_ERROR",
          errorData,
        );
      }

      return response.blob();
    },

    /**
     * Get preview of evidence
     */
    preview: async (
      evidenceId: number,
    ): Promise<
      ApiResponse<{ url: string; metadata?: Record<string, unknown> }>
    > => {
      return client.get<
        ApiResponse<{ url: string; metadata?: Record<string, unknown> }>
      >(`/evidence/${evidenceId}/preview`);
    },

    /**
     * Parse evidence content
     */
    parse: async (
      evidenceId: number,
    ): Promise<ApiResponse<{ content: string; metadata?: unknown }>> => {
      return client.post<ApiResponse<{ content: string; metadata?: unknown }>>(
        `/evidence/${evidenceId}/parse`,
        {},
      );
    },

    /**
     * Extract citations from evidence
     */
    extractCitations: async (
      evidenceId: number,
    ): Promise<ApiResponse<unknown[]>> => {
      return client.post<ApiResponse<unknown[]>>(
        `/evidence/${evidenceId}/citations`,
        {},
      );
    },

    /**
     * Run OCR on evidence
     */
    runOCR: async (
      evidenceId: number,
      options?: { language?: string },
    ): Promise<ApiResponse<{ text: string; confidence?: number }>> => {
      const params: Record<string, string> = {};
      if (options?.language) {
        params.language = options.language;
      }

      return client.post<ApiResponse<{ text: string; confidence?: number }>>(
        `/evidence/${evidenceId}/ocr`,
        params,
      );
    },

    /**
     * Bulk upload multiple evidence files
     */
    bulkUpload: async (
      files: Array<{
        file: File;
        caseId: number;
        title?: string;
        type?: string;
      }>,
    ): Promise<ApiResponse<Evidence[]>> => {
      const formData = new FormData();

      files.forEach((item, index) => {
        formData.append(`files[${index}]`, item.file);
        formData.append(`case_ids[${index}]`, item.caseId.toString());
        if (item.title) {
          formData.append(`titles[${index}]`, item.title);
        }
        if (item.type) {
          formData.append(`types[${index}]`, item.type);
        }
      });

      const url = new URL(`${client.getBaseURL()}/evidence/bulk-upload`);
      const headers: Record<string, string> = {};

      const sessionId = client.getSessionId();
      if (sessionId) {
        headers["Authorization"] = `Bearer ${sessionId}`;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
        signal: AbortSignal.timeout(60000),
      });

      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new ApiError(
          response.status,
          responseData?.error?.message ||
            responseData?.message ||
            "Bulk upload failed",
          responseData?.error?.code || "BULK_UPLOAD_ERROR",
          responseData?.error?.details,
        );
      }

      return responseData as ApiResponse<Evidence[]>;
    },
  };
}

export type EvidenceApi = ReturnType<typeof createEvidenceApi>;
