import { useEffect, useMemo, memo } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2, AlertCircle } from 'lucide-react';
import { usePaginatedCases, flattenPaginatedCases } from '../../../hooks/usePaginatedCases';
import type { CaseStatus } from '../../../models/Case';

interface CaseListInfiniteScrollProps {
  userId?: number;
  status?: CaseStatus;
  pageSize?: number;
  onCaseClick?: (caseId: number) => void;
}

/**
 * Infinite scroll case list component
 *
 * Uses cursor-based pagination with automatic loading as user scrolls.
 * Implements performance optimizations from Phase 2 architecture:
 * - Only decrypts visible cases (not all in database)
 * - LRU caching for decrypted descriptions
 * - React Query for automatic cache management
 *
 * @example
 * ```typescript
 * <CaseListInfiniteScroll
 *   userId={currentUser.id}
 *   status="active"
 *   pageSize={20}
 *   onCaseClick={(id) => navigate(`/cases/${id}`)}
 * />
 * ```
 */
const CaseListInfiniteScrollComponent = ({
  userId,
  status,
  pageSize = 20,
  onCaseClick,
}: CaseListInfiniteScrollProps): JSX.Element => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = usePaginatedCases({ userId, status, pageSize });

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px', // Trigger 200px before reaching bottom
  });

  // Auto-fetch next page when trigger is in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading cases...</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Cases</h3>
        <p className="text-red-200 text-sm mb-4">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Get all cases from all pages - memoized to prevent re-flattening on every render
  const allCases = useMemo(() => flattenPaginatedCases(data), [data]);

  // Empty state
  if (allCases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Cases Found</h3>
        <p className="text-slate-400 text-sm">
          {status ? `No ${status} cases to display.` : 'No cases to display.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Case List */}
      {allCases.map((caseItem) => (
        <div
          key={caseItem.id}
          onClick={() => onCaseClick?.(caseItem.id)}
          className="bg-slate-800/50 border border-blue-700/30 rounded-lg p-6 hover:bg-slate-800 hover:border-blue-500/50 transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">{caseItem.title}</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                caseItem.status === 'active'
                  ? 'bg-green-600/20 text-green-300'
                  : caseItem.status === 'closed'
                    ? 'bg-gray-600/20 text-gray-300'
                    : 'bg-yellow-600/20 text-yellow-300'
              }`}
            >
              {caseItem.status}
            </span>
          </div>

          {caseItem.description && (
            <p className="text-slate-300 text-sm mb-3 line-clamp-2">{caseItem.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Type: {caseItem.caseType}</span>
            <span>Created: {new Date(caseItem.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(caseItem.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      ))}

      {/* Infinite Scroll Trigger */}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading more cases...</span>
          </div>
        )}

        {!hasNextPage && allCases.length > 0 && (
          <div className="text-slate-400 text-sm">
            All {allCases.length} cases loaded
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize component - only re-render when relevant props change
export const CaseListInfiniteScroll = memo(CaseListInfiniteScrollComponent, (prevProps, nextProps) => {
  // Re-render only if userId, status, or pageSize changes
  // (onCaseClick excluded from comparison - assume parent memoizes it)
  return (
    prevProps.userId === nextProps.userId &&
    prevProps.status === nextProps.status &&
    prevProps.pageSize === nextProps.pageSize
  );
});
