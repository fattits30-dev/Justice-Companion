import { cn } from '@/lib/utils';
import type { BaseComponentProps } from '@/types/ui.types';
import * as React from 'react';

/**
 * Badge Component - Status indicators and labels
 *
 * Features:
 * - Color variants (default, success, warning, error, info, secondary, ghost)
 * - Size options (sm, md, lg)
 * - Optional icon support
 * - Pill or rounded shape
 * - Accessible by default
 *
 * Usage:
 * ```tsx
 * <Badge variant="success" size="md">Active</Badge>
 * <Badge variant="error" icon={<AlertIcon />}>Error</Badge>
 * ```
 */

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, BaseComponentProps {
  /** Visual style variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'ghost';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Shape style */
  shape?: 'rounded' | 'pill';
  /** Icon to display before text */
  icon?: React.ReactNode;
  /** Children (badge text) */
  children?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      shape = 'rounded',
      icon,
      children,
      'aria-label': ariaLabel,
      'data-testid': testId,
      ...props
    },
    ref,
  ) => {
    // Variant-based styling
    const variantClasses = {
      default: 'bg-blue-500/20 text-blue-300 border border-blue-500/50',
      success: 'bg-green-500/20 text-green-300 border border-green-500/50',
      warning: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50',
      error: 'bg-red-500/20 text-red-300 border border-red-500/50',
      info: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50',
      secondary: 'bg-slate-700/50 text-slate-300 border border-slate-600/50',
      ghost: 'text-slate-400 border-transparent',
    };

    // Size-based styling
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    // Shape-based styling
    const shapeClasses = {
      rounded: 'rounded-md',
      pill: 'rounded-full',
    };

    return (
      <span
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center gap-1.5 font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
          // Variant
          variantClasses[variant],
          // Size
          sizeClasses[size],
          // Shape
          shapeClasses[shape],
          className,
        )}
        aria-label={ariaLabel}
        data-testid={testId}
        {...props}
      >
        {icon && <span className="inline-flex shrink-0">{icon}</span>}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

export { Badge };
