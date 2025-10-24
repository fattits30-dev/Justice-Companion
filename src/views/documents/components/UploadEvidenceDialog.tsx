import { useState } from 'react';
import type { EvidenceType } from '../../../models/Evidence.ts';
import { evidenceTypeMetadata } from '../constants.ts';
import { showWarning } from '../../../components/ui/Toast.tsx';

export interface UploadEvidenceInput {
  file: File;
  title: string;
  evidenceType: EvidenceType;
  obtainedDate?: string;
}

interface UploadEvidenceDialogProps {
  onClose: () => void;
  onUpload: (input: UploadEvidenceInput) => void;
}

export function UploadEvidenceDialog({ onClose, onUpload }: UploadEvidenceDialogProps) {
  const [title, setTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('document');
  const [obtainedDate, setObtainedDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      showWarning('Please select a file');
      return;
    }
    if (!title.trim()) {
      showWarning('Please enter a title');
      return;
    }

    onUpload({
      file,
      title: title.trim(),
      evidenceType,
      obtainedDate: obtainedDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-evidence-dialog-title"
      >
        <div className="flex items-center justify-between border-b border-gray-700 p-6">
          <h2 id="upload-evidence-dialog-title" className="text-2xl font-bold text-white">
            Upload Evidence
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-300"
            aria-label="Close upload evidence dialog"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-gray-300">File *</span>
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="w-full cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700 focus:border-blue-500 focus:outline-none"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-2 block font-medium text-gray-300">Title *</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g., Employment Contract 2024"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-2 block font-medium text-gray-300">Evidence Type *</span>
            <select
              value={evidenceType}
              onChange={(event) => setEvidenceType(event.target.value as EvidenceType)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              {Object.entries(evidenceTypeMetadata).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-2 block font-medium text-gray-300">Date Obtained</span>
            <input
              type="date"
              value={obtainedDate}
              onChange={(event) => setObtainedDate(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-gray-700 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
