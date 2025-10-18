"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseRepository = void 0;
const database_1 = require("../db/database");
class CaseRepository {
    encryptionService;
    auditLogger;
    constructor(encryptionService, auditLogger) {
        this.encryptionService = encryptionService;
        this.auditLogger = auditLogger;
    }
    /**
     * Create a new case
     */
    create(input) {
        try {
            const db = (0, database_1.getDb)();
            const encryption = this.requireEncryptionService();
            // Encrypt description before INSERT
            let descriptionToStore = null;
            if (input.description) {
                const encryptedDescription = encryption.encrypt(input.description);
                descriptionToStore = encryptedDescription ? JSON.stringify(encryptedDescription) : null;
            }
            const stmt = db.prepare(`
        INSERT INTO cases (title, description, case_type, status)
        VALUES (@title, @description, @caseType, 'active')
      `);
            const result = stmt.run({
                title: input.title,
                description: descriptionToStore,
                caseType: input.caseType,
            });
            const createdCase = this.findById(result.lastInsertRowid);
            // Audit: Case created
            this.auditLogger?.log({
                eventType: 'case.create',
                resourceType: 'case',
                resourceId: createdCase.id.toString(),
                action: 'create',
                details: {
                    title: createdCase.title,
                    caseType: createdCase.caseType,
                },
                success: true,
            });
            return createdCase;
        }
        catch (error) {
            // Audit: Failed case creation
            this.auditLogger?.log({
                eventType: 'case.create',
                resourceType: 'case',
                resourceId: 'unknown',
                action: 'create',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Find case by ID
     */
    findById(id) {
        const db = (0, database_1.getDb)();
        const stmt = db.prepare(`
      SELECT
        id,
        title,
        description,
        case_type as caseType,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM cases
      WHERE id = ?
    `);
        const row = stmt.get(id);
        if (row) {
            // Decrypt description after SELECT
            const originalDescription = row.description;
            row.description = this.decryptDescription(row.description);
            // Audit: PII accessed (encrypted description field)
            if (originalDescription && row.description !== originalDescription) {
                this.auditLogger?.log({
                    eventType: 'case.pii_access',
                    resourceType: 'case',
                    resourceId: id.toString(),
                    action: 'read',
                    details: { field: 'description', encrypted: true },
                    success: true,
                });
            }
        }
        return row ?? null;
    }
    /**
     * Find all cases with optional status filter
     */
    findAll(status) {
        const db = (0, database_1.getDb)();
        let query = `
      SELECT
        id,
        title,
        description,
        case_type as caseType,
        status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM cases
    `;
        let rows;
        if (status) {
            query += ' WHERE status = ?';
            rows = db.prepare(query).all(status);
        }
        else {
            rows = db.prepare(query).all();
        }
        // Decrypt all descriptions
        return rows.map((row) => ({
            ...row,
            description: this.decryptDescription(row.description),
        }));
    }
    /**
     * Update case
     */
    update(id, input) {
        try {
            const db = (0, database_1.getDb)();
            const encryption = this.requireEncryptionService();
            const updates = [];
            const params = { id };
            if (input.title !== undefined) {
                updates.push('title = @title');
                params.title = input.title;
            }
            if (input.description !== undefined) {
                updates.push('description = @description');
                // Encrypt description before UPDATE
                if (input.description) {
                    const encryptedDescription = encryption.encrypt(input.description);
                    params.description = encryptedDescription ? JSON.stringify(encryptedDescription) : null;
                }
                else {
                    params.description = null;
                }
            }
            if (input.caseType !== undefined) {
                updates.push('case_type = @caseType');
                params.caseType = input.caseType;
            }
            if (input.status !== undefined) {
                updates.push('status = @status');
                params.status = input.status;
            }
            if (updates.length === 0) {
                return this.findById(id);
            }
            const stmt = db.prepare(`
        UPDATE cases
        SET ${updates.join(', ')}
        WHERE id = @id
      `);
            stmt.run(params);
            const updatedCase = this.findById(id);
            // Audit: Case updated
            this.auditLogger?.log({
                eventType: 'case.update',
                resourceType: 'case',
                resourceId: id.toString(),
                action: 'update',
                details: {
                    fieldsUpdated: Object.keys(input),
                },
                success: true,
            });
            return updatedCase;
        }
        catch (error) {
            // Audit: Failed update
            this.auditLogger?.log({
                eventType: 'case.update',
                resourceType: 'case',
                resourceId: id.toString(),
                action: 'update',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Delete case (cascades to related records via foreign keys)
     */
    delete(id) {
        try {
            const db = (0, database_1.getDb)();
            const stmt = db.prepare('DELETE FROM cases WHERE id = ?');
            const result = stmt.run(id);
            const success = result.changes > 0;
            // Audit: Case deleted
            this.auditLogger?.log({
                eventType: 'case.delete',
                resourceType: 'case',
                resourceId: id.toString(),
                action: 'delete',
                success,
            });
            return success;
        }
        catch (error) {
            // Audit: Failed deletion
            this.auditLogger?.log({
                eventType: 'case.delete',
                resourceType: 'case',
                resourceId: id.toString(),
                action: 'delete',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Close a case
     */
    close(id) {
        return this.update(id, { status: 'closed' });
    }
    /**
     * Get case count by status
     */
    countByStatus() {
        const db = (0, database_1.getDb)();
        const stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM cases
      GROUP BY status
    `);
        const results = stmt.all();
        const counts = {
            active: 0,
            closed: 0,
            pending: 0,
        };
        results.forEach((row) => {
            counts[row.status] = row.count;
        });
        return counts;
    }
    /**
     * Get case statistics (total count + status breakdown)
     */
    getStatistics() {
        const statusCounts = this.countByStatus();
        const totalCases = statusCounts.active + statusCounts.closed + statusCounts.pending;
        return {
            totalCases,
            statusCounts,
        };
    }
    /**
     * Decrypt description field with backward compatibility
     * @param storedValue - Encrypted JSON string or legacy plaintext
     * @returns Decrypted plaintext or null
     */
    decryptDescription(storedValue) {
        if (!storedValue) {
            return null;
        }
        // If no encryption service, return as-is (backward compatibility)
        if (!this.encryptionService) {
            return storedValue;
        }
        try {
            // Try to parse as encrypted data
            const encryptedData = JSON.parse(storedValue);
            // Verify it's actually encrypted data format
            if (this.encryptionService.isEncrypted(encryptedData)) {
                return this.encryptionService.decrypt(encryptedData);
            }
            // If it's not encrypted format, treat as legacy plaintext
            return storedValue;
        }
        catch (_error) {
            // JSON parse failed - likely legacy plaintext data
            return storedValue;
        }
    }
    requireEncryptionService() {
        if (!this.encryptionService) {
            throw new Error('EncryptionService not configured for CaseRepository');
        }
        return this.encryptionService;
    }
}
exports.CaseRepository = CaseRepository;
