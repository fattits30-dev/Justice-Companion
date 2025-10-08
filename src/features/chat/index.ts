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
export { ChatWindow } from './components/ChatWindow';
export { ChatInput } from './components/ChatInput';
export { FloatingChatInput } from './components/FloatingChatInput';
export { MessageBubble } from './components/MessageBubble';
export { MessageList } from './components/MessageList';
export { ChatPostItNotes } from './components/ChatPostItNotes';
export { ChatNotesPanel } from './components/ChatNotesPanel';
export { default as SidebarCaseContext } from './components/SidebarCaseContext';
export { SidebarProfile } from './components/SidebarProfile';

// Hooks
export { useAI } from './hooks/useAI';
export type { UseAIReturn, AILoadingState, ProgressStage } from './hooks/useAI';

// IntegratedAIService removed - backend only (uses error-logger with fs/path)

// Re-export component prop types for external consumers
export type { MessageBubbleProps } from './components/MessageBubble';
export type { MessageListProps } from './components/MessageList';
