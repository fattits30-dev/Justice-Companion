import type { Evidence } from '../../../models/Evidence.ts';
import { evidenceTypeMetadata } from '../constants.ts';

interface EvidenceCardProps {
  evidence: Evidence;
  onDelete: (id: number) => void;
}

export function EvidenceCard({ evidence, onDelete }: EvidenceCardProps) {
  const metadata = evidenceTypeMetadata[evidence.evidenceType];

  return (
    <div className="flex flex-col justify-between rounded-lg border border-gray-800 bg-gray-900/60 p-6 transition-colors hover:border-gray-700 hover:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold ${metadata.accent}`}
        >
          {metadata.shortLabel}
        </span>
        <button
          onClick={() => onDelete(evidence.id)}
          className="text-gray-500 transition-colors hover:text-red-400"
          title="Delete evidence"
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
        <h3 className="text-lg font-semibold text-white">{evidence.title}</h3>
        <p className="mt-1 text-sm text-gray-400">{metadata.label}</p>
        {renderEvidenceDetails(evidence)}
      </div>
      <dl className="mt-auto text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <dt>Obtained</dt>
          <dd>{formatDate(evidence.obtainedDate)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Uploaded</dt>
          <dd>{formatDate(evidence.createdAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function renderEvidenceDetails(evidence: Evidence) {
  if (evidence.content) {
    return <p className="mt-3 line-clamp-3 text-sm text-gray-300">{evidence.content}</p>;
  }

  if (evidence.filePath) {
    return (
      <p className="mt-3 text-sm text-blue-300">
        File: <span className="font-mono">{evidence.filePath}</span>
      </p>
    );
  }

  return <p className="mt-3 text-sm text-gray-500 italic">No additional details provided.</p>;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Unknown';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleDateString();
}
