import { clsx } from "clsx";
import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { VariableSizeList, type ListChildComponentProps } from "react-window";
import { useElementSize } from "../../hooks/useElementSize.ts";

interface BreakpointConfig {
  readonly minWidth: number;
  readonly columns: number;
}

interface VirtualizedGridProps<T> {
  readonly items: readonly T[];
  readonly renderItem: (item: T, index: number) => ReactNode;
  readonly itemKey?: (item: T, index: number) => string | number;
  readonly className?: string;
  readonly estimatedRowHeight?: number;
  readonly overscanCount?: number;
  readonly breakpoints?: readonly BreakpointConfig[];
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly virtualizationThreshold?: number;
}

const DEFAULT_BREAKPOINTS: BreakpointConfig[] = [
  { minWidth: 1280, columns: 3 },
  { minWidth: 768, columns: 2 },
];

function chunkItems<T>(items: readonly T[], chunkSize: number) {
  if (chunkSize <= 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

const VirtualizedGridComponent = <T,>(props: VirtualizedGridProps<T>) => {
  const {
    items,
    renderItem,
    itemKey,
    className,
    estimatedRowHeight = 360,
    overscanCount = 2,
    breakpoints = DEFAULT_BREAKPOINTS,
    minHeight = 320,
    maxHeight = 960,
    virtualizationThreshold = 16,
  } = props;

  const shouldVirtualize = items.length > virtualizationThreshold;

  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const listRef = useRef<VariableSizeList>(null);
  const rowHeights = useRef(new Map<number, number>());

  const sortedBreakpoints = useMemo(
    () => [...breakpoints].sort((a, b) => b.minWidth - a.minWidth),
    [breakpoints]
  );

  const columnCount = useMemo(() => {
    const width = size.width;
    if (width === 0) {
      return 1;
    }

    for (const breakpoint of sortedBreakpoints) {
      if (width >= breakpoint.minWidth) {
        return Math.max(1, Math.min(3, breakpoint.columns));
      }
    }

    return 1;
  }, [size.width, sortedBreakpoints]);

  const columnClassName = useMemo(() => {
    const classes: Record<number, string> = {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
    };
    return classes[columnCount] ?? "grid-cols-1";
  }, [columnCount]);

  const rows = useMemo(
    () => chunkItems(items, columnCount),
    [items, columnCount]
  );

  const getRowHeight = useCallback(
    (index: number) => rowHeights.current.get(index) ?? estimatedRowHeight,
    [estimatedRowHeight]
  );

  const setRowHeight = useCallback((index: number, measurement: number) => {
    const nextHeight = Math.max(measurement, 1);
    const sizeMap = rowHeights.current;
    if (sizeMap.get(index) === nextHeight) {
      return;
    }
    sizeMap.set(index, nextHeight);
    listRef.current?.resetAfterIndex(index);
  }, []);

  // Recalculate cached heights when layout-affecting values change
  useEffect(() => {
    rowHeights.current.clear();
    listRef.current?.resetAfterIndex(0, true);
  }, [columnCount, size.width]);

  const constrainedHeight = Math.max(
    minHeight,
    Math.min(maxHeight, rows.length * estimatedRowHeight)
  );

  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const rowItems = rows[index];
      if (!rowItems) {
        return null;
      }

      const measuredRef = (node: HTMLDivElement | null) => {
        if (!node) {
          return;
        }
        const height = node.getBoundingClientRect().height;
        setRowHeight(index, height);
      };

      return (
        <div style={style}>
          <div ref={measuredRef} className="pb-6">
            <div className={clsx("grid gap-6", columnClassName)}>
              {rowItems.map((item, columnIndex) => {
                const actualIndex = index * columnCount + columnIndex;
                const key = itemKey
                  ? itemKey(item, actualIndex)
                  : `${index}-${columnIndex}-${actualIndex}`;
                return <div key={key}>{renderItem(item, actualIndex)}</div>;
              })}
            </div>
          </div>
        </div>
      );
    },
    [rows, columnClassName, columnCount, itemKey, renderItem, setRowHeight]
  );

  if (!shouldVirtualize) {
    return (
      <div
        className={clsx("grid gap-6 md:grid-cols-2 xl:grid-cols-3", className)}
      >
        {items.map((item, index) => (
          <div key={itemKey ? itemKey(item, index) : index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {size.width === 0 ? null : (
        <VariableSizeList
          height={constrainedHeight}
          width={size.width}
          itemCount={rows.length}
          itemSize={getRowHeight}
          overscanCount={overscanCount}
          ref={listRef}
          className="virtualized-grid"
        >
          {Row}
        </VariableSizeList>
      )}
    </div>
  );
};

export const VirtualizedGrid = memo(
  VirtualizedGridComponent
) as typeof VirtualizedGridComponent;
