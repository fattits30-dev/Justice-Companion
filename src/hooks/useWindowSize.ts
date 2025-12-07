import { useEffect, useState } from "react";

interface WindowSize {
  readonly width: number;
  readonly height: number;
}

function getInitialSize(): WindowSize {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Tracks the viewport size and updates whenever the window is resized.
 * Components can use this to derive viewport-relative dimensions while
 * staying resilient to SSR where "window" is unavailable.
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(getInitialSize);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
