/**
 * Test Utilities
 *
 * Re-exports testing library utilities with custom configurations.
 * Provides a centralized place for test helpers and custom render functions.
 */

import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * Custom render function that wraps components with providers if needed.
 * Currently no providers, but this is where you'd add React Router, Theme Provider, etc.
 *
 * @param ui - React component to render
 * @param options - Render options
 * @returns Render result with additional utilities
 */
export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, options);
}

// Re-export everything from React Testing Library
export { screen, waitFor, userEvent };
export * from '@testing-library/react';