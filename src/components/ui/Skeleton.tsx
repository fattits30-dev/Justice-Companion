import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-primary/10', className)}
      {...props}
    />
  );
}

interface SkeletonCardProps {
  count?: number;
  className?: string;
}

function SkeletonCard({ count = 1, className }: SkeletonCardProps): JSX.Element {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'bg-slate-900/50 border border-blue-800/30 rounded-lg p-5',
            'transition-opacity duration-300',
            className
          )}
          role="status"
          aria-label="Loading document card"
        >
          {/* Icon and status skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
            <Skeleton className="w-5 h-5 rounded-full" />
          </div>

          {/* Title */}
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-3" />

          {/* Status badge */}
          <Skeleton className="h-6 w-24 rounded-full mb-4" />

          {/* Metadata */}
          <div className="space-y-2 mb-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>

          {/* Checklist */}
          <div className="border-t border-blue-800/30 pt-3 mb-4">
            <Skeleton className="h-2 w-24 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-6 w-20 rounded" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-4 gap-2">
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
          </div>
        </div>
      ))}
    </>
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

function SkeletonList({ count = 3, className }: SkeletonListProps): JSX.Element {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading list">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg border border-blue-800/20">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="w-16 h-8 rounded" />
        </div>
      ))}
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

function SkeletonText({ lines = 3, className }: SkeletonTextProps): JSX.Element {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading text">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            'h-4',
            index === lines - 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

interface SkeletonTreeProps {
  className?: string;
}

function SkeletonTree({ className }: SkeletonTreeProps): JSX.Element {
  return (
    <div
      className={cn('space-y-6 p-8', className)}
      role="status"
      aria-label="Loading case tree"
    >
      {/* Root node */}
      <div className="flex flex-col items-center">
        <Skeleton className="w-48 h-24 rounded-lg" />
      </div>

      {/* Second level - 4 branches */}
      <div className="flex justify-center gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-4">
            <Skeleton className="w-40 h-16 rounded-lg" />
            {/* Third level - 2 items per branch */}
            <div className="flex gap-3">
              <Skeleton className="w-32 h-20 rounded-lg" />
              <Skeleton className="w-32 h-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonList, SkeletonText, SkeletonTree };
