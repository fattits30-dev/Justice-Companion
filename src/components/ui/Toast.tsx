import toast, { Toaster, ToastOptions } from "react-hot-toast";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { clsx } from "clsx";

// Toast Provider Component
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
          maxWidth: "420px",
        },
      }}
    />
  );
}

// Custom toast variants
interface CustomToastOptions extends Partial<ToastOptions> {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Success toast
export function showSuccess(message: string, options?: CustomToastOptions) {
  return toast.custom(
    (t) => (
      <ToastContent
        type="success"
        title={options?.title || "Success"}
        description={message}
        visible={t.visible}
        onDismiss={() => toast.dismiss(t.id)}
        action={options?.action}
      />
    ),
    options,
  );
}

// Error toast
export function showError(message: string, options?: CustomToastOptions) {
  return toast.custom(
    (t) => (
      <ToastContent
        type="error"
        title={options?.title || "Error"}
        description={message}
        visible={t.visible}
        onDismiss={() => toast.dismiss(t.id)}
        action={options?.action}
      />
    ),
    { ...options, duration: options?.duration || 6000 },
  );
}

// Warning toast
export function showWarning(message: string, options?: CustomToastOptions) {
  return toast.custom(
    (t) => (
      <ToastContent
        type="warning"
        title={options?.title || "Warning"}
        description={message}
        visible={t.visible}
        onDismiss={() => toast.dismiss(t.id)}
        action={options?.action}
      />
    ),
    options,
  );
}

// Info toast
export function showInfo(message: string, options?: CustomToastOptions) {
  return toast.custom(
    (t) => (
      <ToastContent
        type="info"
        title={options?.title || "Info"}
        description={message}
        visible={t.visible}
        onDismiss={() => toast.dismiss(t.id)}
        action={options?.action}
      />
    ),
    options,
  );
}

// Promise toast (for async operations)
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  },
) {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: (data) =>
        typeof messages.success === "function"
          ? messages.success(data)
          : messages.success,
      error: (error) =>
        typeof messages.error === "function"
          ? messages.error(error)
          : messages.error,
    },
    {
      style: {
        background: "rgba(17, 24, 39, 0.95)",
        backdropFilter: "blur(12px)",
        color: "#fff",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        padding: "16px",
      },
    },
  );
}

// Toast Content Component
interface ToastContentProps {
  type: "success" | "error" | "warning" | "info";
  title: string;
  description: string;
  visible: boolean;
  onDismiss: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function ToastContent({
  type,
  title,
  description,
  visible,
  onDismiss,
  action,
}: ToastContentProps) {
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: {
      bg: "bg-success-500/10",
      border: "border-success-500/20",
      icon: "text-success-400",
      shadow: "shadow-success",
    },
    error: {
      bg: "bg-danger-500/10",
      border: "border-danger-500/20",
      icon: "text-danger-400",
      shadow: "shadow-danger",
    },
    warning: {
      bg: "bg-warning-500/10",
      border: "border-warning-500/20",
      icon: "text-warning-400",
      shadow: "shadow-warning",
    },
    info: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
      icon: "text-cyan-400",
      shadow: "shadow-lg",
    },
  };

  const Icon = icons[type];
  const style = styles[type];

  return (
    <div
      className={clsx(
        "flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md",
        "transition-all duration-300 max-w-md",
        style.bg,
        style.border,
        style.shadow,
        visible ? "animate-slide-left" : "animate-fade-out",
      )}
    >
      {/* Icon */}
      <Icon className={clsx("w-5 h-5 flex-shrink-0 mt-0.5", style.icon)} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="mt-1 text-sm text-white line-clamp-2">{description}</p>

        {/* Action button */}
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
            className={clsx(
              "mt-2 text-sm font-medium underline-offset-2 hover:underline",
              style.icon,
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-white/90 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Utility to dismiss all toasts
export function dismissAll() {
  toast.dismiss();
}

// Export base toast for custom usage
export { toast };

// Example usage:
// import { showSuccess, showError, showWarning, showInfo, showPromise } from './Toast';
//
// showSuccess('Case created successfully!');
// showError('Failed to delete case', { action: { label: 'Retry', onClick: () => retry() } });
// showWarning('You have unsaved changes');
// showInfo('New update available');
//
// showPromise(
//   saveCase(),
//   {
//     loading: 'Saving case...',
//     success: 'Case saved!',
//     error: 'Failed to save case'
//   }
// );
