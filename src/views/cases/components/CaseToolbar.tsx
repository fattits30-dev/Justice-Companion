import { Plus, Briefcase } from "lucide-react";
import { Button } from "../../../components/ui/Button.tsx";
import type {
  CaseStatus,
  CaseType,
} from "../../../domains/cases/entities/Case.ts";
import { statusFilterOptions, typeFilterOptions } from "../constants.ts";

interface CaseToolbarProps {
  filterStatus: CaseStatus | "all";
  filterType: CaseType | "all";
  onStatusChange: (value: CaseStatus | "all") => void;
  onTypeChange: (value: CaseType | "all") => void;
  onCreateCase: () => void;
}

export function CaseToolbar({
  filterStatus,
  filterType,
  onStatusChange,
  onTypeChange,
  onCreateCase,
}: CaseToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Briefcase className="w-6 h-6 text-primary-400" />
        <h1 className="text-2xl font-bold text-white">Case Management</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <select
          value={filterStatus}
          onChange={(event) =>
            onStatusChange(event.target.value as CaseStatus | "all")
          }
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all [&>option]:text-gray-900 [&>option]:bg-white"
        >
          {statusFilterOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="text-gray-900 bg-white"
            >
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(event) =>
            onTypeChange(event.target.value as CaseType | "all")
          }
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all [&>option]:text-gray-900 [&>option]:bg-white"
        >
          {typeFilterOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="text-gray-900 bg-white"
            >
              {option.label}
            </option>
          ))}
        </select>

        <Button variant="primary" icon={<Plus />} onClick={onCreateCase}>
          New Case
        </Button>
      </div>
    </div>
  );
}
