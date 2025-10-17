import * as React from 'react';
import { cn } from '@/lib/utils';
import type { BaseComponentProps, Size } from '@/types/ui.types';

export interface SpinnerProps extends BaseComponentProps {
  size?: Extract<Size, 'sm' | 'md' | 'lg' | 'xl'>;
  color?: 'primary' | 'white' | 'gray' | 'success' | 'warning' | 'error';
  text?: string;
  className?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      color = 'primary',
      text,
      className,
      'aria-label': ariaLabel,
      'data-testid': testId,
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: 'w-4 h-4 border-2',
      md: 'w-8 h-8 border-2',
      lg: 'w-12 h-12 border-[3px]',
      xl: 'w-16 h-16 border-4',
    };
    const colorClasses = {
      primary: 'border-blue-500/30 border-t-blue-500',
      white: 'border-white/30 border-t-white',
      gray: 'border-gray-500/30 border-t-gray-500',
      success: 'border-green-500/30 border-t-green-500',
      warning: 'border-yellow-500/30 border-t-yellow-500',
      error: 'border-red-500/30 border-t-red-500',
    };
    const textColorClasses = {
      primary: 'text-blue-300',
      white: 'text-white',
      gray: 'text-gray-400',
      success: 'text-green-300',
      warning: 'text-yellow-300',
      error: 'text-red-300',
    };
    const textSizeClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg' };

    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center justify-center gap-3', className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={ariaLabel ?? text ?? 'Loading'}
        data-testid={testId}
      >
        <div
          className={cn(
            'rounded-full animate-spin motion-reduce:animate-pulse',
            sizeClasses[size],
            colorClasses[color],
          )}
        >
          <span className="sr-only">{text ?? 'Loading...'}</span>
        </div>
        {text && (
          <p className={cn('font-medium', textSizeClasses[size], textColorClasses[color])}>
            {text}
          </p>
        )}
      </div>
    );
  },
);

Spinner.displayName = 'Spinner';

export { Spinner };
export const LoadingSpinner = Spinner;
export type LoadingSpinnerProps = SpinnerProps;
