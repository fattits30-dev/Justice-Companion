/**
 * Evidence Components - Central Export
 *
 * Comprehensive evidence management components for Justice Companion.
 * All components use HTTP REST API instead of Electron IPC.
 *
 * @module evidence
 */

// Main components
export { EvidenceUpload } from "./EvidenceUpload.tsx";
export { EvidenceViewer } from "./EvidenceViewer.tsx";
export { DocumentParser } from "./DocumentParser.tsx";
export { CitationExtractor } from "./CitationExtractor.tsx";
export { OCRComponent } from "./OCRComponent.tsx";

// API client and utilities
export { evidenceApi, EvidenceApiClient } from "../../lib/evidenceApiClient.ts";
export * from "../../lib/utils/evidenceHelpers.ts";

// Type exports
export type {
  EvidenceListOptions,
  ParsedDocument,
  Citation,
  CitationResponse,
  OCRResult,
  UploadProgress,
} from "../../lib/evidenceApiClient.ts";
