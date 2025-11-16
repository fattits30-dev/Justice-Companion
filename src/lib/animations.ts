/**
 * Animation Constants for Framer Motion
 *
 * Centralized animation variants to ensure consistency across the application.
 * All animations respect prefers-reduced-motion via useReducedMotion hook.
 *
 * Usage:
 * import { FADE_IN_UP, STAGGER_CONTAINER } from '@/lib/animations';
 *
 * <motion.div variants={FADE_IN_UP} initial="hidden" animate="visible">
 */

import type { Variants } from "framer-motion";

/**
 * Fade in from bottom
 * Common for page/section entries
 */
export const FADE_IN_UP: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

/**
 * Fade in from top
 * Good for dropdown menus and popovers
 */
export const FADE_IN_DOWN: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

/**
 * Fade in from left
 * Useful for sidebar and drawer animations
 */
export const FADE_IN_LEFT: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

/**
 * Fade in from right
 * Good for slide-out panels
 */
export const FADE_IN_RIGHT: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

/**
 * Simple fade in/out
 * Subtle, minimal movement
 */
export const FADE_IN: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

/**
 * Scale in with slight bounce
 * Great for modals and important elements
 */
export const SCALE_IN: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.68, -0.55, 0.265, 1.55], // bounce easing
    },
  },
};

/**
 * Stagger container
 * Use on parent element to stagger child animations
 *
 * Example:
 * <motion.div variants={STAGGER_CONTAINER}>
 *   {items.map(item => (
 *     <motion.div key={item.id} variants={FADE_IN_UP} />
 *   ))}
 * </motion.div>
 */
export const STAGGER_CONTAINER: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/**
 * Fast stagger container
 * For lists with many items
 */
export const STAGGER_CONTAINER_FAST: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0,
    },
  },
};

/**
 * Slow stagger container
 * For dramatic reveals
 */
export const STAGGER_CONTAINER_SLOW: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

/**
 * Slide in from left (full width)
 * Good for mobile menu overlays
 */
export const SLIDE_IN_LEFT: Variants = {
  hidden: {
    x: "-100%",
  },
  visible: {
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    x: "-100%",
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

/**
 * Slide in from right (full width)
 * Good for side panels
 */
export const SLIDE_IN_RIGHT: Variants = {
  hidden: {
    x: "100%",
  },
  visible: {
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    x: "100%",
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

/**
 * Backdrop fade in/out
 * Use for modal backgrounds
 */
export const BACKDROP_FADE: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Card hover animation
 * Subtle lift effect on hover
 *
 * Usage:
 * <motion.div whileHover={CARD_HOVER}>
 */
export const CARD_HOVER = {
  scale: 1.02,
  y: -4,
  transition: {
    duration: 0.2,
    ease: "easeOut" as const,
  },
};

/**
 * Button press animation
 * Quick scale down on tap
 *
 * Usage:
 * <motion.button whileTap={BUTTON_TAP}>
 */
export const BUTTON_TAP = {
  scale: 0.95,
  transition: {
    duration: 0.1,
  },
};

/**
 * Rotate in animation
 * Good for icons and loaders
 */
export const ROTATE_IN: Variants = {
  hidden: {
    opacity: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    rotate: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

/**
 * Expand vertically
 * Good for accordion/collapse animations
 */
export const EXPAND_VERTICAL: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

/**
 * Pulse animation
 * For attention-grabbing elements
 *
 * Usage:
 * <motion.div animate={PULSE}>
 */
export const PULSE = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};
