import type { Case } from '../../../models/Case.ts';
import { caseTypeMetadata, statusStyles } from '../constants.ts';

interface CaseCardProps {
  caseItem: Case;
  onDelete: (caseId: number) => void;
}

export function CaseCard({ caseItem, onDelete }: CaseCardProps) {
  const metadata = caseTypeMetadata[caseItem.caseType];

  return (
    <div className="flex flex-col justify-between rounded-lg border border-gray-800 bg-gray-900/60 p-6 transition-colors hover:border-gray-700 hover:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold ${metadata.accent}`}
        >
          {metadata.shortLabel}
        </span>
        <button
          onClick={() => onDelete(caseItem.id)}
          className="text-gray-500 transition-colors hover:text-red-400"
          title="Delete case"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
      <div>
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-white">{caseItem.title}</h3>
          <span
            className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium border ${statusStyles[caseItem.status]}`}
          >
            {caseItem.status}
          </span>
        </div>
        {caseItem.description ? (
          <p className="mb-4 line-clamp-3 text-sm text-gray-400">{caseItem.description}</p>
        ) : (
          <p className="mb-4 text-sm text-gray-500 italic">No description provided.</p>
        )}
      </div>
      <dl className="mt-auto text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <dt>Type</dt>
          <dd>{metadata.displayLabel}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Created</dt>
          <dd>{formatDate(caseItem.createdAt)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Updated</dt>
          <dd>{formatDate(caseItem.updatedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleDateString();
}
