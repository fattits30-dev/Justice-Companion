import { useState } from 'react';
import type { CaseType, CreateCaseInput } from '../../../models/Case.ts';
import { caseTypeMetadata } from '../constants.ts';
import { showWarning } from '../../../components/ui/Toast.tsx';

interface CreateCaseDialogProps {
  onClose: () => void;
  onCreate: (input: CreateCaseInput) => void;
}

export function CreateCaseDialog({ onClose, onCreate }: CreateCaseDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [caseType, setCaseType] = useState<CaseType>('employment');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      showWarning('Please enter a case title');
      return;
    }

    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      caseType,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-case-dialog-title"
      >
        <div className="flex items-center justify-between border-b border-gray-700 p-6">
          <h2 id="create-case-dialog-title" className="text-2xl font-bold text-white">
            Create New Case
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-300"
            aria-label="Close create case dialog"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-gray-300">Case Title *</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g., Unfair Dismissal - Smith v. Acme Corp"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-2 block font-medium text-gray-300">Case Type *</span>
            <select
              value={caseType}
              onChange={(event) => setCaseType(event.target.value as CaseType)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              {Object.entries(caseTypeMetadata).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.displayLabel}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-2 block font-medium text-gray-300">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Brief description of the case..."
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
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
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
