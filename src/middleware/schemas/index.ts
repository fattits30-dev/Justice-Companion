/**
 * Central registry for all IPC channel validation schemas
 *
 * Maps IPC channel names to their corresponding Zod validation schemas.
 * Organized by feature area for maintainability.
 */

import { z } from "zod";
import { logger } from "../../utils/logger.ts";
import { IPC_CHANNELS } from "../../types/ipc.ts";
import * as aiSchemas from "./ai-schemas.ts";
import * as authSchemas from "./auth-schemas.ts";
import * as caseSchemas from "./case-schemas.ts";
import * as consentSchemas from "./consent-schemas.ts";
import * as conversationSchemas from "./conversation-schemas.ts";
import * as evidenceSchemas from "./evidence-schemas.ts";
import * as fileSchemas from "./file-schemas.ts";
import * as gdprSchemas from "./gdpr-schemas.ts";
import * as modelSchemas from "./model-schemas.ts";
import * as profileSchemas from "./profile-schemas.ts";

/**
 * Complete mapping of IPC channels to validation schemas
 *
 * Channels without schemas will bypass validation (e.g., parameterless queries)
 */
export const ipcSchemas = {
  // ===== CASE MANAGEMENT (7 channels) =====
  [IPC_CHANNELS.CASE_CREATE]: caseSchemas.caseCreateSchema,
  [IPC_CHANNELS.CASE_GET_BY_ID]: caseSchemas.caseGetByIdSchema,
  [IPC_CHANNELS.CASE_GET_ALL]: undefined, // No parameters
  [IPC_CHANNELS.CASE_UPDATE]: caseSchemas.caseUpdateSchema,
  [IPC_CHANNELS.CASE_DELETE]: caseSchemas.caseDeleteSchema,
  [IPC_CHANNELS.CASE_CLOSE]: caseSchemas.caseCloseSchema,
  [IPC_CHANNELS.CASE_GET_STATISTICS]: undefined, // No parameters

  // ===== EVIDENCE MANAGEMENT (6 channels) =====
  [IPC_CHANNELS.EVIDENCE_CREATE]: evidenceSchemas.evidenceCreateSchema,
  [IPC_CHANNELS.EVIDENCE_GET_BY_ID]: evidenceSchemas.evidenceGetByIdSchema,
  [IPC_CHANNELS.EVIDENCE_GET_ALL]: evidenceSchemas.evidenceGetAllSchema,
  [IPC_CHANNELS.EVIDENCE_GET_BY_CASE]: evidenceSchemas.evidenceGetByCaseSchema,
  [IPC_CHANNELS.EVIDENCE_UPDATE]: evidenceSchemas.evidenceUpdateSchema,
  [IPC_CHANNELS.EVIDENCE_DELETE]: evidenceSchemas.evidenceDeleteSchema,

  // ===== AI OPERATIONS (6 channels) =====
  [IPC_CHANNELS.AI_CHECK_STATUS]: undefined, // No parameters
  [IPC_CHANNELS.AI_CHAT]: aiSchemas.aiChatSchema,
  [IPC_CHANNELS.AI_STREAM_START]: aiSchemas.aiStreamStartSchema,
  [IPC_CHANNELS.AI_CONFIGURE]: aiSchemas.aiConfigureSchema,
  [IPC_CHANNELS.AI_TEST_CONNECTION]: aiSchemas.aiTestConnectionSchema,

  // ===== MODEL DOWNLOAD OPERATIONS (5 channels) =====
  [IPC_CHANNELS.MODEL_GET_AVAILABLE]: undefined, // No parameters
  [IPC_CHANNELS.MODEL_GET_DOWNLOADED]: undefined, // No parameters
  [IPC_CHANNELS.MODEL_IS_DOWNLOADED]: modelSchemas.modelIsDownloadedSchema,
  [IPC_CHANNELS.MODEL_DOWNLOAD_START]: modelSchemas.modelDownloadStartSchema,
  [IPC_CHANNELS.MODEL_DELETE]: modelSchemas.modelDeleteSchema,

  // ===== FILE OPERATIONS (6 channels) =====
  [IPC_CHANNELS.FILE_SELECT]: fileSchemas.fileSelectSchema,
  [IPC_CHANNELS.FILE_UPLOAD]: fileSchemas.fileUploadSchema,
  [IPC_CHANNELS.FILE_VIEW]: fileSchemas.fileViewSchema,
  [IPC_CHANNELS.FILE_DOWNLOAD]: fileSchemas.fileDownloadSchema,
  [IPC_CHANNELS.FILE_PRINT]: fileSchemas.filePrintSchema,
  [IPC_CHANNELS.FILE_EMAIL]: fileSchemas.fileEmailSchema,

  // ===== CHAT CONVERSATION OPERATIONS (7 channels) =====
  [IPC_CHANNELS.CONVERSATION_CREATE]:
    conversationSchemas.conversationCreateSchema,
  [IPC_CHANNELS.CONVERSATION_GET]: conversationSchemas.conversationGetSchema,
  [IPC_CHANNELS.CONVERSATION_GET_ALL]:
    conversationSchemas.conversationGetAllSchema,
  [IPC_CHANNELS.CONVERSATION_GET_RECENT]:
    conversationSchemas.conversationGetRecentSchema,
  [IPC_CHANNELS.CONVERSATION_LOAD_WITH_MESSAGES]:
    conversationSchemas.conversationLoadWithMessagesSchema,
  [IPC_CHANNELS.CONVERSATION_DELETE]:
    conversationSchemas.conversationDeleteSchema,
  [IPC_CHANNELS.MESSAGE_ADD]: conversationSchemas.messageAddSchema,

  // ===== USER PROFILE OPERATIONS (2 channels) =====
  [IPC_CHANNELS.PROFILE_GET]: undefined, // No parameters
  [IPC_CHANNELS.PROFILE_UPDATE]: profileSchemas.profileUpdateSchema,

  // ===== GDPR OPERATIONS (2 channels) =====
  [IPC_CHANNELS.GDPR_EXPORT_USER_DATA]: undefined, // No parameters
  [IPC_CHANNELS.GDPR_DELETE_USER_DATA]: gdprSchemas.gdprDeleteUserDataSchema,

  // ===== AUTHENTICATION OPERATIONS (5 channels) =====
  [IPC_CHANNELS.AUTH_REGISTER]: authSchemas.authRegisterSchema,
  [IPC_CHANNELS.AUTH_LOGIN]: authSchemas.authLoginSchema,
  [IPC_CHANNELS.AUTH_LOGOUT]: undefined, // No parameters
  [IPC_CHANNELS.AUTH_GET_CURRENT_USER]: undefined, // No parameters
  [IPC_CHANNELS.AUTH_CHANGE_PASSWORD]: authSchemas.authChangePasswordSchema,

  // ===== CONSENT OPERATIONS (4 channels) =====
  [IPC_CHANNELS.CONSENT_GRANT]: consentSchemas.consentGrantSchema,
  [IPC_CHANNELS.CONSENT_REVOKE]: consentSchemas.consentRevokeSchema,
  [IPC_CHANNELS.CONSENT_HAS_CONSENT]: consentSchemas.consentHasConsentSchema,
  [IPC_CHANNELS.CONSENT_GET_USER_CONSENTS]: undefined, // No parameters

  // ===== UI ERROR LOGGING (1 channel) =====
  [IPC_CHANNELS.LOG_UI_ERROR]: aiSchemas.logUIErrorSchema,
} as const;

// Type to ensure all channels are covered
type SchemaRegistry = {
  [K in keyof typeof IPC_CHANNELS as (typeof IPC_CHANNELS)[K]]?: z.ZodTypeAny;
};

// Compile-time check to ensure all channels are in the registry (unused but required for type safety)
// @ts-expect-error - Intentionally unused for compile-time type checking
const _schemaRegistryCheck: SchemaRegistry = ipcSchemas;

// Export count for validation
export const TOTAL_IPC_CHANNELS = Object.keys(IPC_CHANNELS).length;
export const CHANNELS_WITH_VALIDATION = Object.values(ipcSchemas).filter(
  (s) => s !== undefined,
).length;
export const CHANNELS_WITHOUT_VALIDATION =
  TOTAL_IPC_CHANNELS - CHANNELS_WITH_VALIDATION;

// Log schema registry stats during development
if (process.env.NODE_ENV === "development") {
  logger.warn("Schema Registry");
}

// Re-export all schema modules for convenient importing
export {
  aiSchemas,
  authSchemas,
  caseSchemas,
  consentSchemas,
  conversationSchemas,
  evidenceSchemas,
  fileSchemas,
  gdprSchemas,
  modelSchemas,
  profileSchemas,
};
