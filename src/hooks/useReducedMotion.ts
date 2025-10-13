import { useEffect, useState } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 * Respects the prefers-reduced-motion media query for accessibility
 *
 * @returns {boolean} true if user prefers reduced motion, false otherwise
 *
 * @example
 * const prefersReducedMotion = useReducedMotion();
 *
 * // Use with Framer Motion
 * <motion.div
 *   initial={prefersReducedMotion ? false : { opacity: 0 }}
 *   animate={{ opacity: 1 }}
 * />
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is defined (SSR safety)
    if (typeof window === 'undefined') {
      return;
    }

    // Create media query for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Handler for changes
    const handleChange = (event: MediaQueryListEvent): void => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener (using modern addEventListener)
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}
