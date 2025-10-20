/**
 * Chat Feature - Public API
 *
 * This barrel export file provides a clean public API for the chat feature.
 * Import from '@/features/chat' instead of directly importing from subfolders.
 *
 * Example:
 *   import { ChatWindow, useAI } from '@/features/chat';
 */

// Components
export { ChatWindow } from './components/ChatWindow.ts';
export { ChatInput } from './components/ChatInput.ts';
export { FloatingChatInput } from './components/FloatingChatInput.ts';
export { MessageBubble } from './components/MessageBubble.ts';
export { MessageList } from './components/MessageList.ts';
export { ChatPostItNotes } from './components/ChatPostItNotes.ts';
export { ChatNotesPanel } from './components/ChatNotesPanel.ts';
export { default as SidebarCaseContext } from './components/SidebarCaseContext.ts';
export { SidebarProfile } from './components/SidebarProfile.ts';

// Hooks
export { useAI } from './hooks/useAI.ts';
export type { UseAIReturn, AILoadingState, ProgressStage } from './hooks/useAI.ts';

// IntegratedAIService removed - backend only (uses error-logger with fs/path)

// Re-export component prop types for external consumers
export type { MessageBubbleProps } from './components/MessageBubble.ts';
export type { MessageListProps } from './components/MessageList.ts';
