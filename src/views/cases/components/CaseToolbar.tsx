import { Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button.tsx';
import type { CaseStatus, CaseType } from '../../../models/Case.ts';
import { statusFilterOptions, typeFilterOptions } from '../constants.ts';

interface CaseToolbarProps {
  filterStatus: CaseStatus | 'all';
  filterType: CaseType | 'all';
  onStatusChange: (value: CaseStatus | 'all') => void;
  onTypeChange: (value: CaseType | 'all') => void;
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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Cases</h1>
        <p className="text-gray-400">Manage your legal cases</p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex flex-col text-sm text-gray-400">
          <span className="mb-1">Status</span>
          <select
            value={filterStatus}
            onChange={(event) => onStatusChange(event.target.value as CaseStatus | 'all')}
            className="min-w-[150px] rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm text-gray-400">
          <span className="mb-1">Type</span>
          <select
            value={filterType}
            onChange={(event) => onTypeChange(event.target.value as CaseType | 'all')}
            className="min-w-[160px] rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            {typeFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          onClick={onCreateCase}
          variant="primary"
          size="md"
          icon={<Plus />}
          iconPosition="left"
        >
          New Case
        </Button>
      </div>
    </div>
  );
}
