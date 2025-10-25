import type { EvidenceType } from '../../domains/evidence/entities/Evidence.ts';

export const evidenceTypeMetadata: Record<
  EvidenceType,
  { label: string; shortLabel: string; accent: string }
> = {
  document: { label: 'Document', shortLabel: 'DOC', accent: 'bg-blue-900 text-blue-200' },
  photo: { label: 'Photo', shortLabel: 'IMG', accent: 'bg-purple-900 text-purple-200' },
  email: { label: 'Email', shortLabel: 'EML', accent: 'bg-teal-900 text-teal-200' },
  recording: { label: 'Recording', shortLabel: 'AUD', accent: 'bg-amber-900 text-amber-200' },
  note: { label: 'Note', shortLabel: 'NOTE', accent: 'bg-rose-900 text-rose-200' },
  witness: { label: 'Witness', shortLabel: 'WIT', accent: 'bg-slate-900 text-slate-200' },
};

export const evidenceFilterOptions: Array<{ value: EvidenceType | 'all'; label: string }> = [
  { value: 'all', label: 'All types' },
  ...Object.entries(evidenceTypeMetadata).map(([value, meta]) => ({
    value: value as EvidenceType,
    label: meta.label,
  })),
];
