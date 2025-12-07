/**
 * Test Utilities
 *
 * Re-exports testing library utilities with custom configurations.
 * Provides a centralized place for test helpers and custom render functions.
 */

import type { RenderOptions } from "@testing-library/react";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

/**
 * Custom render function that wraps components with providers if needed.
 * Currently no providers, but this is where you'd add React Router, Theme Provider, etc.
 *
 * @param ui - React component to render
 * @param options - Render options
 * @returns Render result with additional utilities
 */
export function render(ui: ReactElement<any>, options?: RenderOptions) {
  return rtlRender(createElement(MemoryRouter, null, ui), options);
}

// Re-export everything from React Testing Library
export * from "@testing-library/react";
export { screen, userEvent, waitFor };
