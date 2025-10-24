import type { Evidence } from '../../../models/Evidence.ts';
import { EvidenceCard } from './EvidenceCard.tsx';

interface EvidenceListProps {
  evidence: Evidence[];
  onDelete: (id: number) => void;
}

export function EvidenceList({ evidence, onDelete }: EvidenceListProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {evidence.map((item) => (
        <EvidenceCard key={item.id} evidence={item} onDelete={onDelete} />
      ))}
    </div>
  );
}
