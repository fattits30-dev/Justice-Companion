import toast, { Toaster, ToastOptions } from "react-hot-toast";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

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
  options?: CustomToastOptions,
) {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: (data) => {
        if (typeof messages.success === "function") {
          return messages.success(data);
        }
        return messages.success;
      },
      error: (error) => {
        if (typeof messages.error === "function") {
          return messages.error(error);
        }
        return messages.error;
      },
    },
    {
      ...options,
      duration: options?.duration || 6000,
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
  const iconMap = {
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const icon = iconMap[type];

  if (!visible) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-white p-4 shadow-lg">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}