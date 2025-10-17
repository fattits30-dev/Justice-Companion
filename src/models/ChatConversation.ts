export interface ChatConversation {
  id: number;
  caseId: number | null; // Nullable: can have general chats without case context
  userId: number; // Owner of the conversation (for authorization)
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  thinkingContent: string | null; // AI reasoning from <think> tags
  timestamp: string;
  tokenCount: number | null;
}

export interface CreateConversationInput {
  caseId?: number | null;
  userId: number; // Required: identifies conversation owner
  title: string;
}

export interface CreateMessageInput {
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  thinkingContent?: string | null;
  tokenCount?: number | null;
}

// Conversation with its messages
export interface ConversationWithMessages extends ChatConversation {
  messages: ChatMessage[];
}
