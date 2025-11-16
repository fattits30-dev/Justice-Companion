import { useState } from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { Card } from "../../../components/ui/Card.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import type {
  CaseType,
  CreateCaseInput,
} from "../../../domains/cases/entities/Case.ts";
import { caseTypeMetadata } from "../constants.ts";
import { showWarning } from "../../../components/ui/Toast.tsx";

interface CreateCaseDialogProps {
  onClose: () => void;
  onCreate: (input: CreateCaseInput) => void;
}

export function CreateCaseDialog({ onClose, onCreate }: CreateCaseDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("employment");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      showWarning("Please enter a case title");
      return;
    }

    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      caseType,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-lg"
      >
        <Card
          variant="glass"
          className="overflow-visible"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-case-dialog-title"
        >
          <div className="flex items-center justify-between border-b border-gray-700/50 pb-4 mb-4">
            <h2
              id="create-case-dialog-title"
              className="text-2xl font-bold text-white"
            >
              Create New Case
            </h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              icon={<X />}
              aria-label="Close create case dialog"
              className="rounded-full"
            />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-white">
                Case Title *
              </span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g., Unfair Dismissal - Smith v. Acme Corp"
                className="w-full rounded-lg border border-gray-700 bg-primary-900 px-4 py-2 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-hidden"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-white">
                Case Type *
              </span>
              <select
                value={caseType}
                onChange={(event) =>
                  setCaseType(event.target.value as CaseType)
                }
                className="w-full rounded-lg border border-gray-700 bg-primary-900 px-4 py-2 text-white focus:border-primary-500 focus:outline-hidden"
              >
                {Object.entries(caseTypeMetadata).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.displayLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-white">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Brief description of the case..."
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-700 bg-primary-900 px-4 py-2 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-hidden"
              />
            </label>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                size="md"
                fullWidth
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="secondary"
                size="md"
                icon={<Check />}
                iconPosition="left"
                fullWidth
              >
                Create Case
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
