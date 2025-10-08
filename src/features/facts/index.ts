/**
 * Facts Feature - Barrel Export
 *
 * Provides centralized exports for the facts feature including:
 * - Components: UserFactsPanel, CaseFactsPanel
 * - Hooks: useUserFacts, useCaseFacts
 * - Services: UserFactsService, CaseFactsService
 *
 * This barrel export enables clean imports from consumers:
 * import { UserFactsPanel, useUserFacts } from '@/features/facts';
 */

// Components
export { UserFactsPanel } from './components/UserFactsPanel';
export { CaseFactsPanel } from './components/CaseFactsPanel';

// Hooks
export { useUserFacts } from './hooks/useUserFacts';
export { useCaseFacts } from './hooks/useCaseFacts';

// Services
export { UserFactsService } from './services/UserFactsService';
export { CaseFactsService } from './services/CaseFactsService';

// Re-export types for convenience
export type { UserFactsPanelProps } from './components/UserFactsPanel';
export type { CaseFactsPanelProps } from './components/CaseFactsPanel';
