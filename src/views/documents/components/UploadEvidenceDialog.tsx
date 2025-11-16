import { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload } from "lucide-react";
import { Card } from "../../../components/ui/Card.tsx";
import { Button } from "../../../components/ui/Button.tsx";
import type { EvidenceType } from "../../../domains/evidence/entities/Evidence.ts";
import { evidenceTypeMetadata } from "../constants.ts";
import { showWarning } from "../../../components/ui/Toast.tsx";

export interface UploadEvidenceInput {
  file: File;
  title: string;
  evidenceType: EvidenceType;
  obtainedDate?: string;
}

interface UploadEvidenceDialogProps {
  onClose: () => void;
  onUpload: (input: UploadEvidenceInput) => void;
}

export function UploadEvidenceDialog({
  onClose,
  onUpload,
}: UploadEvidenceDialogProps) {
  const [title, setTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("document");
  const [obtainedDate, setObtainedDate] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      showWarning("Please select a file");
      return;
    }
    if (!title.trim()) {
      showWarning("Please enter a title");
      return;
    }

    onUpload({
      file,
      title: title.trim(),
      evidenceType,
      obtainedDate: obtainedDate || undefined,
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
          aria-labelledby="upload-evidence-dialog-title"
        >
          <div className="flex items-center justify-between border-b border-gray-700/50 pb-4 mb-4">
            <h2
              id="upload-evidence-dialog-title"
              className="text-2xl font-bold text-white"
            >
              Upload Evidence
            </h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              icon={<X />}
              aria-label="Close upload evidence dialog"
              className="rounded-full"
            />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-white">File *</span>
              <input
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="w-full cursor-pointer rounded-lg border border-gray-700 bg-primary-900 px-4 py-2 text-white file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:text-white hover:file:bg-primary-700 focus:border-primary-500 focus:outline-hidden"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-white">Title *</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g., Employment Contract 2024"
                className="w-full rounded-lg border border-gray-700 bg-primary-900 px-4 py-2 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-hidden"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-white">
                Evidence Type *
              </span>
              <select
                value={evidenceType}
                onChange={(event) =>
                  setEvidenceType(event.target.value as EvidenceType)
                }
                className="w-full rounded-lg border border-gray-700 bg-primary-900 px-4 py-2 text-white focus:border-primary-500 focus:outline-hidden"
              >
                {Object.entries(evidenceTypeMetadata).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-white">
                Date Obtained
              </span>
              <input
                type="date"
                value={obtainedDate}
                onChange={(event) => setObtainedDate(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-primary-900 px-4 py-2 text-white focus:border-primary-500 focus:outline-hidden"
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
                icon={<Upload />}
                iconPosition="left"
                fullWidth
              >
                Upload
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
