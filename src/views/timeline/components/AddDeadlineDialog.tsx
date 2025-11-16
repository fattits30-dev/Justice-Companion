import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../components/ui/Button.tsx";
import { Card } from "../../../components/ui/Card.tsx";
import type { CreateDeadlineInput } from "../../../domains/timeline/entities/Deadline.ts";

interface AddDeadlineDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    input: CreateDeadlineInput,
  ) => Promise<{ success: boolean; error?: string }>;
  cases: Array<{ id: number; title: string; status: string }>;
  userId: number;
  mode?: "create" | "edit";
  initialValues?: {
    title: string;
    caseId: number;
    deadlineDate: string;
    priority: "high" | "medium" | "low" | "critical";
    description?: string;
  };
}

interface FormData {
  title: string;
  caseId: string;
  deadlineDate: string;
  priority: "high" | "medium" | "low" | "critical";
  description: string;
}

interface FormErrors {
  title?: string;
  caseId?: string;
  deadlineDate?: string;
  description?: string;
  submit?: string;
}

export function AddDeadlineDialog({
  open,
  onClose,
  onSubmit,
  cases,
  userId,
  mode = "create",
  initialValues,
}: AddDeadlineDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    caseId: "",
    deadlineDate: "",
    priority: "medium",
    description: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: "",
        caseId: "",
        deadlineDate: "",
        priority: "medium",
        description: "",
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  // Pre-fill form with initialValues when provided (edit mode)
  useEffect(() => {
    if (open && initialValues) {
      setFormData({
        title: initialValues.title,
        caseId: String(initialValues.caseId),
        deadlineDate: initialValues.deadlineDate,
        priority: initialValues.priority,
        description: initialValues.description || "",
      });
    }
  }, [open, initialValues]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > 200) {
      newErrors.title = "Title must be 200 characters or less";
    }

    if (!formData.caseId) {
      newErrors.caseId = "Case is required";
    }

    if (!formData.deadlineDate) {
      newErrors.deadlineDate = "Date is required";
    } else {
      const selectedDate = new Date(formData.deadlineDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.deadlineDate = "Date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const input: CreateDeadlineInput = {
        userId,
        caseId: parseInt(formData.caseId, 10),
        title: formData.title.trim(),
        deadlineDate: formData.deadlineDate,
        priority: formData.priority,
        description: formData.description.trim() || undefined,
      };

      const result = await onSubmit(input);

      if (result.success) {
        onClose();
      } else {
        setErrors({ submit: result.error || "Failed to create deadline" });
      }
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!open) {
    return null;
  }

  // In edit mode, we don't need cases dropdown since we already have caseId from initialValues
  // Only disable submit in create mode when no cases available
  const noCasesAvailable = mode === "create" && cases.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-lg"
              role="dialog"
              aria-labelledby="dialog-title"
              data-focus-trap="true"
            >
              <Card variant="glass" className="relative" data-variant="glass">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2
                    id="dialog-title"
                    className="text-2xl font-bold text-white"
                  >
                    {mode === "edit" ? "Edit Deadline" : "New Deadline"}
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Close dialog"
                    type="button"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* No Cases Warning */}
                {noCasesAvailable && (
                  <div className="mb-6 p-4 bg-warning-500/10 border border-warning-500/20 rounded-lg">
                    <p className="text-sm text-warning-400">
                      No cases available. Please create a case first before
                      adding deadlines.
                    </p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-white mb-2"
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="
                        w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                        text-white placeholder-white/40
                        focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent
                        transition-all
                      "
                      placeholder="e.g., Submit ET1 Form"
                      disabled={isSubmitting}
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-danger-400">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Case Selection */}
                  <div>
                    <label
                      htmlFor="case"
                      className="block text-sm font-medium text-white mb-2"
                    >
                      Case
                    </label>
                    <select
                      id="case"
                      value={formData.caseId}
                      onChange={(e) =>
                        setFormData({ ...formData, caseId: e.target.value })
                      }
                      className="
                        w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                        text-white
                        focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent
                        transition-all
                      "
                      disabled={isSubmitting || noCasesAvailable}
                      role="combobox"
                    >
                      <option value="">Select a case</option>
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    {errors.caseId && (
                      <p className="mt-1 text-sm text-danger-400">
                        {errors.caseId}
                      </p>
                    )}
                  </div>

                  {/* Deadline Date */}
                  <div>
                    <label
                      htmlFor="date"
                      className="block text-sm font-medium text-white mb-2"
                    >
                      Deadline Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={formData.deadlineDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deadlineDate: e.target.value,
                        })
                      }
                      className="
                        w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                        text-white
                        focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent
                        transition-all
                      "
                      disabled={isSubmitting}
                    />
                    {errors.deadlineDate && (
                      <p className="mt-1 text-sm text-danger-400">
                        {errors.deadlineDate}
                      </p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label
                      htmlFor="priority"
                      className="block text-sm font-medium text-white mb-2"
                    >
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value as
                            | "high"
                            | "medium"
                            | "low"
                            | "critical",
                        })
                      }
                      className="
                        w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                        text-white
                        focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent
                        transition-all
                      "
                      disabled={isSubmitting}
                      role="combobox"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-white mb-2"
                    >
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="
                        w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                        text-white placeholder-white/40
                        focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent
                        transition-all resize-none
                      "
                      placeholder="Add notes or additional details..."
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-lg">
                      <p className="text-sm text-danger-400">{errors.submit}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      fullWidth
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      icon={<Plus />}
                      loading={isSubmitting}
                      disabled={isSubmitting || noCasesAvailable}
                      fullWidth
                    >
                      {isSubmitting
                        ? mode === "edit"
                          ? "Updating..."
                          : "Creating..."
                        : mode === "edit"
                          ? "Update"
                          : "Create"}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
