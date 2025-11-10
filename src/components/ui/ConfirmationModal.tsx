import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "./Button.tsx";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: (confirmed: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onClose(true);
  };

  const handleCancel = () => {
    onClose(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: "text-red-400",
          button: "bg-red-500 hover:bg-red-600",
          border: "border-red-500/20",
          bg: "bg-red-900/20",
        };
      case "warning":
        return {
          icon: "text-yellow-400",
          button: "bg-yellow-500 hover:bg-yellow-600",
          border: "border-yellow-500/20",
          bg: "bg-yellow-900/20",
        };
      case "info":
      default:
        return {
          icon: "text-blue-400",
          button: "bg-blue-500 hover:bg-blue-600",
          border: "border-blue-500/20",
          bg: "bg-blue-900/20",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`w-full max-w-md rounded-xl border ${styles.border} ${styles.bg} backdrop-blur-md shadow-xl`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${styles.bg}`}>
                  <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              </div>
              <button
                onClick={handleCancel}
                className="p-1 text-white/60 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-white/90 leading-relaxed">{message}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <Button
                onClick={handleCancel}
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                {cancelText}
              </Button>
              <Button
                onClick={handleConfirm}
                className={`${styles.button} text-white`}
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
