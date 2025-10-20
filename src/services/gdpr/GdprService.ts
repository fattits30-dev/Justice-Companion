/**
 * GDPR Compliance Service
 *
 * Orchestrates data export (Article 20) and deletion (Article 17)
 * with rate limiting, consent checking, and audit logging.
 *
 * GDPR Requirements:
 * - Data Portability (Article 20): Export user data in machine-readable format
 * - Right to Erasure (Article 17): Delete all user data on request
 * - Consent Management: Track and verify user consents
 * - Audit Trail: Immutable logs of all GDPR operations
 */

import type Database from 'better-sqlite3';
import { EncryptionService } from '../EncryptionService.ts';
import { AuditLogger } from '../AuditLogger.ts';
import { DataExporter } from './DataExporter.ts';
import { DataDeleter } from './DataDeleter.ts';
import type {
  GdprExportOptions,
  GdprExportResult,
  GdprDeleteOptions,
  GdprDeleteResult,
} from '../../models/Gdpr.ts';
import {
  RateLimitError,
  ConsentRequiredError,
  GdprOperationError,
} from '../../models/Gdpr.ts';
import * as fs from 'fs';
import * as path from 'path';

export class GdprService {
  private exporter: DataExporter;
  private deleter: DataDeleter;
  private rateLimitMap: Map<string, { count: number; resetAt: number }> =
    new Map();

  constructor(
    private db: Database.Database,
    encryptionService: EncryptionService,
    private auditLogger: AuditLogger
  ) {
    this.exporter = new DataExporter(db, encryptionService);
    this.deleter = new DataDeleter(db);
  }

