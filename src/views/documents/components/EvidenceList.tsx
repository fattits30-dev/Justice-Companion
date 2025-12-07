import { memo, useCallback, useMemo } from "react";
import { VirtualizedGrid } from "../../../components/virtualization/VirtualizedGrid.tsx";
import type { Evidence } from "../../../domains/evidence/entities/Evidence.ts";
import { useWindowSize } from "../../../hooks/useWindowSize.ts";
import { EvidenceCard } from "./EvidenceCard.tsx";

interface EvidenceListProps {
  evidence: Evidence[];
  onDelete: (id: number) => void;
}

function EvidenceListComponent({ evidence, onDelete }: EvidenceListProps) {
  const { height: windowHeight } = useWindowSize();

  const renderEvidenceCard = useCallback(
    (item: Evidence) => <EvidenceCard evidence={item} onDelete={onDelete} />,
    [onDelete]
  );

  const gridMaxHeight = useMemo(() => {
    if (!windowHeight) {
      return 720;
    }
    const availableHeight = windowHeight - 480;
    return Math.min(720, Math.max(360, availableHeight));
  }, [windowHeight]);

  return (
    <VirtualizedGrid
      items={evidence}
      renderItem={renderEvidenceCard}
      itemKey={(item) => item.id}
      estimatedRowHeight={340}
      minHeight={320}
      maxHeight={gridMaxHeight}
      virtualizationThreshold={12}
    />
  );
}

// Export memoized component to prevent unnecessary re-renders when parent state changes
export const EvidenceList = memo(EvidenceListComponent);
