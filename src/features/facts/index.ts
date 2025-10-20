/**
 * Facts Feature - Barrel Export
 *
 * Provides centralized exports for the facts feature including:
 * - Components: UserFactsPanel, CaseFactsPanel
 * - Hooks: useUserFacts, useCaseFacts
 *
 * This barrel export enables clean imports from consumers:
 * import { UserFactsPanel, useUserFacts } from '@/features/facts';
 */

// Components
export { UserFactsPanel } from './components/UserFactsPanel.ts';
export { CaseFactsPanel } from './components/CaseFactsPanel.ts';

// Hooks
export { useUserFacts } from './hooks/useUserFacts.ts';
export { useCaseFacts } from './hooks/useCaseFacts.ts';

// Services removed - backend only (use error-logger with fs/path)
// UserFactsService and CaseFactsService should only be imported in electron/main.ts

// Re-export types for convenience
export type { UserFactsPanelProps } from './components/UserFactsPanel.ts';
export type { CaseFactsPanelProps } from './components/CaseFactsPanel.ts';
