/**
 * Profile IPC Handlers - User Profile Management
 *
 * Handles:
 * - Get user profile
 * - Update profile (name, email, avatar)
 *
 * Security:
 * - Profile fields encrypted at rest (PII)
 * - Session-based authorization
 * - Audit logging for profile changes
 */

import { ipcMain } from 'electron';
import { userProfileService } from '../../src/services/UserProfileService';
import type { UpdateUserProfileInput } from '../../src/domains/settings/entities/UserProfile';
import { logger } from '../../src/utils/logger';
import { withAuthorization } from '../utils/authorization-wrapper';

/**
 * Setup profile IPC handlers
 */
export function setupProfileHandlers(): void {
  /**
   * Get user profile
   */
  ipcMain.handle('profile:get', async (_event, sessionId: string) => {
    return withAuthorization(sessionId, async (userId) => {
      try {
        logger.info('Fetching user profile', { service: 'ProfileIPC', userId });

        const profile = await userProfileService.getUserProfile(userId);

        if (!profile) {
          throw new Error('Profile not found');
        }

        logger.info('Profile fetched successfully', {
          service: 'ProfileIPC',
          profileId: profile.id,
          userId,
          hasName: !!profile.name,
        });

        return {
          success: true,
          profile,
        };
      } catch (error) {
        logger.error('Failed to get profile', {
          service: 'ProfileIPC',
          error,
          userId,
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get profile',
        };
      }
    });
  });

  /**
   * Update user profile
   */
  ipcMain.handle('profile:update', async (_event, sessionId: string, input: UpdateUserProfileInput) => {
    return withAuthorization(sessionId, async (userId) => {
      try {
        logger.info('Updating user profile', {
          service: 'ProfileIPC',
          userId,
          fields: Object.keys(input),
        });

        const updatedProfile = await userProfileService.updateUserProfile(userId, input);

        if (!updatedProfile) {
          throw new Error('Failed to update profile');
        }

        logger.info('Profile updated successfully', {
          service: 'ProfileIPC',
          profileId: updatedProfile.id,
          userId,
          updatedFields: Object.keys(input),
        });

        return {
          success: true,
          profile: updatedProfile,
        };
      } catch (error) {
        logger.error('Failed to update profile', {
          service: 'ProfileIPC',
          error,
          userId,
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update profile',
        };
      }
    });
  });

  logger.info('Profile IPC handlers registered', { service: 'ProfileIPC' });
}
