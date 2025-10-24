import type { CaseStatus, CaseType } from '../../models/Case.ts';

export const statusStyles: Record<CaseStatus, string> = {
  active: 'bg-green-500/20 text-green-200 border-green-500/40',
  pending: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  closed: 'bg-slate-500/30 text-slate-200 border-slate-500/40',
};

export const caseTypeMetadata: Record<
  CaseType,
  { shortLabel: string; displayLabel: string; accent: string }
> = {
  employment: { shortLabel: 'EMP', displayLabel: 'Employment', accent: 'bg-blue-900 text-blue-200' },
  housing: { shortLabel: 'HSG', displayLabel: 'Housing', accent: 'bg-indigo-900 text-indigo-200' },
  consumer: { shortLabel: 'CON', displayLabel: 'Consumer', accent: 'bg-teal-900 text-teal-200' },
  family: { shortLabel: 'FAM', displayLabel: 'Family', accent: 'bg-purple-900 text-purple-200' },
  debt: { shortLabel: 'DEB', displayLabel: 'Debt', accent: 'bg-rose-900 text-rose-200' },
  other: { shortLabel: 'OTH', displayLabel: 'Other', accent: 'bg-slate-800 text-slate-200' },
};

export const statusFilterOptions: Array<{ value: CaseStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
];

export const typeFilterOptions: Array<{ value: CaseType | 'all'; label: string }> = [
  { value: 'all', label: 'All types' },
  ...Object.entries(caseTypeMetadata).map(([value, meta]) => ({
    value: value as CaseType,
    label: meta.displayLabel,
  })),
];
