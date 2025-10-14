import { cn } from '@/lib/utils';
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/**
 * Modern input component with 2025 design standards
 * Features:
 * - Clean, minimal design with subtle borders
 * - Smooth focus transitions
 * - Error state styling
 * - Accessibility support
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          'flex h-12 w-full rounded-xl border bg-transparent px-4 py-3 text-base text-white',
          'transition-all duration-200 ease-in-out',
          // Typography
          'placeholder:text-slate-300',
          // Focus state with glow
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          // Default state with blue glow
          !error && [
            'border-slate-700/50',
            'focus:border-blue-500 focus:ring-blue-500/20 focus:ring-offset-slate-950',
            'focus:shadow-lg focus:shadow-blue-500/50',
          ],
          // Error state with red glow
          error && [
            'border-red-500/50',
            'focus:border-red-500 focus:ring-red-500/20 focus:ring-offset-slate-950',
            'focus:shadow-lg focus:shadow-red-500/50',
          ],
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
