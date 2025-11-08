/**
 * IPC Handlers Index
 *
 * Orchestrates all IPC handlers for Electron main process.
 * Splits the monolithic ipc-handlers.ts (1,819 LOC) into 7 domain-specific modules.
 *
 * ARCHITECTURE:
 * Renderer → Preload → IPC Handler → Service Layer → Repository → Database
 *
 * SECURITY:
 * - All inputs validated with Zod schemas
 * - Authentication required for protected routes
 * - Audit logging for security-relevant events
 * - Error handling with formatted responses
 *
 * DOMAIN BREAKDOWN:
 * 1. auth.ts         - 4 channels  (~240 LOC): auth:register, auth:login, auth:logout, auth:session
 * 2. cases.ts        - 7 channels  (~350 LOC): case:*, case-fact:*
 * 3. evidence.ts     - 3 channels  (~150 LOC): evidence:*
 * 4. deadlines.ts    - 5 channels  (~180 LOC): deadline:*
 * 5. chat.ts         - 2 channels  (~290 LOC): chat:stream, chat:send
 * 6. gdpr.ts         - 2 channels  (~140 LOC): gdpr:export, gdpr:delete
 * 7. database.ts     - 13 channels (~480 LOC): db:*, dashboard:*, secure-storage:*, ui:*, ai:*
 *
 * Total: 36 IPC channels across 7 domain modules (~1,830 LOC split)
 */

import { setupAuthHandlers } from "./auth.ts";
import { setupCaseHandlers } from "./cases.ts";
import { setupEvidenceHandlers } from "./evidence.ts";
import { setupDeadlineHandlers } from "./deadlines.ts";
import { setupChatHandlers } from "./chat.ts";
import { setupGdprHandlers } from "./gdpr.ts";
import { registerSearchHandlers } from "./search.ts";
import { setupTagHandlers } from "./tags.ts";
import { setupNotificationHandlers } from "./notifications.ts";
import { setupDashboardHandlers } from "./dashboard.ts";
import {
  setupDatabaseHandlers,
  setupSecureStorageHandlers,
  setupUIHandlers,
} from "./database.ts";
import { setupAIConfigHandlers } from "./ai-config.ts";

/**
 * Initialize all IPC handlers
 *
 * Called from electron/main.ts during app initialization.
 * Registers all 36 IPC channels across 7 domain modules.
 */
export function setupIpcHandlers(): void {
  console.warn("[IPC] Setting up IPC handlers...");

  // Authentication handlers (4 channels)
  setupAuthHandlers();

  // Dashboard handlers (1 channel)
  setupDashboardHandlers();

  // Case management handlers (7 channels)
  setupCaseHandlers();

  // Evidence handlers (3 channels)
  setupEvidenceHandlers();

  // Deadline handlers (5 channels)
  setupDeadlineHandlers();

  // Case deadline handlers for tribunal deadline tracking (11 channels)
  // TEMP DISABLED: Conflicts with setupDeadlineHandlers() - both register 'deadline:create'
  // Pending resolution: merge case-deadlines.ts into deadlines.ts or resolve duplicate handlers
  // registerCaseDeadlineHandlers();

  // Chat handlers (2 channels)
  setupChatHandlers();

  // Database handlers (3 channels)
  setupDatabaseHandlers();

  // GDPR handlers (2 channels)
  setupGdprHandlers();

  // Secure storage handlers (5 channels)
  setupSecureStorageHandlers();

  // UI error logging handlers (1 channel)
  setupUIHandlers();

  // AI configuration handlers (2 channels)
  setupAIConfigHandlers();

  // Search handlers (9 channels)
  registerSearchHandlers();

  // Tag handlers (9 channels)
  setupTagHandlers();

  // Notification handlers (8 channels)
  setupNotificationHandlers();

  console.warn(
    "[IPC] All IPC handlers registered (73 channels across 11 domains)"
  );
}
