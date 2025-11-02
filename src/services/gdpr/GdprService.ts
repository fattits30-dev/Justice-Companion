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
  private rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();
  private db: Database.Database;
  private auditLogger: AuditLogger;

  constructor(
    db: Database.Database,
    encryptionService: EncryptionService,
    auditLogger: AuditLogger
  ) {
    this.db = db;
    this.auditLogger = auditLogger;
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
      const userData = await this.exporter.exportAllUserData(userId, options);

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
        metadata: {
          format: options.format || 'json',
          filePath,
        },
      });

      return {
        success: true,
        data: userData,
        filePath,
        exportedAt: new Date(),
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
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Delete all user data (GDPR Article 17)
   */
  async deleteUserData(
    userId: number,
    options: GdprDeleteOptions = {}
  ): Promise<GdprDeleteResult> {
    try {
      // Consent check: User must have active data processing consent
      this.checkConsent(userId, 'data_processing');

      // Delete data using DataDeleter
      const result = await this.deleter.deleteAllUserData(userId, options);

      // Audit log
      this.auditLogger.log({
        eventType: 'gdpr.delete',
        userId: userId.toString(),
        resourceType: 'user_data',
        resourceId: userId.toString(),
        action: 'delete',
        success: true,
        metadata: {
          deletedRecords: result.deletedCount,
          ...result.metadata,
        },
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
        deletedAt: new Date(),
        ...result.metadata,
      };
    } catch (error) {
      // Audit log failure
      this.auditLogger.log({
        eventType: 'gdpr.delete',
        userId: userId.toString(),
        resourceType: 'user_data',
        resourceId: userId.toString(),
        action: 'delete',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Check rate limit for user operations
   */
  private checkRateLimit(userId: number, operation: string): void {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    const limitWindow = 24 * 60 * 60 * 1000; // 24 hours
    const maxRequests = 5;

    const limitInfo = this.rateLimitMap.get(key);
    
    if (limitInfo && now < limitInfo.resetAt) {
      if (limitInfo.count >= maxRequests) {
        throw new RateLimitError(`Rate limit exceeded for ${operation}`);
      }
      limitInfo.count += 1;
    } else {
      this.rateLimitMap.set(key, {
        count: 1,
        resetAt: now + limitWindow,
      });
    }
  }

  /**
   * Check user consent
   */
  private checkConsent(userId: number, consentType: string): void {
    // This would typically query the database for consent records
    // For now, we'll assume consent exists for demonstration
    const consentExists = true; // Replace with actual DB query
    
    if (!consentExists) {
      throw new ConsentRequiredError(`Consent required for ${consentType}`);
    }
  }

  /**
   * Save export data to disk
   */
  private async saveExportToDisk(userId: number, data: any): Promise<string> {
    const exportDir = path.join(process.cwd(), 'exports');
    const fileName = `user_${userId}_export_${Date.now()}.json`;
    const filePath = path.join(exportDir, fileName);
    
    // Ensure directory exists
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Write file
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    
    return filePath;
  }
}