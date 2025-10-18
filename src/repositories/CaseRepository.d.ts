import type { Case, CreateCaseInput, UpdateCaseInput, CaseStatus } from '../models/Case';
import { EncryptionService } from '../services/EncryptionService.js';
import type { AuditLogger } from '../services/AuditLogger.js';
export declare class CaseRepository {
    private encryptionService;
    private auditLogger?;
    constructor(encryptionService: EncryptionService, auditLogger?: AuditLogger | undefined);
    /**
     * Create a new case
     */
    create(input: CreateCaseInput): Case;
    /**
     * Find case by ID
     */
    findById(id: number): Case | null;
    /**
     * Find all cases with optional status filter
     */
    findAll(status?: CaseStatus): Case[];
    /**
     * Update case
     */
    update(id: number, input: UpdateCaseInput): Case | null;
    /**
     * Delete case (cascades to related records via foreign keys)
     */
    delete(id: number): boolean;
    /**
     * Close a case
     */
    close(id: number): Case | null;
    /**
     * Get case count by status
     */
    countByStatus(): Record<CaseStatus, number>;
    /**
     * Get case statistics (total count + status breakdown)
     */
    getStatistics(): {
        totalCases: number;
        statusCounts: Record<CaseStatus, number>;
    };
    /**
     * Decrypt description field with backward compatibility
     * @param storedValue - Encrypted JSON string or legacy plaintext
     * @returns Decrypted plaintext or null
     */
    private decryptDescription;
    private requireEncryptionService;
}
//# sourceMappingURL=CaseRepository.d.ts.map