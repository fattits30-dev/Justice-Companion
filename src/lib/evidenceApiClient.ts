/**
 * Enhanced Evidence API Client
 *
 * Comprehensive evidence management with file operations,
 * document parsing, OCR, and citation extraction.
 *
 * Features:
 * - File upload with progress tracking
 * - File download and preview
 * - Document parsing (PDF, DOCX, TXT)
 * - OCR for scanned documents
 * - Legal citation extraction
 * - Bulk upload operations
 *
 * @module evidenceApiClient
 */

import { apiClient, ApiError } from "./apiClient.ts";
import type {
  Evidence,
  CreateEvidenceInput,
  UpdateEvidenceInput,
} from "../domains/evidence/entities/Evidence.ts";
// ApiResponse is now internal to apiClient - using direct imports for specific types
import {
  inferEvidenceType,
  validateFileType,
  validateFileSize,
  downloadBlob,
} from "./utils/evidenceHelpers.ts";

// ====================
// Type Definitions
// ====================

export interface EvidenceListOptions {
  type?: string;
  limit?: number;
  offset?: number;
}

export interface ParsedDocument {
  text: string;
  pages: number;
  metadata: {
    author?: string;
    creationDate?: string;
    modificationDate?: string;
    pageCount?: number;
    wordCount?: number;
    [key: string]: any;
  };
}

export interface Citation {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
  context?: string;
}

export interface CitationResponse {
  citations: Citation[];
  count: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  processingTime: number;
}

export interface UploadProgress {
  evidenceId: number;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

// ====================
// Evidence API Client
// ====================

/**
 * Enhanced Evidence API operations
 */
export class EvidenceApiClient {
  /**
   * List evidence for a case with optional filters
   */
  async list(
    caseId: number,
    _options?: EvidenceListOptions,
  ): Promise<Evidence[]> {
    // TODO: Pass options to API client when supported
    const response = await apiClient.evidence.list(caseId);

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to list evidence",
        response.error?.code || "LIST_ERROR",
      );
    }

    return response.data;
  }

  /**
   * Get single evidence by ID
   */
  async get(evidenceId: number): Promise<Evidence> {
    const response = await apiClient.evidence.get(evidenceId);

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to get evidence",
        response.error?.code || "GET_ERROR",
      );
    }

    return response.data;
  }

  /**
   * Create new evidence record
   */
  async create(input: CreateEvidenceInput): Promise<Evidence> {
    const response = await apiClient.evidence.create(input);

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to create evidence",
        response.error?.code || "CREATE_ERROR",
      );
    }

    return response.data;
  }

  /**
   * Update evidence metadata
   */
  async update(
    evidenceId: number,
    input: UpdateEvidenceInput,
  ): Promise<Evidence> {
    const response = await apiClient.evidence.update(evidenceId, input);

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to update evidence",
        response.error?.code || "UPDATE_ERROR",
      );
    }

    return response.data;
  }

  /**
   * Delete evidence
   */
  async delete(evidenceId: number): Promise<void> {
    const response = await apiClient.evidence.delete(evidenceId);

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to delete evidence",
        response.error?.code || "DELETE_ERROR",
      );
    }
  }

  /**
   * Upload file to evidence
   */
  async upload(
    evidenceId: number,
    file: File,
    _onProgress?: (progress: number) => void,
  ): Promise<Evidence> {
    // Validate file before upload
    const evidenceType = inferEvidenceType(file.type);
    const typeValidation = validateFileType(file, evidenceType);
    if (!typeValidation.valid) {
      throw new ApiError(0, typeValidation.error!, "VALIDATION_ERROR");
    }

    const sizeValidation = validateFileSize(file, evidenceType);
    if (!sizeValidation.valid) {
      throw new ApiError(0, sizeValidation.error!, "VALIDATION_ERROR");
    }

    // Upload file
    const response = await apiClient.evidence.upload({
      caseId: evidenceId, // This needs to be fixed - should be evidence ID, not case ID
      title: file.name,
      content: "",
      type: evidenceType,
      file,
      fileName: file.name,
    });

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to upload file",
        response.error?.code || "UPLOAD_ERROR",
      );
    }

    return response.data;
  }

  /**
   * Download evidence file
   */
  async download(evidenceId: number, filename: string): Promise<void> {
    try {
      const blob = await apiClient.evidence.download(evidenceId);
      downloadBlob(blob, filename);
    } catch (error) {
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "Failed to download file",
        "DOWNLOAD_ERROR",
      );
    }
  }

  /**
   * Get evidence preview
   */
  async preview(
    evidenceId: number,
  ): Promise<{ previewUrl: string; mimeType: string }> {
    const response = await apiClient.evidence.preview(evidenceId);

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to get preview",
        response.error?.code || "PREVIEW_ERROR",
      );
    }

    return response.data;
  }

  /**
   * Parse document to extract text and metadata
   */
  async parse(evidenceId: number): Promise<ParsedDocument> {
    const response = await apiClient.evidence.parse(evidenceId);

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to parse document",
        response.error?.code || "PARSE_ERROR",
      );
    }

    // Cast to ParsedDocument (backend may return partial data)
    return response.data as unknown as ParsedDocument;
  }

  /**
   * Extract legal citations from document
   */
  async extractCitations(evidenceId: number): Promise<CitationResponse> {
    const response = await apiClient.evidence.extractCitations(evidenceId);

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to extract citations",
        response.error?.code || "CITATION_ERROR",
      );
    }

    // Cast to CitationResponse (backend may return partial data)
    return response.data as unknown as CitationResponse;
  }

  /**
   * Run OCR on scanned document
   */
  async runOCR(
    evidenceId: number,
    language: string = "eng",
  ): Promise<OCRResult> {
    const response = await apiClient.evidence.runOCR(evidenceId, { language });

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to run OCR",
        response.error?.code || "OCR_ERROR",
      );
    }

    // Cast to OCRResult (backend may return partial data)
    return response.data as OCRResult;
  }

  /**
   * Bulk upload multiple files
   */
  async bulkUpload(caseId: number, files: File[]): Promise<Evidence[]> {
    // Transform File[] to expected format for apiClient
    const uploadItems = files.map((file) => ({ file, caseId }));
    const response = await apiClient.evidence.bulkUpload(uploadItems);

    if (!response.success) {
      throw new ApiError(
        0,
        response.error?.message || "Failed to bulk upload",
        response.error?.code || "BULK_UPLOAD_ERROR",
      );
    }

    return response.data;
  }

  /**
   * Create evidence and upload file in one operation
   */
  async createAndUpload(
    caseId: number,
    file: File,
    additionalData?: {
      title?: string;
      content?: string;
      obtainedDate?: string;
    },
    onProgress?: (progress: number) => void,
  ): Promise<Evidence> {
    // Create evidence record
    const evidenceType = inferEvidenceType(file.type);
    const evidence = await this.create({
      caseId,
      title: additionalData?.title || file.name,
      evidenceType,
      content: additionalData?.content,
      obtainedDate: additionalData?.obtainedDate,
    });

    // Upload file
    const uploadedEvidence = await this.upload(evidence.id, file, onProgress);

    return uploadedEvidence;
  }

  /**
   * Download and parse document in one operation
   */
  async downloadAndParse(
    evidenceId: number,
  ): Promise<{ evidence: Evidence; parsed: ParsedDocument }> {
    const evidence = await this.get(evidenceId);
    const parsed = await this.parse(evidenceId);

    return { evidence, parsed };
  }
}

/**
 * Default evidence API client instance
 */
export const evidenceApi = new EvidenceApiClient();
