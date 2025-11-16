import type { Case } from "../../../domains/cases/entities/Case.ts";
import { CaseCard } from "./CaseCard.tsx";

interface CaseListProps {
  readonly cases: readonly Case[];
  readonly onDelete: (caseId: number) => void;
}

export function CaseList({ cases, onDelete }: CaseListProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {cases.map((caseItem) => (
        <CaseCard key={caseItem.id} caseItem={caseItem} onDelete={onDelete} />
      ))}
    </div>
  );
}
