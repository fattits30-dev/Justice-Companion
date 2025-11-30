/**
 * React Query hooks index - re-exports all API hooks.
 *
 * @module api/hooks
 */

// Cases
export {
  caseKeys,
  useCases,
  useCase,
  useCaseStats,
  useCreateCase,
  useUpdateCase,
  useDeleteCase,
} from "./useCases";

// Tags
export {
  tagKeys,
  useTags,
  useTag,
  useTagsForCase,
  useCasesWithTag,
  useTagStatistics,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useAttachTagToCase,
  useRemoveTagFromCase,
} from "./useTags";

// Evidence
export {
  evidenceKeys,
  useAllEvidence,
  useEvidenceByCase,
  useEvidence,
  useEvidencePreview,
  useCreateEvidence,
  useUploadEvidence,
  useUpdateEvidence,
  useDeleteEvidence,
  useParseEvidence,
  useRunOCR,
  useBulkUploadEvidence,
} from "./useEvidence";

// Deadlines
export {
  deadlineKeys,
  useDeadlines,
  useDeadline,
  useUpcomingDeadlines,
  useOverdueDeadlines,
  useDeadlinesByDate,
  useCreateDeadline,
  useUpdateDeadline,
  useDeleteDeadline,
  useMarkDeadlineComplete,
  useSnoozeDeadline,
} from "./useDeadlines";

// Notifications
export {
  notificationKeys,
  useNotifications,
  useUnreadNotificationCount,
  useNotificationStats,
  useNotificationPreferences,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useUpdateNotificationPreferences,
} from "./useNotifications";

// Dashboard
export {
  dashboardKeys,
  useDashboardOverview,
  useDashboardStats,
  useDashboardRecentCases,
  useDashboardUpcomingDeadlines,
  useDashboardNotifications,
  useDashboardActivity,
} from "./useDashboard";

// Search
export {
  searchKeys,
  useSearchResults,
  useSavedSearches,
  useSearchSuggestions,
  useSearchIndexStats,
  useSearch,
  useSaveSearch,
  useDeleteSavedSearch,
  useExecuteSavedSearch,
  useRebuildSearchIndex,
  useOptimizeSearchIndex,
} from "./useSearch";

// Profile
export {
  profileKeys,
  useProfile,
  useProfileCompleteness,
  useUpdateProfile,
  useChangePassword,
} from "./useProfile";

// Settings
export { settingsKeys, useSettings, useUpdateSettings } from "./useSettings";

// AI Config
export {
  aiConfigKeys,
  useAiConfigs,
  useActiveAiConfig,
  useAiConfig,
  useAiProviders,
  useAiProviderMetadata,
  useConfigureAiProvider,
  useDeleteAiConfig,
  useActivateAiProvider,
  useUpdateAiApiKey,
  useValidateAiConfig,
  useTestAiProvider,
} from "./useAiConfig";

// Templates
export {
  templateKeys,
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useApplyTemplate,
  useSeedTemplates,
} from "./useTemplates";

// GDPR
export {
  gdprKeys,
  useGdprConsents,
  useExportGdprData,
  useDeleteGdprData,
  useUpdateGdprConsent,
} from "./useGdpr";

// Export
export {
  useExportCase,
  useExportEvidence,
  useExportSearchResults,
  useDownloadExport,
} from "./useExport";

// Chat
export {
  chatKeys,
  useConversations,
  useConversation,
  useDeleteConversation,
  useUploadChatDocument,
  useAnalyzeChatDocument,
  useChatStream,
} from "./useChat";
