import { SkeletonCard } from "../../../components/ui/Skeleton.tsx";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

interface EmptyStateProps {
  onCreateCase: () => void;
}

export function CasesLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function CasesErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md rounded-lg border border-red-500 bg-red-900/20 p-6">
        <h2 className="mb-2 text-xl font-bold text-red-400">
          Error Loading Cases
        </h2>
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

export function CasesEmptyState({ onCreateCase }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/40 p-16 text-center">
      <h2 className="mb-2 text-2xl font-semibold text-white">No cases yet</h2>
      <p className="mb-6 text-gray-400">
        Create your first case to keep everything organised.
      </p>
      <button
        onClick={onCreateCase}
        className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition-colors hover:bg-primary-700"
      >
        Create Case
      </button>
    </div>
  );
}

export function CasesFilteredEmptyState() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-12 text-center text-gray-400">
      <h3 className="text-xl font-semibold text-white">
        No cases match your filters
      </h3>
      <p className="mt-2">
        Try adjusting the status or type filters to see more results.
      </p>
    </div>
  );
}
