import { useCallback, useEffect, useRef, useState } from "react";

interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Subscribes to ResizeObserver events for the provided element reference
 * and keeps track of the latest bounding box. Useful for components that need
 * to react to container size changes (e.g., virtualization, canvas rendering).
 */
export function useElementSize<T extends HTMLElement>() {
  const observerRef = useRef<ResizeObserver | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  const cleanup = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  const ref = useCallback(
    (node: T | null) => {
      cleanup();

      if (!node) {
        return;
      }

      observerRef.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        const { width, height } = entry.contentRect;
        setSize((current) => {
          if (current.width === width && current.height === height) {
            return current;
          }
          return { width, height };
        });
      });

      observerRef.current.observe(node);
    },
    [cleanup]
  );

  useEffect(() => cleanup, [cleanup]);

  return { ref, size } as const;
}
