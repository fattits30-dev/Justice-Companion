/**
 * Shared UI Type Definitions
 *
 * Central location for all UI-related TypeScript types used across components.
 * Ensures consistency and type safety throughout the application.
 */

/**
 * Application view types
 * Used for navigation and routing
 */
export type ViewType = 'dashboard' | 'chat' | 'cases' | 'case-detail' | 'documents' | 'settings';

/**
 * Standard size scale
 * Used for buttons, inputs, badges, etc.
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Component visual variants
 * Maps to design system color palette
 */
export type Variant =
  | 'primary' // Blue - main actions
  | 'secondary' // Gold - accent actions
  | 'success' // Green - positive feedback
  | 'warning' // Yellow - caution
  | 'error' // Red - errors/destructive
  | 'info' // Cyan - informational
  | 'ghost' // Transparent - subtle actions
  | 'default'; // Neutral - standard appearance

/**
 * Entity status types
 * Used for cases, conversations, documents, etc.
 */
export type Status = 'active' | 'inactive' | 'pending' | 'closed' | 'archived' | 'draft';

/**
 * Base props for all UI components
 * Provides consistent interface across component library
 */
export interface BaseComponentProps {
  /**
   * Optional CSS class name for custom styling
   */
  className?: string;

  /**
   * Child elements to render
   */
  children?: React.ReactNode;

  /**
   * Accessibility label for screen readers
   * Required for icon-only buttons and interactive elements
   */
  'aria-label'?: string;

  /**
   * Optional data-testid for testing
   */
  'data-testid'?: string;
}

/**
 * Props for components that can be disabled
 */
export interface DisableableProps {
  disabled?: boolean;
}

/**
 * Props for components with loading states
 */
export interface LoadableProps {
  isLoading?: boolean;
}

/**
 * Props for components that trigger actions
 */
export interface ActionProps {
  onClick?: (event: React.MouseEvent | React.KeyboardEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * Combined props for interactive components
 */
export interface InteractiveComponentProps
  extends BaseComponentProps,
    DisableableProps,
    LoadableProps,
    ActionProps {}

/**
 * Responsive breakpoint values (px)
 * Matches Tailwind CSS v4 defaults
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Breakpoint type (for hooks)
 */
export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Z-index scale
 * Ensures consistent layering
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

/**
 * Animation duration values (ms)
 */
export const DURATION = {
  fast: 150,
  base: 300,
  slow: 500,
} as const;

/**
 * Common easing functions
 */
export const EASING = {
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;
