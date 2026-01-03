import { memo, useCallback, useMemo } from "react";
import { VirtualizedGrid } from "../../../components/virtualization/VirtualizedGrid.tsx";
import type { Case } from "../../../domains/cases/entities/Case.ts";
import { useWindowSize } from "../../../hooks/useWindowSize.ts";
import { CaseCard } from "./CaseCard.tsx";

interface CaseListProps {
  readonly cases: readonly Case[];
  readonly onDelete: (caseId: number) => void;
  readonly onView?: (caseId: number) => void;
}

function CaseListComponent({ cases, onDelete, onView }: CaseListProps) {
  const { height: windowHeight } = useWindowSize();

  const renderCaseCard = useCallback(
    (caseItem: Case) => (
      <CaseCard caseItem={caseItem} onDelete={onDelete} onView={onView} />
    ),
    [onDelete, onView]
  );

  const gridMaxHeight = useMemo(() => {
    if (!windowHeight) {
      return 960;
    }
    const availableHeight = windowHeight - 420;
    return Math.min(960, Math.max(420, availableHeight));
  }, [windowHeight]);

  return (
    <VirtualizedGrid
      items={cases}
      renderItem={renderCaseCard}
      itemKey={(item) => item.id}
      className="mt-8"
      estimatedRowHeight={380}
      minHeight={360}
      maxHeight={gridMaxHeight}
      virtualizationThreshold={18}
    />
  );
}

// Export memoized component to prevent unnecessary re-renders when parent state changes
export const CaseList = memo(CaseListComponent);
