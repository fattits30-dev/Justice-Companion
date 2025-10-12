import { cn } from '@/lib/utils';
import * as React from 'react';
import { Input, type InputProps } from './input';

export interface FormFieldProps extends Omit<InputProps, 'error'> {
  label?: string;
  error?: string;
  helperText?: string;
  showLabel?: boolean;
}

/**
 * Form field component that combines label, input, and error message
 * Features:
 * - Optional visible or screen-reader-only label
 * - Error message display
 * - Helper text support
 * - Accessibility support with proper ARIA attributes
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, showLabel = false, className, id, ...props }, ref) => {
    const inputId = id || `field-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn('block text-sm font-medium text-slate-300', !showLabel && 'sr-only')}
          >
            {label}
          </label>
        )}
        <Input
          id={inputId}
          ref={ref}
          error={!!error}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={cn(errorId, helperId)}
          {...props}
        />
        {helperText && !error && (
          <p id={helperId} className="text-sm text-slate-300">
            {helperText}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            className="text-sm text-red-400 flex items-center gap-1"
            role="alert"
            aria-live="polite"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  },
);
FormField.displayName = 'FormField';
