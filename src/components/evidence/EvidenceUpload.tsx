/**
 * Evidence Upload Component
 *
 * Features:
 * - Drag-and-drop file upload
 * - Multiple file selection
 * - File type validation
 * - File size validation
 * - Upload progress tracking
 * - Preview thumbnails
 * - Cancel upload
 *
 * @module EvidenceUpload
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  File,
  Image,
  Video,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";
import { evidenceApi } from "../../lib/evidenceApiClient.ts";
import {
  validateFiles,
  formatFileSize,
  isImageFile,
} from "../../lib/utils/evidenceHelpers.ts";
import type { EvidenceType } from "../../domains/evidence/entities/Evidence.ts";
import { Card } from "../ui/Card.tsx";
import { Button } from "../ui/Button.tsx";
import { Badge } from "../ui/Badge.tsx";

interface EvidenceUploadProps {
  caseId: number;
  evidenceType?: EvidenceType;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

interface FileUploadState {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  preview?: string;
  evidenceId?: number;
}

export function EvidenceUpload({
  caseId,
  evidenceType = "document",
  onUploadComplete,
  onClose,
}: EvidenceUploadProps) {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [evidenceType],
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
      }
    },
    [evidenceType],
  );

  // Add files to upload queue
  const addFiles = useCallback(
    (newFiles: File[]) => {
      // Validate files
      const { valid, invalid } = validateFiles(newFiles, evidenceType);

      // Add valid files to queue
      const validFileStates: FileUploadState[] = valid.map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }));

      setFiles((prev) => [...prev, ...validFileStates]);

      // Show error toasts for invalid files
      invalid.forEach(({ file, error }) => {
        console.error(`Invalid file ${file.name}: ${error}`);
        // In real implementation, show toast notification
      });

      // Generate previews for images
      validFileStates.forEach((fileState, index) => {
        if (isImageFile(fileState.file)) {
          const reader = new FileReader();
          reader.onload = () => {
            setFiles((prev) => {
              const updated = [...prev];
              const fileIndex = prev.length - validFileStates.length + index;
              if (updated[fileIndex]) {
                updated[fileIndex].preview = reader.result as string;
              }
              return updated;
            });
          };
          reader.readAsDataURL(fileState.file);
        }
      });
    },
    [evidenceType],
  );

  // Remove file from queue
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Upload all files
  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const fileState = files[i];

      if (fileState.status !== "pending") {
        continue;
      }

      try {
        // Update status to uploading
        setFiles((prev) => {
          const updated = [...prev];
          updated[i].status = "uploading";
          return updated;
        });

        // Create and upload evidence
        const evidence = await evidenceApi.createAndUpload(
          caseId,
          fileState.file,
          {
            title: fileState.file.name,
          },
          (progress) => {
            setFiles((prev) => {
              const updated = [...prev];
              updated[i].progress = progress;
              return updated;
            });
          },
        );

        // Update status to completed
        setFiles((prev) => {
          const updated = [...prev];
          updated[i].status = "completed";
          updated[i].evidenceId = evidence.id;
          return updated;
        });
      } catch (error) {
        // Update status to error
        setFiles((prev) => {
          const updated = [...prev];
          updated[i].status = "error";
          updated[i].error =
            error instanceof Error ? error.message : "Upload failed";
          return updated;
        });
      }
    }

    setIsUploading(false);

    // Check if all uploads completed successfully
    const allCompleted = files.every(
      (f) => f.status === "completed" || f.status === "error",
    );
    if (allCompleted) {
      onUploadComplete?.();
    }
  }, [files, caseId, onUploadComplete]);

  // Retry failed upload
  const retryUpload = useCallback((index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated[index].status = "pending";
      updated[index].error = undefined;
      updated[index].progress = 0;
      return updated;
    });
  }, []);

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const completedCount = files.filter((f) => f.status === "completed").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <Card variant="glass" className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Upload Evidence</h3>
          <p className="text-sm text-white/70 mt-1">
            Drag and drop files or click to browse
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-cyan-500 bg-cyan-500/10"
              : "border-white/20 hover:border-white/40 hover:bg-white/5"
          }
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Upload
          className={`h-12 w-12 mx-auto mb-4 ${
            isDragging ? "text-cyan-400" : "text-white/50"
          }`}
        />
        <p className="text-lg font-medium text-white mb-2">
          {isDragging ? "Drop files here" : "Click or drag files to upload"}
        </p>
        <p className="text-sm text-white/60">
          Supports PDF, DOCX, images, videos, and audio files
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
      </motion.div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-white/90">
              Files ({files.length})
            </h4>
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <Badge variant="success" size="sm">
                  {completedCount} completed
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="danger" size="sm">
                  {errorCount} failed
                </Badge>
              )}
            </div>
          </div>

          <AnimatePresence>
            {files.map((fileState, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
              >
                {/* File Icon/Preview */}
                <div className="shrink-0">
                  {fileState.preview ? (
                    <img
                      src={fileState.preview}
                      alt={fileState.file.name}
                      className="h-12 w-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="h-12 w-12 flex items-center justify-center bg-white/10 rounded-lg">
                      <FileIcon fileType={fileState.file.type} />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {fileState.file.name}
                  </p>
                  <p className="text-xs text-white/60">
                    {formatFileSize(fileState.file.size)}
                  </p>

                  {/* Progress Bar */}
                  {fileState.status === "uploading" && (
                    <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${fileState.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {fileState.status === "error" && fileState.error && (
                    <p className="text-xs text-red-400 mt-1">
                      {fileState.error}
                    </p>
                  )}
                </div>

                {/* Status Icon */}
                <div className="shrink-0">
                  {fileState.status === "pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {fileState.status === "uploading" && (
                    <Loader className="h-5 w-5 text-cyan-400 animate-spin" />
                  )}
                  {fileState.status === "completed" && (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                  {fileState.status === "error" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        retryUpload(index);
                      }}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-white/5"
                      title="Retry upload"
                    >
                      <AlertCircle className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
          <button
            onClick={() => setFiles([])}
            className="text-sm text-white/70 hover:text-white transition-colors"
            disabled={isUploading}
          >
            Clear all
          </button>
          <div className="flex items-center gap-3">
            {onClose && (
              <Button variant="ghost" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleUpload}
              disabled={pendingCount === 0 || isUploading}
              className="min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// File type icon component
function FileIcon({ fileType }: { fileType: string }) {
  if (fileType.startsWith("image/")) {
    return <Image className="h-6 w-6 text-purple-400" />;
  }
  if (fileType.startsWith("video/")) {
    return <Video className="h-6 w-6 text-red-400" />;
  }
  if (fileType.startsWith("audio/")) {
    return <Video className="h-6 w-6 text-orange-400" />;
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-6 w-6 text-red-400" />;
  }
  return <File className="h-6 w-6 text-blue-400" />;
}
