import { HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  count?: number;
  animation?: "pulse" | "shimmer" | "none";
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = "rectangular",
      width,
      height,
      count = 1,
      animation = "shimmer",
      className,
      style,
      ...props
    },
    ref,
  ) => {
    // Variant styles
    const variantStyles = {
      text: "h-4 rounded",
      circular: "rounded-full",
      rectangular: "rounded-none",
      rounded: "rounded-lg",
    };

    // Animation styles
    const animationStyles = {
      pulse: "animate-pulse",
      shimmer: "relative overflow-hidden",
      none: "",
    };

    const skeletonElement = (
      <div
        ref={count === 1 ? ref : undefined}
        className={clsx(
          // Base styles
          "bg-gradient-to-r from-gray-800/50 via-gray-700/50 to-gray-800/50",
          // Variant
          variantStyles[variant],
          // Animation
          animationStyles[animation],
          // Custom
          className,
        )}
        style={{
          width: width || (variant === "text" ? "100%" : undefined),
          height:
            height ||
            (variant === "text"
              ? "1rem"
              : variant === "circular"
                ? width || "3rem"
                : undefined),
          ...style,
        }}
        {...props}
      >
        {/* Shimmer effect */}
        {animation === "shimmer" && (
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        )}
      </div>
    );

    // Render multiple skeletons if count > 1
    if (count > 1) {
      return (
        <div ref={ref} className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i}>{skeletonElement}</div>
          ))}
        </div>
      );
    }

    return skeletonElement;
  },
);

Skeleton.displayName = "Skeleton";

// Preset skeleton components

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lastLineWidth?: string | number;
}

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, lastLineWidth = "60%", className, ...props }, ref) => {
    return (
      <div ref={ref} className={clsx("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            width={i === lines - 1 ? lastLineWidth : "100%"}
          />
        ))}
      </div>
    );
  },
);

SkeletonText.displayName = "SkeletonText";

export interface SkeletonAvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

export const SkeletonAvatar = forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ size = "md", className, ...props }, ref) => {
    const sizeMap = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-12 h-12",
      xl: "w-16 h-16",
    };

    return (
      <Skeleton
        ref={ref}
        variant="circular"
        className={clsx(sizeMap[size], className)}
        {...props}
      />
    );
  },
);

SkeletonAvatar.displayName = "SkeletonAvatar";

export interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  showAvatar?: boolean;
  lines?: number;
}

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ showAvatar = false, lines = 3, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "p-6 rounded-xl border border-gray-800 bg-primary-900/60",
          className,
        )}
        {...props}
      >
        {/* Header with avatar */}
        {showAvatar && (
          <div className="flex items-center gap-3 mb-4">
            <SkeletonAvatar size="md" />
            <div className="flex-1">
              <Skeleton variant="text" width="40%" className="mb-2" />
              <Skeleton variant="text" width="60%" />
            </div>
          </div>
        )}

        {/* Title */}
        <Skeleton variant="rounded" height="1.5rem" className="mb-3" />

        {/* Description lines */}
        <SkeletonText lines={lines} lastLineWidth="70%" />

        {/* Footer */}
        <div className="flex items-center gap-2 mt-4">
          <Skeleton variant="rounded" width="5rem" height="2rem" />
          <Skeleton variant="rounded" width="5rem" height="2rem" />
        </div>
      </div>
    );
  },
);

SkeletonCard.displayName = "SkeletonCard";

export interface SkeletonListProps extends HTMLAttributes<HTMLDivElement> {
  items?: number;
  showAvatar?: boolean;
}

export const SkeletonList = forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ items = 3, showAvatar = false, className, ...props }, ref) => {
    return (
      <div ref={ref} className={clsx("space-y-3", className)} {...props}>
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {showAvatar && <SkeletonAvatar size="md" />}
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
            </div>
          </div>
        ))}
      </div>
    );
  },
);

SkeletonList.displayName = "SkeletonList";

// Example usage:
// <Skeleton variant="rectangular" width="100%" height="200px" />
// <Skeleton variant="circular" width="48px" height="48px" />
// <SkeletonText lines={3} />
// <SkeletonAvatar size="lg" />
// <SkeletonCard showAvatar lines={3} />
// <SkeletonList items={5} showAvatar />
