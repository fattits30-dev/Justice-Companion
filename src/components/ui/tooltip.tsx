import { cn } from '@/lib/utils';
import type { BaseComponentProps } from '@/types/ui.types';
import * as React from 'react';

/**
 * Tooltip Component - Simple, accessible tooltips
 *
 * Features:
 * - Position options (top, bottom, left, right)
 * - Delay before showing
 * - Accessible (ARIA labels)
 * - Keyboard accessible
 * - Glassmorphism styling
 *
 * Usage:
 * ```tsx
 * <Tooltip content="Delete this item" position="top">
 *   <button>Delete</button>
 * </Tooltip>
 * ```
 */

export interface TooltipProps extends BaseComponentProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing (ms) */
  delay?: number;
  /** Children (trigger element) */
  children: React.ReactElement;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 200,
  children,
  'aria-label': ariaLabel,
  'data-testid': testId,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = (): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = (): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Position-based styling
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2 mt-2',
    left: 'right-full top-1/2 -translate-x-2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 translate-x-2 -translate-y-1/2 ml-2',
  };

  // Arrow position classes
  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45',
    left: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 rotate-45',
    right: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45',
  };

  // Clone child with handlers
  const childProps = {
    ...(children.props as Record<string, unknown>),
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
    'aria-describedby': isVisible ? 'tooltip' : undefined,
  };

  return (
    <div className="relative inline-block" data-testid={testId}>
      {React.cloneElement(children, childProps as Record<string, unknown>)}

      {isVisible && (
        <div
          id="tooltip"
          role="tooltip"
          aria-label={ariaLabel}
          className={cn(
            // Base styles
            'absolute z-50 px-3 py-2 text-sm font-medium text-slate-100 whitespace-nowrap',
            // Glassmorphism
            'bg-slate-800/95 backdrop-blur-sm rounded-lg border border-slate-700/50',
            'shadow-lg shadow-black/30',
            // Animation
            'animate-in fade-in-0 zoom-in-95 duration-200',
            // Position
            positionClasses[position],
          )}
        >
          {content}
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-2 h-2 bg-slate-800/95 border-slate-700/50',
              arrowClasses[position],
              position === 'top' && 'border-b border-r',
              position === 'bottom' && 'border-t border-l',
              position === 'left' && 'border-t border-r',
              position === 'right' && 'border-b border-l',
            )}
          />
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';

export { Tooltip };