  /**
   * Export all user data (GDPR Article 20)
   *
   * Rate limit: 5 exports per 24 hours per user
   */
  async exportUserData(
    userId: number,
    options: GdprExportOptions = {}
  ): Promise<GdprExportResult> {
    try {
      // Rate limiting: Prevent abuse
      this.checkRateLimit(userId, 'export');

      // Consent check: User must have active data processing consent
      this.checkConsent(userId, 'data_processing');

      // Export data using DataExporter
      const userData = this.exporter.exportAllUserData(userId, options);

      // Optionally save to disk
      let filePath: string | undefined;
      if (options.format === 'json') {
        filePath = await this.saveExportToDisk(userId, userData);
      }

      // Audit log
      this.auditLogger.log({
        eventType: 'gdpr.export',
        userId: userId.toString(),
        resourceType: 'user_data',
        resourceId: userId.toString(),
        action: 'export',
        success: true,
        details: {
          totalRecords: userData.metadata.totalRecords,
          format: userData.metadata.format,
          filePath,
        },
      });

      // Increment rate limit counter
      this.incrementRateLimit(userId, 'export');

      return {
        ...userData, // Spread UserDataExport (contains metadata and userData)
        filePath,
      };
    } catch (error) {
      // Audit log failure
      this.auditLogger.log({
        eventType: 'gdpr.export',
        userId: userId.toString(),
        resourceType: 'user_data',
        resourceId: userId.toString(),
        action: 'export',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-throw expected errors without wrapping (for clear test assertions)
      if (error instanceof RateLimitError || error instanceof ConsentRequiredError) {
        throw error;
      }

      throw new GdprOperationError(
        'GDPR export failed',
        'export',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete all user data (GDPR Article 17)
   *
   * Rate limit: 1 deletion per 30 days per user
   * IRREVERSIBLE: Requires explicit confirmation
   */
  async deleteUserData(
    userId: number,
    options: GdprDeleteOptions
  ): Promise<GdprDeleteResult> {
    try {
      // Safety check: Explicit confirmation required
      if (!options.confirmed) {
        throw new Error(
          'GDPR deletion requires explicit confirmation. Set options.confirmed = true.'
        );
      }

      // Rate limiting: Prevent accidental repeated deletions
      this.checkRateLimit(userId, 'delete');

      // Consent check: User must have requested erasure
      this.checkConsent(userId, 'data_erasure_request');

      // Optional: Export data before deletion (recommended)
      let exportPath: string | undefined;
      if (options.exportBeforeDelete) {
        const exportResult = await this.exportUserData(userId, {
          format: 'json',
        });
        exportPath = exportResult.filePath;
      }

      // Delete data using DataDeleter
      const deleteResult = this.deleter.deleteAllUserData(userId, options);

      // Audit log (this survives deletion - preserved table)
      this.auditLogger.log({
        eventType: 'gdpr.erasure',
        userId: userId.toString(),
        resourceType: 'user_data',
        resourceId: userId.toString(),
        action: 'delete',
        success: true,
        details: {
          deletedCounts: deleteResult.deletedCounts,
          preservedAuditLogs: deleteResult.preservedAuditLogs,
          preservedConsents: deleteResult.preservedConsents,
          exportPath,
          reason: options.reason,
        },
      });

      // Re-count audit logs AFTER deletion log created (for accurate reporting)
      const auditLogsStmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ?'
      );
      const finalAuditLogCount = (auditLogsStmt.get(userId.toString()) as any).count;

      // Increment rate limit counter
      this.incrementRateLimit(userId, 'delete');

      return {
        ...deleteResult,
        preservedAuditLogs: finalAuditLogCount, // Override with final count
        exportPath,
      };
    } catch (error) {
      // Audit log failure
      this.auditLogger.log({
        eventType: 'gdpr.erasure',
        userId: userId.toString(),
        resourceType: 'user_data',
        resourceId: userId.toString(),
        action: 'delete',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-throw expected errors without wrapping (for clear test assertions)
      if (error instanceof RateLimitError || error instanceof ConsentRequiredError) {
        throw error;
      }

      // Re-throw confirmation errors
      if (error instanceof Error && error.message.includes('explicit confirmation')) {
        throw error;
      }

      throw new GdprOperationError(
        'GDPR deletion failed',
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check user consent for GDPR operation
   */
  private checkConsent(userId: number, consentType: string): void {
    const stmt = this.db.prepare(`
      SELECT * FROM consent_records
      WHERE userId = ?
        AND consentType = ?
        AND consentGiven = 1
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    const consent = stmt.get(userId, consentType);

    if (!consent) {
      throw new (ConsentRequiredError as any)(
        `User ${userId} has not provided consent for ${consentType}`
      );
    }
  }

  /**
   * Rate limiting: Prevent abuse
   *
   * Limits:
   * - Export: 5 per 24 hours
   * - Delete: 1 per 30 days
   */
  private checkRateLimit(userId: number, operation: 'export' | 'delete'): void {
    const key = `${userId}_${operation}`;
    const now = Date.now();
    const limits = {
      export: { max: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5 per 24h
      delete: { max: 1, windowMs: 30 * 24 * 60 * 60 * 1000 }, // 1 per 30d
    };

    const limit = limits[operation];
    const userLimit = this.rateLimitMap.get(key);

    // Reset window if expired
    if (!userLimit || now > userLimit.resetAt) {
      this.rateLimitMap.set(key, {
        count: 0,
        resetAt: now + limit.windowMs,
      });
      return;
    }

    // Check if limit exceeded
    if (userLimit.count >= limit.max) {
      const resetIn = Math.ceil((userLimit.resetAt - now) / 1000 / 60); // minutes
      throw new RateLimitError(
        `Rate limit exceeded for ${operation}. Try again in ${resetIn} minutes.`
      );
    }
  }

  /**
   * Increment rate limit counter
   */
  private incrementRateLimit(userId: number, operation: 'export' | 'delete'): void {
    const key = `${userId}_${operation}`;
    const userLimit = this.rateLimitMap.get(key);
    if (userLimit) {
      userLimit.count++;
    }
  }

  /**
   * Save export to disk in JSON format
   */
  private async saveExportToDisk(
    userId: number,
    data: any
  ): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports');

    // Create exports directory if it doesn't exist
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `user-${userId}-export-${timestamp}.json`;
    const filePath = path.join(exportDir, filename);

    // Write JSON to disk
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    return filePath;
  }
}
