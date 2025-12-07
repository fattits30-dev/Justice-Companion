import type {
  CreateEvidenceInput,
  Evidence,
  UpdateEvidenceInput,
} from "../../domains/evidence/entities/Evidence.ts";
import { ApiError, type ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createEvidenceApi(client: ApiClient) {
  return {
    list: async (caseId: number): Promise<ApiResponse<Evidence[]>> => {
      return client.get<ApiResponse<Evidence[]>>(`/evidence/case/${caseId}`);
    },

    listAll: async (options?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResponse<Evidence[]>> => {
      return client.get<ApiResponse<Evidence[]>>("/evidence", options);
    },

    listByCase: async (caseId: number): Promise<ApiResponse<Evidence[]>> => {
      return client.get<ApiResponse<Evidence[]>>(`/evidence/case/${caseId}`);
    },

    get: async (evidenceId: number): Promise<ApiResponse<Evidence>> => {
      return client.get<ApiResponse<Evidence>>(`/evidence/${evidenceId}`);
    },

    create: async (
      input: CreateEvidenceInput
    ): Promise<ApiResponse<Evidence>> => {
      return client.post<ApiResponse<Evidence>>("/evidence", input);
    },

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
        signal: AbortSignal.timeout(client.getTimeout()),
      });

      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new ApiError(
          response.status,
          (responseData as any)?.error?.message ||
            (responseData as any)?.message ||
            "Upload failed",
          (responseData as any)?.error?.code || "UPLOAD_ERROR",
          (responseData as any)?.error?.details
        );
      }

      return responseData as ApiResponse<Evidence>;
    },

    update: async (
      evidenceId: number,
      input: UpdateEvidenceInput
    ): Promise<ApiResponse<Evidence>> => {
      return client.put<ApiResponse<Evidence>>(
        `/evidence/${evidenceId}`,
        input
      );
    },

    delete: async (evidenceId: number): Promise<ApiResponse<void>> => {
      return client.delete<ApiResponse<void>>(`/evidence/${evidenceId}`);
    },

    download: async (evidenceId: number): Promise<Blob> => {
      const response = await fetch(
        `${client.getBaseURL()}/evidence/${evidenceId}/download`,
        {
          headers: client.getSessionId()
            ? { Authorization: `Bearer ${client.getSessionId()}` }
            : undefined,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          (errorData as any).detail ||
            (errorData as any).message ||
            "Download failed",
          "DOWNLOAD_ERROR",
          errorData
        );
      }

      return response.blob();
    },

    preview: async (
      evidenceId: number
    ): Promise<
      ApiResponse<{ url: string; metadata?: Record<string, unknown> }>
    > => {
      return client.get<
        ApiResponse<{ url: string; metadata?: Record<string, unknown> }>
      >(`/evidence/${evidenceId}/preview`);
    },

    parse: async (
      evidenceId: number
    ): Promise<ApiResponse<{ content: string; metadata?: any }>> => {
      return client.post<ApiResponse<{ content: string; metadata?: any }>>(
        `/evidence/${evidenceId}/parse`,
        {}
      );
    },

    extractCitations: async (
      evidenceId: number
    ): Promise<ApiResponse<any[]>> => {
      return client.post<ApiResponse<any[]>>(
        `/evidence/${evidenceId}/citations`,
        {}
      );
    },

    runOCR: async (
      evidenceId: number,
      options?: { language?: string }
    ): Promise<ApiResponse<{ text: string; confidence?: number }>> => {
      const params: Record<string, string> = {};
      if (options?.language) {
        params.language = options.language;
      }

      return client.post<ApiResponse<{ text: string; confidence?: number }>>(
        `/evidence/${evidenceId}/ocr`,
        params
      );
    },

    bulkUpload: async (
      files: Array<{
        file: File;
        caseId: number;
        title?: string;
        type?: string;
      }>
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
        signal: AbortSignal.timeout(client.getTimeout() * 2),
      });

      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new ApiError(
          response.status,
          (responseData as any)?.error?.message ||
            (responseData as any)?.message ||
            "Bulk upload failed",
          (responseData as any)?.error?.code || "BULK_UPLOAD_ERROR",
          (responseData as any)?.error?.details
        );
      }

      return responseData as ApiResponse<Evidence[]>;
    },
  };
}
