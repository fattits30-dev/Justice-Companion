import { getDb } from '../db/database';
import type { UserProfile, UpdateUserProfileInput } from '../models/UserProfile';
import { errorLogger } from '../utils/error-logger';

class UserProfileRepository {
  /**
   * Get the user profile (always ID = 1)
   */
  get(): UserProfile {
    const db = getDb();

    try {
      const stmt = db.prepare(`
        SELECT id, name, email, avatar_url as avatarUrl,
               created_at as createdAt, updated_at as updatedAt
        FROM user_profile
        WHERE id = 1
      `);

      const profile = stmt.get() as UserProfile | undefined;

      // Should never happen (default inserted in migration)
      if (!profile) {
        throw new Error('User profile not found');
      }

      return profile;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileRepository.get',
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  update(input: UpdateUserProfileInput): UserProfile {
    const db = getDb();

    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
      }

      if (input.email !== undefined) {
        updates.push('email = ?');
        values.push(input.email);
      }

      if (input.avatarUrl !== undefined) {
        updates.push('avatar_url = ?');
        values.push(input.avatarUrl);
      }

      if (updates.length === 0) {
        return this.get();
      }

      const stmt = db.prepare(`
        UPDATE user_profile
        SET ${updates.join(', ')}
        WHERE id = 1
      `);

      stmt.run(...values);

      return this.get();
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'UserProfileRepository.update',
      });
      throw error;
    }
  }
}

export const userProfileRepository = new UserProfileRepository();
