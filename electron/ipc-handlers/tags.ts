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
import {
  ValidationError,
  RequiredFieldError,
  DatabaseError,
  TagNotFoundError,
  EvidenceNotFoundError,
} from '../../src/errors/DomainErrors.ts';

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

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('list tags', error.message);
            }
          }

          throw error;
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
            throw new RequiredFieldError('Tag name');
          }

          if (!input.color || !/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
            throw new ValidationError('Valid hex color is required (e.g., #FF0000)');
          }

          const tag = tagService.createTag(_userId, input);

          return {
            success: true,
            data: tag,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:create error:', error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('create tag', error.message);
            }

            if (message.includes('duplicate') || message.includes('unique')) {
              throw new ValidationError('Tag with this name already exists');
            }
          }

          throw error;
        }
      });
    }
  );

  /**
   * Update an existing tag
   */
  ipcMain.handle(
    'tags:update',
    async (_event: IpcMainInvokeEvent, input: UpdateTagInput, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          // Validate input
          if (!input.id) {
            throw new RequiredFieldError('Tag ID');
          }

          if (!input.name || input.name.trim().length === 0) {
            throw new RequiredFieldError('Tag name');
          }

          if (!input.color || !/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
            throw new ValidationError('Valid hex color is required (e.g., #FF0000)');
          }

          const tag = tagService.updateTag(_userId, input);

          return {
            success: true,
            data: tag,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:update error:', error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('update tag', error.message);
            }

            if (message.includes('not found')) {
              throw new TagNotFoundError(`Tag ${input.id} not found`);
            }

            if (message.includes('duplicate') || message.includes('unique')) {
              throw new ValidationError('Tag with this name already exists');
            }
          }

          throw error;
        }
      });
    }
  );

  /**
   * Delete a tag
   */
  ipcMain.handle(
    'tags:delete',
    async (_event: IpcMainInvokeEvent, tagId: string, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          await tagService.deleteTag(_userId, tagId);

          return {
            success: true,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:delete error:', error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('delete tag', error.message);
            }

            if (message.includes('not found')) {
              throw new TagNotFoundError(`Tag ${tagId} not found`);
            }
          }

          throw error;
        }
      });
    }
  );

  /**
   * Tag evidence
   */
  ipcMain.handle(
    'tags:tagEvidence',
    async (
      _event: IpcMainInvokeEvent,
      evidenceId: string,
      tagIds: string[],
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          await tagService.tagEvidence(_userId, evidenceId, tagIds);

          return {
            success: true,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:tagEvidence error:', error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('tag evidence', error.message);
            }

            if (message.includes('evidence') && message.includes('not found')) {
              throw new EvidenceNotFoundError(`Evidence ${evidenceId} not found`);
            }

            if (message.includes('tag') && message.includes('not found')) {
              throw new TagNotFoundError('One or more tags not found');
            }
          }

          throw error;
        }
      });
    }
  );

  /**
   * Untag evidence
   */
  ipcMain.handle(
    'tags:untagEvidence',
    async (
      _event: IpcMainInvokeEvent,
      evidenceId: string,
      tagIds: string[],
      sessionId: string
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          await tagService.untagEvidence(_userId, evidenceId, tagIds);

          return {
            success: true,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:untagEvidence error:', error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('untag evidence', error.message);
            }

            if (message.includes('evidence') && message.includes('not found')) {
              throw new EvidenceNotFoundError(`Evidence ${evidenceId} not found`);
            }

            if (message.includes('tag') && message.includes('not found')) {
              throw new TagNotFoundError('One or more tags not found');
            }
          }

          throw error;
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

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('get tags for evidence', error.message);
            }

            if (message.includes('evidence') && message.includes('not found')) {
              throw new EvidenceNotFoundError(`Evidence ${evidenceId} not found`);
            }
          }

          throw error;
        }
      });
    }
  );

  /**
   * Search evidence by tags
   */
  ipcMain.handle(
    'tags:searchByTags',
    async (_event: IpcMainInvokeEvent, tagIds: string[], sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (_userId) => {
        try {
          const evidence = tagService.searchEvidenceByTags(_userId, tagIds);

          return {
            success: true,
            data: evidence,
          };
        } catch (error: unknown) {
          console.error('[IPC] tags:searchByTags error:', error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('search evidence by tags', error.message);
            }

            if (message.includes('tag') && message.includes('not found')) {
              throw new TagNotFoundError('One or more tags not found');
            }
          }

          throw error;
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

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('get tag statistics', error.message);
            }
          }

          throw error;
        }
      });
    }
  );
}