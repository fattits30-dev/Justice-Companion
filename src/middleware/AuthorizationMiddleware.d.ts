import { AuditLogger } from '../services/AuditLogger';
import { CaseRepository } from '../repositories/CaseRepository';
import type { User } from '../models/User';
/**
 * Authorization error class
 */
export declare class AuthorizationError extends Error {
    constructor(message: string);
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
export declare class AuthorizationMiddleware {
    private caseRepository;
    private auditLogger?;
    constructor(caseRepository: CaseRepository, auditLogger?: AuditLogger | undefined);
    /**
     * Verify user owns a case
     */
    verifyCaseOwnership(caseId: number, userId: number): void;
    /**
     * Verify user has admin role
     */
    verifyAdminRole(user: User): void;
    /**
     * Verify user is active (not suspended/deactivated)
     */
    verifyUserActive(user: User): void;
    /**
     * Verify user can modify another user (admin only, or self)
     */
    verifyCanModifyUser(requestingUser: User, targetUserId: number): void;
}
//# sourceMappingURL=AuthorizationMiddleware.d.ts.map