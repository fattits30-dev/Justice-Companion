import type { EvidenceType } from '../../../models/Evidence.ts';
import { evidenceFilterOptions } from '../constants.ts';

interface DocumentsToolbarProps {
  cases: Array<{ id: number; title: string }>;
  selectedCaseId: number | null;
  onCaseSelect: (id: number | null) => void;
  filterType: EvidenceType | 'all';
  onFilterChange: (value: EvidenceType | 'all') => void;
  onUploadClick: () => void;
  isUploadDisabled: boolean;
}

export function DocumentsToolbar({
  cases,
  selectedCaseId,
  onCaseSelect,
  filterType,
  onFilterChange,
  onUploadClick,
  isUploadDisabled,
}: DocumentsToolbarProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Evidence & Documents</h1>
        <p className="text-gray-400">
          Keep track of every document, note and supporting item for your cases.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex flex-col text-sm text-gray-400">
          <span className="mb-1">Case</span>
          <select
            value={selectedCaseId ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              onCaseSelect(value ? Number(value) : null);
            }}
            className="min-w-[200px] rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select a case</option>
            {cases.map((caseItem) => (
              <option key={caseItem.id} value={caseItem.id}>
                {caseItem.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm text-gray-400">
          <span className="mb-1">Type</span>
          <select
            value={filterType}
            onChange={(event) => onFilterChange(event.target.value as EvidenceType | 'all')}
            className="min-w-[160px] rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            {evidenceFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={onUploadClick}
          className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700"
          disabled={isUploadDisabled}
        >
          Upload Evidence
        </button>
      </div>
    </div>
  );
}
