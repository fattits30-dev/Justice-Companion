import { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useEvidence } from '../hooks/useEvidence';
import type { EvidenceType } from '../models/Evidence';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: number;
  onUploadComplete?: () => void;
}

interface SelectedFile {
  path: string;
  name: string;
  size: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : null;
  }

  return null;
}

export function FileUploadModal({
  isOpen,
  onClose,
  caseId,
  onUploadComplete,
}: FileUploadModalProps): JSX.Element | null {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('document');
  const [obtainedDate, setObtainedDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { createEvidence } = useEvidence();

  if (!isOpen) {
    return null;
  }

  const handleSelectFile = async (): Promise<void> => {
    try {
      setError(null);
      const result = await window.justiceAPI.selectFile({
        filters: [
          { name: 'Documents', extensions: ['pdf'] },
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
        ],
        properties: ['openFile'],
      });

      if (result.success && !result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileName = filePath.split(/[\\/]/).pop() || 'Unknown';
        const fileExtension = getFileExtension(fileName);

        // Validate file type
        if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
          setError(`Invalid file type. Only PDF, PNG, JPG, and JPEG files are allowed.`);
          return;
        }

        // Use file upload handler to validate and get file info
        const uploadResult = await window.justiceAPI.uploadFile(filePath);

        if (!uploadResult.success) {
          setError(uploadResult.error || 'Failed to process file');
          return;
        }

        // Check file size
        if (uploadResult.fileSize > MAX_FILE_SIZE) {
          setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
          return;
        }

        setSelectedFile({
          path: filePath,
          name: fileName,
          size: uploadResult.fileSize,
        });

        // Auto-populate title if empty
        if (!title) {
          setTitle(fileName.replace(/\.[^/.]+$/, '')); // Remove extension
        }
      }
    } catch (err) {
      setError(getErrorMessage(err) ?? 'Failed to select file');
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!selectedFile || !title.trim()) {
      setError('Please select a file and enter a title.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await createEvidence({
        caseId,
        title: title.trim(),
        filePath: selectedFile.path,
        content: description.trim() || undefined,
        evidenceType,
        obtainedDate: obtainedDate || undefined,
      });

      setSuccess(true);

      // Close modal after brief delay
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete();
        }
        handleClose();
      }, 1500);
    } catch (err) {
      setError(getErrorMessage(err) ?? 'Failed to upload evidence');
      setIsUploading(false);
    }
  };

  const handleClose = (): void => {
    // Reset form
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setEvidenceType('document');
    setObtainedDate('');
    setError(null);
    setSuccess(false);
    setIsUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-700/50 rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Upload Evidence</h3>
              <p className="text-sm text-blue-300">Add a file to your case</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-blue-800/30 rounded-lg transition-colors"
            aria-label="Close"
            disabled={isUploading}
          >
            <X className="w-5 h-5 text-blue-200" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-600/20 border border-green-600/30 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-200 font-medium">Evidence uploaded successfully!</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-600/20 border border-red-600/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-600/30 rounded transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4 text-red-300" />
            </button>
          </div>
        )}

        {/* File Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-blue-200 mb-2">
            Select File <span className="text-red-400">*</span>
          </label>
          <div className="space-y-3">
            <button
              onClick={handleSelectFile}
              className="w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 text-blue-200 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
              disabled={isUploading}
              type="button"
            >
              <FileText className="w-5 h-5" />
              {selectedFile ? 'Change File' : 'Choose File'}
            </button>

            {selectedFile && (
              <div className="p-4 bg-slate-800/50 border border-blue-700/30 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Supported formats: PDF, PNG, JPG, JPEG • Max size: {formatFileSize(MAX_FILE_SIZE)}
          </p>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label htmlFor="evidence-title" className="block text-sm font-medium text-blue-200 mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            id="evidence-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800/50 border border-blue-700/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter evidence title"
            disabled={isUploading}
            required
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label htmlFor="evidence-description" className="block text-sm font-medium text-blue-200 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="evidence-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800/50 border border-blue-700/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
            placeholder="Add any notes or context about this evidence"
            disabled={isUploading}
          />
        </div>

        {/* Evidence Type */}
        <div className="mb-4">
          <label htmlFor="evidence-type" className="block text-sm font-medium text-blue-200 mb-2">
            Evidence Type
          </label>
          <select
            id="evidence-type"
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
            className="w-full px-4 py-2 bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUploading}
          >
            <option value="document">Document</option>
            <option value="photo">Photo</option>
            <option value="email">Email</option>
            <option value="recording">Recording</option>
            <option value="note">Note</option>
          </select>
        </div>

        {/* Obtained Date */}
        <div className="mb-6">
          <label htmlFor="obtained-date" className="block text-sm font-medium text-blue-200 mb-2">
            Date Obtained (Optional)
          </label>
          <input
            id="obtained-date"
            type="date"
            value={obtainedDate}
            onChange={(e) => setObtainedDate(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800/50 border border-blue-700/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUploading}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isUploading || !selectedFile || !title.trim()}
            type="button"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Evidence
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
