/**
 * IPC Handlers for Tag Management
 * Channels: tags:*
 */

import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { type IPCResponse } from '../utils/ipc-response.ts';
import { logAuditEvent, AuditEventType } from '../utils/audit-helper.ts';
import { withAuthorization } from '../utils/authorization-wrapper.ts';
import { tagService } from '../../src/services/TagService.ts';
import type { CreateTagInput, UpdateTagInput } from '../../src/models/Tag.ts';

/**
 * ===== TAG HANDLERS =====
 * Channels: tags:list, tags:create, tags:update, tags:delete,
 *           tags:tagEvidence, tags:untagEvidence, tags:getForEvidence,
 *           tags:searchByTags, tags:statistics
 * Total: 9 channels
 */
export function setupTagHandlers(): void {
  /**
   * List all tags for the current user
   */
  ipcMain.handle(
    'tags:list',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          const tags = tagService.getTags(_userId);

          return {
            success: true,
            data: tags,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:list error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to list tags',
          };
        }
      });
    }
  );

  /**
   * Create a new tag
   */
  ipcMain.handle(
    'tags:create',
    async (_event: IpcMainInvokeEvent, input: CreateTagInput, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          // Validate input
          if (!input.name || input.name.trim().length === 0) {
            return {
              success: false,
              error: 'Tag name is required',
            };
          }

          if (!input.color || !/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
            return {
              success: false,
              error: 'Valid hex color is required (e.g., #FF0000)',
            };
          }

          const tag = tagService.createTag(_userId, input);

          return {
            success: true,
            data: tag,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:create error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to create tag',
          };
        }
      });
    }
  );

  /**
   * Update an existing tag
   */
  ipcMain.handle(
    'tags:update',
    async (_event: IpcMainInvokeEvent, id: string, input: UpdateTagInput, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          // Validate input
          if (!input.name || input.name.trim().length === 0) {
            return {
              success: false,
              error: 'Tag name is required',
            };
          }

          if (!input.color || !/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
            return {
              success: false,
              error: 'Valid hex color is required (e.g., #FF0000)',
            };
          }

          const tag = tagService.updateTag(_userId, id, input);

          return {
            success: true,
            data: tag,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:update error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to update tag',
          };
        }
      });
    }
  );

  /**
   * Delete a tag
   */
  ipcMain.handle(
    'tags:delete',
    async (_event: IpcMainInvokeEvent, id: string, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          await tagService.deleteTag(_userId, id);

          return {
            success: true,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:delete error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to delete tag',
          };
        }
      });
    }
  );

  /**
   * Tag evidence
   */
  ipcMain.handle(
    'tags:tagEvidence',
    async (_event: IpcMainInvokeEvent, tagId: string, evidenceId: string, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          await tagService.tagEvidence(_userId, tagId, evidenceId);

          return {
            success: true,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:tagEvidence error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to tag evidence',
          };
        }
      });
    }
  );

  /**
   * Untag evidence
   */
  ipcMain.handle(
    'tags:untagEvidence',
    async (_event: IpcMainInvokeEvent, tagId: string, evidenceId: string, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          await tagService.untagEvidence(_userId, tagId, evidenceId);

          return {
            success: true,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:untagEvidence error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to untag evidence',
          };
        }
      });
    }
  );

  /**
   * Get tags for evidence
   */
  ipcMain.handle(
    'tags:getForEvidence',
    async (_event: IpcMainInvokeEvent, evidenceId: string, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          const tags = tagService.getTagsForEvidence(_userId, evidenceId);

          return {
            success: true,
            data: tags,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:getForEvidence error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to get tags for evidence',
          };
        }
      });
    }
  );

  /**
   * Search by tags
   */
  ipcMain.handle(
    'tags:searchByTags',
    async (_event: IpcMainInvokeEvent, tagIds: string[], sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          const results = tagService.searchByTags(_userId, tagIds);

          return {
            success: true,
            data: results,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:searchByTags error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to search by tags',
          };
        }
      });
    }
  );

  /**
   * Get tag statistics
   */
  ipcMain.handle(
    'tags:statistics',
    async (_event: IpcMainInvokeEvent, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          const stats = tagService.getTagStatistics(_userId);

          return {
            success: true,
            data: stats,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:statistics error:', error);
          return {
            success: false,
            error: (error as Error).message || 'Failed to get tag statistics',
          };
        }
      });
    }
  );
}