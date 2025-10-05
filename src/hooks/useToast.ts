import { useToastContext } from '../contexts/ToastContext';

export function useToast() {
  const { showToast, hideToast } = useToastContext();

  return {
    showToast,
    hideToast,
    // Convenience methods
    success: (message: string, duration?: number) => showToast('success', message, duration),
    error: (message: string, duration?: number) => showToast('error', message, duration),
    warning: (message: string, duration?: number) => showToast('warning', message, duration),
    info: (message: string, duration?: number) => showToast('info', message, duration),
  };
}
