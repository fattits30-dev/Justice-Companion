import { cn } from '@/lib/utils';
import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * Modern button component with 2025 design standards
 * Features:
 * - Multiple variants (primary, secondary, ghost, link)
 * - Size options
 * - Loading state with spinner
 * - Smooth transitions and hover effects
 * - Accessibility support
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref,
  ) => {
    const baseStyles = [
      'inline-flex items-center justify-center gap-2',
      'rounded-xl font-medium',
      'transition-all duration-200 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ];

    const variants = {
      primary: [
        'bg-gradient-to-r from-blue-600 to-blue-700',
        'text-white shadow-lg shadow-blue-600/20',
        'hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-600/30',
        'active:scale-[0.98]',
        'focus:ring-blue-500/50',
      ],
      secondary: [
        'bg-slate-800/50 border border-slate-700/50',
        'text-slate-200',
        'hover:bg-slate-700/50 hover:border-slate-600/50',
        'active:scale-[0.98]',
        'focus:ring-slate-500/50',
      ],
      ghost: [
        'text-slate-300',
        'hover:bg-slate-800/50',
        'active:scale-[0.98]',
        'focus:ring-slate-500/50',
      ],
      link: ['text-blue-400', 'hover:text-blue-300 hover:underline', 'focus:ring-blue-500/50'],
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-12 px-6 text-base',
      lg: 'h-14 px-8 text-lg',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading ? 'true' : undefined}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button };
