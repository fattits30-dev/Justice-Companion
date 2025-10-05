interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps): JSX.Element {
  return (
    <div
      className={`
        animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800
        bg-[length:200%_100%] animate-shimmer rounded
        ${className}
      `}
      aria-hidden="true"
    />
  );
}

interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export function TextSkeleton({ lines = 1, className = '' }: TextSkeletonProps): JSX.Element {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className = '' }: CardSkeletonProps): JSX.Element {
  return (
    <div
      className={`
        bg-gradient-to-br from-slate-900/50 to-blue-950/30
        border border-blue-800/30 rounded-xl p-6
        ${className}
      `}
    >
      <div className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <TextSkeleton lines={3} />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

interface CircleSkeletonProps {
  size?: number;
  className?: string;
}

export function CircleSkeleton({ size = 40, className = '' }: CircleSkeletonProps): JSX.Element {
  return (
    <Skeleton
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

interface TreeSkeletonProps {
  depth?: number;
  className?: string;
}

export function TreeSkeleton({ depth = 3, className = '' }: TreeSkeletonProps): JSX.Element {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: depth }).map((_, i) => (
        <div key={i} style={{ paddingLeft: i * 20 }}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1 max-w-xs" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface GridSkeletonProps {
  count?: number;
  columns?: number;
  className?: string;
}

export function GridSkeleton({ count = 6, columns = 3, className = '' }: GridSkeletonProps): JSX.Element {
  return (
    <div
      className={`grid gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
