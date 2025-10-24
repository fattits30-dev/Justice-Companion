import { SkeletonCard } from '../../../components/ui/Skeleton.tsx';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

interface EmptyEvidenceProps {
  onUpload: () => void;
}

interface NoCasesProps {
  onReload: () => void;
}

export function DocumentsLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function DocumentsErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md rounded-lg border border-red-500 bg-red-900/20 p-6">
        <h2 className="mb-2 text-xl font-bold text-red-400">Error Loading Documents</h2>
        <p className="text-gray-300">{message}</p>
        <button
          onClick={onRetry}
          className="mt-4 rounded bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export function DocumentsNoCasesState({ onReload }: NoCasesProps) {
  return (
    <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/40 p-16 text-center text-white">
      <h2 className="mb-2 text-2xl font-semibold">No cases available</h2>
      <p className="text-gray-400">
        Create a case first to start uploading evidence and documents.
      </p>
      <button
        onClick={onReload}
        className="mt-6 rounded-lg border border-blue-500 px-6 py-2 font-medium text-blue-300 transition-colors hover:bg-blue-500/10"
      >
        Refresh
      </button>
    </div>
  );
}

export function DocumentsEmptyEvidenceState({ onUpload }: EmptyEvidenceProps) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-12 text-center text-white">
      <h3 className="text-xl font-semibold">No evidence yet</h3>
      <p className="mt-2 text-gray-400">Upload files, notes, or other supporting material.</p>
      <button
        onClick={onUpload}
        className="mt-6 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
      >
        Upload Evidence
      </button>
    </div>
  );
}

export function DocumentsFilteredEmptyState() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-12 text-center text-gray-400">
      <h3 className="text-xl font-semibold text-white">No evidence matches the selected type</h3>
      <p className="mt-2">Try another filter or clear it to show all evidence.</p>
    </div>
  );
}
