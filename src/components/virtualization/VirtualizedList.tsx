import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useRef } from "react";
import { VariableSizeList, type ListChildComponentProps } from "react-window";
import { useElementSize } from "../../hooks/useElementSize.ts";

interface VirtualizedListProps<T> {
  readonly items: readonly T[];
  readonly renderItem: (item: T, index: number) => ReactNode;
  readonly itemKey?: (item: T, index: number) => string | number;
  readonly className?: string;
  readonly estimatedItemHeight?: number;
  readonly overscanCount?: number;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly virtualizationThreshold?: number;
}

const VirtualizedListComponent = <T,>(props: VirtualizedListProps<T>) => {
  const {
    items,
    renderItem,
    itemKey,
    className,
    estimatedItemHeight = 220,
    overscanCount = 4,
    minHeight = 320,
    maxHeight = 960,
    virtualizationThreshold = 12,
  } = props;

  const shouldVirtualize = items.length > virtualizationThreshold;
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const listRef = useRef<VariableSizeList>(null);
  const sizeMap = useRef(new Map<number, number>());

  const getItemSize = useCallback(
    (index: number) => sizeMap.current.get(index) ?? estimatedItemHeight,
    [estimatedItemHeight]
  );

  const setItemSize = useCallback((index: number, measurement: number) => {
    const nextValue = Math.max(measurement, 1);
    if (sizeMap.current.get(index) === nextValue) {
      return;
    }
    sizeMap.current.set(index, nextValue);
    listRef.current?.resetAfterIndex(index);
  }, []);

  useEffect(() => {
    sizeMap.current.clear();
    listRef.current?.resetAfterIndex(0, true);
  }, [items]);

  const constrainedHeight = Math.max(
    minHeight,
    Math.min(maxHeight, items.length * estimatedItemHeight)
  );

  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = items[index];
      if (!item) {
        return null;
      }

      const measuredRef = (node: HTMLDivElement | null) => {
        if (!node) {
          return;
        }
        const height = node.getBoundingClientRect().height;
        setItemSize(index, height);
      };

      return (
        <div style={style}>
          <div ref={measuredRef} className="pb-6">
            {renderItem(item, index)}
          </div>
        </div>
      );
    },
    [items, renderItem, setItemSize]
  );

  if (!shouldVirtualize) {
    return (
      <div className={className}>
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
          itemCount={items.length}
          itemSize={getItemSize}
          overscanCount={overscanCount}
          ref={listRef}
          className="virtualized-list"
        >
          {Row}
        </VariableSizeList>
      )}
    </div>
  );
};

export const VirtualizedList = memo(
  VirtualizedListComponent
) as typeof VirtualizedListComponent;
