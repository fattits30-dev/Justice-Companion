import { AuditLogger } from '../services/AuditLogger.ts';
import { CaseRepository } from '../repositories/CaseRepository.ts';
import type { User } from '../models/User.ts';

/**
 * Authorization error class
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Authorization middleware for resource ownership and role checks
 *
 * Features:
 * - Ownership verification (users can only access their own resources)
 * - Role-based access control (admin vs user)
 * - Comprehensive audit logging of authorization failures
 *
 * Security:
 * - All authorization failures are audited
 * - Prevents horizontal privilege escalation (user A accessing user B's data)
 * - Prevents vertical privilege escalation (user accessing admin features)
 */
export class AuthorizationMiddleware {
  constructor(
    private caseRepository: CaseRepository,
    private auditLogger?: AuditLogger,
  ) {}

  /**
   * Verify user owns a case
   */
  verifyCaseOwnership(caseId: number, userId: number): void {
    const caseData = this.caseRepository.findById(caseId);

    if (!caseData) {
      this.auditLogger?.log({
        eventType: 'authorization.denied',
        userId: userId.toString(),
        resourceType: 'case',
        resourceId: caseId.toString(),
        action: 'read',
        success: false,
        details: { reason: 'Case not found' },
      });
      throw new AuthorizationError('Case not found');
    }

    // Check ownership (userId column added in migration 011)
    // Note: For backward compatibility with existing data, null user_id is allowed
    if (caseData.userId && caseData.userId !== userId) {
      this.auditLogger?.log({
        eventType: 'authorization.denied',
        userId: userId.toString(),
        resourceType: 'case',
        resourceId: caseId.toString(),
        action: 'read',
        success: false,
        details: {
          reason: 'Not owner',
          ownerId: caseData.userId,
        },
      });
      throw new AuthorizationError('Access denied: you do not own this case');
    }
  }

  /**
   * Verify user has admin role
   */
  verifyAdminRole(user: User): void {
    if (user.role !== 'admin') {
      this.auditLogger?.log({
        eventType: 'authorization.denied',
        userId: user.id.toString(),
        resourceType: 'admin',
        resourceId: 'system',
        action: 'read',
        success: false,
        details: {
          reason: 'Not admin',
          role: user.role,
        },
      });
      throw new AuthorizationError('Access denied: admin role required');
    }
  }

  /**
   * Verify user is active (not suspended/deactivated)
   */
  verifyUserActive(user: User): void {
    if (!user.isActive) {
      this.auditLogger?.log({
        eventType: 'authorization.denied',
        userId: user.id.toString(),
        resourceType: 'user',
        resourceId: user.id.toString(),
        action: 'read',
        success: false,
        details: { reason: 'User inactive' },
      });
      throw new AuthorizationError('Account is inactive');
    }
  }

  /**
   * Verify user can modify another user (admin only, or self)
   */
  verifyCanModifyUser(requestingUser: User, targetUserId: number): void {
    // User can modify themselves
    if (requestingUser.id === targetUserId) {
      return;
    }

    // Only admin can modify other users
    if (requestingUser.role !== 'admin') {
      this.auditLogger?.log({
        eventType: 'authorization.denied',
        userId: requestingUser.id.toString(),
        resourceType: 'user',
        resourceId: targetUserId.toString(),
        action: 'update',
        success: false,
        details: {
          reason: 'Cannot modify other users',
          role: requestingUser.role,
        },
      });
      throw new AuthorizationError('Access denied: you can only modify your own account');
    }
  }
}
