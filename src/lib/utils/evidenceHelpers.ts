/**
 * Evidence utility functions for type inference and file operations
 */

import type { EvidenceType } from "../../domains/evidence/entities/Evidence.ts";

/**
 * File type to MIME type mapping
 */
const MIME_TYPE_MAP: Record<string, string[]> = {
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/rtf",
  ],
  photo: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/svg+xml",
  ],
  email: ["message/rfc822", "application/vnd.ms-outlook"],
  recording: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/m4a",
    "audio/aac",
    "audio/flac",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
  ],
  note: ["text/plain", "text/markdown", "application/json"],
  witness: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
};

/**
 * Maximum file sizes by evidence type (in bytes)
 */
export const MAX_FILE_SIZES: Record<EvidenceType, number> = {
  document: 50 * 1024 * 1024, // 50MB
  photo: 10 * 1024 * 1024, // 10MB
  email: 25 * 1024 * 1024, // 25MB
  recording: 100 * 1024 * 1024, // 100MB
  note: 5 * 1024 * 1024, // 5MB
  witness: 50 * 1024 * 1024, // 50MB
};

/**
 * Infer evidence type from MIME type
 */
export function inferEvidenceType(mimeType: string): EvidenceType {
  for (const [evidenceType, mimeTypes] of Object.entries(MIME_TYPE_MAP)) {
    if (mimeTypes.includes(mimeType)) {
      return evidenceType as EvidenceType;
    }
  }

  // Default fallback logic
  if (mimeType.startsWith("image/")) {
    return "photo";
  }
  if (mimeType.startsWith("audio/")) {
    return "recording";
  }
  if (mimeType.startsWith("video/")) {
    return "recording";
  }
  if (mimeType.startsWith("text/")) {
    return "note";
  }

  return "document"; // Default to document
}

/**
 * Validate file type for evidence type
 */
export function validateFileType(
  file: File,
  evidenceType: EvidenceType,
): { valid: boolean; error?: string } {
  const allowedMimeTypes = MIME_TYPE_MAP[evidenceType];

  if (!allowedMimeTypes) {
    return { valid: false, error: "Unknown evidence type" };
  }

  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type for ${evidenceType}. Allowed types: ${allowedMimeTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Validate file size for evidence type
 */
export function validateFileSize(
  file: File,
  evidenceType: EvidenceType,
): { valid: boolean; error?: string } {
  const maxSize = MAX_FILE_SIZES[evidenceType];

  if (!maxSize) {
    return { valid: false, error: "Unknown evidence type" };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${formatFileSize(maxSize)}`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Check if file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

/**
 * Check if file is an audio file
 */
export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/");
}

/**
 * Check if file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === "application/pdf";
}

/**
 * Check if file is a document (Word, PDF, text)
 */
export function isDocumentFile(file: File): boolean {
  const docTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/rtf",
  ];
  return docTypes.includes(file.type);
}

/**
 * Generate thumbnail URL for file
 */
export function getThumbnailUrl(
  evidenceId: number,
  baseURL: string = "http://127.0.0.1:8000",
): string {
  return `${baseURL}/evidence/${evidenceId}/thumbnail`;
}

/**
 * Get icon name for evidence type
 */
export function getEvidenceTypeIcon(evidenceType: EvidenceType): string {
  const iconMap: Record<EvidenceType, string> = {
    document: "FileText",
    photo: "Image",
    email: "Mail",
    recording: "Video",
    note: "FileText",
    witness: "UserCheck",
  };

  return iconMap[evidenceType] || "File";
}

/**
 * Get color for evidence type
 */
export function getEvidenceTypeColor(evidenceType: EvidenceType): string {
  const colorMap: Record<EvidenceType, string> = {
    document: "blue",
    photo: "purple",
    email: "green",
    recording: "red",
    note: "yellow",
    witness: "cyan",
  };

  return colorMap[evidenceType] || "gray";
}

/**
 * Create a download link for blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read file as data URL (for preview)
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  evidenceType: EvidenceType,
): {
  valid: File[];
  invalid: Array<{ file: File; error: string }>;
} {
  const valid: File[] = [];
  const invalid: Array<{ file: File; error: string }> = [];

  for (const file of files) {
    const typeValidation = validateFileType(file, evidenceType);
    if (!typeValidation.valid) {
      invalid.push({ file, error: typeValidation.error! });
      continue;
    }

    const sizeValidation = validateFileSize(file, evidenceType);
    if (!sizeValidation.valid) {
      invalid.push({ file, error: sizeValidation.error! });
      continue;
    }

    valid.push(file);
  }

  return { valid, invalid };
}
