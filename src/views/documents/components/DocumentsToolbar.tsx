import { Upload, FileText } from "lucide-react";
import { Button } from "../../../components/ui/Button.tsx";
import type { EvidenceType } from "../../../domains/evidence/entities/Evidence.ts";
import { evidenceFilterOptions } from "../constants.ts";

interface DocumentsToolbarProps {
  cases: Array<{ id: number; title: string }>;
  selectedCaseId: number | null;
  onCaseSelect: (id: number | null) => void;
  filterType: EvidenceType | "all";
  onFilterChange: (value: EvidenceType | "all") => void;
  onUploadClick: () => void;
  isUploadDisabled: boolean;
}

export function DocumentsToolbar({
  cases,
  selectedCaseId,
  onCaseSelect,
  filterType,
  onFilterChange,
  onUploadClick,
  isUploadDisabled,
}: DocumentsToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      {/* Title */}
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary-400" />
        <h1 className="text-2xl font-bold text-white">Evidence & Documents</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <select
          value={selectedCaseId ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            onCaseSelect(value ? Number(value) : null);
          }}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all [&>option]:text-gray-900 [&>option]:bg-white"
        >
          <option value="" className="text-gray-900 bg-white">Select a case</option>
          {cases.map((caseItem) => (
            <option key={caseItem.id} value={caseItem.id} className="text-gray-900 bg-white">
              {caseItem.title}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(event) =>
            onFilterChange(event.target.value as EvidenceType | "all")
          }
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all [&>option]:text-gray-900 [&>option]:bg-white"
        >
          {evidenceFilterOptions.map((option) => (
            <option key={option.value} value={option.value} className="text-gray-900 bg-white">
              {option.label}
            </option>
          ))}
        </select>

        <Button
          variant="primary"
          icon={<Upload />}
          onClick={onUploadClick}
          disabled={isUploadDisabled}
        >
          Upload Evidence
        </Button>
      </div>
    </div>
  );
}
