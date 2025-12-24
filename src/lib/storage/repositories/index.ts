/**
 * Repository Index - Export all repositories
 */

export {
  BaseRepository,
  type BaseEntity,
  type RepositoryOptions,
} from "./BaseRepository";

export {
  CasesRepository,
  getCasesRepository,
  type LocalCase,
  type CaseStatus,
  type CaseType,
  type CreateCaseInput,
  type UpdateCaseInput,
} from "./CasesRepository";

export {
  NotesRepository,
  getNotesRepository,
  type LocalNote,
  type CreateNoteInput,
  type UpdateNoteInput,
} from "./NotesRepository";

export {
  ConversationsRepository,
  MessagesRepository,
  getConversationsRepository,
  getMessagesRepository,
  type LocalConversation,
  type LocalMessage,
  type MessageRole,
  type CreateConversationInput,
  type CreateMessageInput,
} from "./ConversationsRepository";

export {
  SettingsRepository,
  getSettingsRepository,
  type SettingsKey,
  type SettingEntry,
  type AIProviderConfig,
} from "./SettingsRepository";
