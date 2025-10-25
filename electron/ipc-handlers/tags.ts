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
      return withAuthorization(sessionId, async (userId) => {
        try {
          const tags = tagService.getTags(userId);

          return {
            success: true,
            data: tags,
          };
        } catch (error: any) {
          console.error('[IPC] tags:list error:', error);
          return {
            success: false,
            error: error.message || 'Failed to list tags',
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
      return withAuthorization(sessionId, async (userId) => {
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

          const tag = tagService.createTag(userId, input);

          return {
            success: true,
            data: tag,
          };
        } catch (error: any) {
          console.error('[IPC] tags:create error:', error);
          return {
            success: false,
            error: error.message || 'Failed to create tag',
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
    async (_event: IpcMainInvokeEvent, tagId: number, input: UpdateTagInput, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          // Verify tag ownership
          const tag = tagService.getTagById(tagId);
          if (!tag) {
            return {
              success: false,
              error: 'Tag not found',
            };
          }

          if (tag.userId !== userId) {
            return {
              success: false,
              error: 'Unauthorized: You do not own this tag',
            };
          }

          // Validate color if provided
          if (input.color && !/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
            return {
              success: false,
              error: 'Valid hex color is required (e.g., #FF0000)',
            };
          }

          const updatedTag = tagService.updateTag(tagId, input);

          return {
            success: true,
            data: updatedTag,
          };
        } catch (error: any) {
          console.error('[IPC] tags:update error:', error);
          return {
            success: false,
            error: error.message || 'Failed to update tag',
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
    async (_event: IpcMainInvokeEvent, tagId: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          // Verify tag ownership
          const tag = tagService.getTagById(tagId);
          if (!tag) {
            return {
              success: false,
              error: 'Tag not found',
            };
          }

          if (tag.userId !== userId) {
            return {
              success: false,
              error: 'Unauthorized: You do not own this tag',
            };
          }

          tagService.deleteTag(tagId);

          return {
            success: true,
            data: { deleted: true },
          };
        } catch (error: any) {
          console.error('[IPC] tags:delete error:', error);
          return {
            success: false,
            error: error.message || 'Failed to delete tag',
          };
        }
      });
    }
  );

  /**
   * Apply tag to evidence
   */
  ipcMain.handle(
    'tags:tagEvidence',
    async (_event: IpcMainInvokeEvent, evidenceId: number, tagId: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          // Verify tag ownership
          const tag = tagService.getTagById(tagId);
          if (!tag) {
            return {
              success: false,
              error: 'Tag not found',
            };
          }

          if (tag.userId !== userId) {
            return {
              success: false,
              error: 'Unauthorized: You do not own this tag',
            };
          }

          // TODO: Verify evidence ownership
          // For now, TagService will check via SQL joins

          tagService.tagEvidence(evidenceId, tagId, userId);

          return {
            success: true,
            data: { tagged: true },
          };
        } catch (error: any) {
          console.error('[IPC] tags:tagEvidence error:', error);
          return {
            success: false,
            error: error.message || 'Failed to tag evidence',
          };
        }
      });
    }
  );

  /**
   * Remove tag from evidence
   */
  ipcMain.handle(
    'tags:untagEvidence',
    async (_event: IpcMainInvokeEvent, evidenceId: number, tagId: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          // Verify tag ownership
          const tag = tagService.getTagById(tagId);
          if (!tag) {
            return {
              success: false,
              error: 'Tag not found',
            };
          }

          if (tag.userId !== userId) {
            return {
              success: false,
              error: 'Unauthorized: You do not own this tag',
            };
          }

          tagService.untagEvidence(evidenceId, tagId, userId);

          return {
            success: true,
            data: { untagged: true },
          };
        } catch (error: any) {
          console.error('[IPC] tags:untagEvidence error:', error);
          return {
            success: false,
            error: error.message || 'Failed to untag evidence',
          };
        }
      });
    }
  );

  /**
   * Get tags for specific evidence
   */
  ipcMain.handle(
    'tags:getForEvidence',
    async (_event: IpcMainInvokeEvent, evidenceId: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          // TODO: Verify evidence ownership
          const tags = tagService.getEvidenceTags(evidenceId);

          return {
            success: true,
            data: tags,
          };
        } catch (error: any) {
          console.error('[IPC] tags:getForEvidence error:', error);
          return {
            success: false,
            error: error.message || 'Failed to get evidence tags',
          };
        }
      });
    }
  );

  /**
   * Search evidence by tags
   */
  ipcMain.handle(
    'tags:searchByTags',
    async (_event: IpcMainInvokeEvent, tagIds: number[], sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          const evidenceIds = tagService.searchByTags(userId, tagIds);

          return {
            success: true,
            data: evidenceIds,
          };
        } catch (error: any) {
          console.error('[IPC] tags:searchByTags error:', error);
          return {
            success: false,
            error: error.message || 'Failed to search by tags',
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
      return withAuthorization(sessionId, async (userId) => {
        try {
          const stats = tagService.getTagStatistics(userId);

          return {
            success: true,
            data: stats,
          };
        } catch (error: any) {
          console.error('[IPC] tags:statistics error:', error);
          return {
            success: false,
            error: error.message || 'Failed to get tag statistics',
          };
        }
      });
    }
  );
}
