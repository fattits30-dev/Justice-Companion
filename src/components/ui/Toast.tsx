import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  id,
  type,
  message,
  duration = 5000,
  onClose,
}: ToastProps): JSX.Element {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'from-green-900/90 to-green-950/90',
      borderColor: 'border-green-500/50',
      iconColor: 'text-green-400',
      textColor: 'text-green-100',
      glowColor: 'shadow-green-500/20',
    },
    error: {
      icon: XCircle,
      bgColor: 'from-red-900/90 to-red-950/90',
      borderColor: 'border-red-500/50',
      iconColor: 'text-red-400',
      textColor: 'text-red-100',
      glowColor: 'shadow-red-500/20',
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'from-amber-900/90 to-amber-950/90',
      borderColor: 'border-amber-500/50',
      iconColor: 'text-amber-400',
      textColor: 'text-amber-100',
      glowColor: 'shadow-amber-500/20',
    },
    info: {
      icon: Info,
      bgColor: 'from-blue-900/90 to-blue-950/90',
      borderColor: 'border-blue-500/50',
      iconColor: 'text-blue-400',
      textColor: 'text-blue-100',
      glowColor: 'shadow-blue-500/20',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md
        ${config.bgColor} ${config.borderColor} ${config.glowColor}
        shadow-xl min-w-[320px] max-w-md
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
      </div>

      {/* Message */}
      <div className={`flex-1 ${config.textColor} text-sm leading-relaxed`}>
        {message}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className={`
          flex-shrink-0 p-1 rounded-lg transition-colors
          hover:bg-white/10
        `}
        aria-label="Close notification"
      >
        <X className={`w-4 h-4 ${config.iconColor}`} />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastProps[];
}

export function ToastContainer({ toasts }: ToastContainerProps): JSX.Element {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
