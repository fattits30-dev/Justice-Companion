import { toast } from 'sonner';

/**
 * Hook for showing toast notifications using Sonner
 * Replaces the old ToastContext with a simpler, more powerful toast system
 *
 * Usage:
 * ```tsx
 * const toast = useToast();
 * toast.success('Operation completed!');
 * toast.error('Something went wrong');
 * toast.warning('Please review this');
 * toast.info('FYI: New update available');
 * ```
 */
export function useToast() {
  return {
    // Direct toast function for custom usage
    toast,
    // Convenience methods with consistent API
    success: (message: string, duration?: number) => toast.success(message, { duration }),
    error: (message: string, duration?: number) => toast.error(message, { duration }),
    warning: (message: string, duration?: number) => toast.warning(message, { duration }),
    info: (message: string, duration?: number) => toast.info(message, { duration }),
    // Promise-based loading states
    promise: toast.promise,
    // Dismiss specific toast
    dismiss: toast.dismiss,
  };
}
