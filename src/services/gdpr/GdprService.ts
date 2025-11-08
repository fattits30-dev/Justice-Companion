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

import type Database from "better-sqlite3";
import { EncryptionService } from "../EncryptionService.ts";
import { AuditLogger } from "../AuditLogger.ts";
import { DataExporter } from "./DataExporter.ts";
import { DataDeleter } from "./DataDeleter.ts";
import type {
  GdprExportOptions,
  GdprExportResult,
  GdprDeleteOptions,
  GdprDeleteResult,
} from "../../models/Gdpr.ts";
import { RateLimitError, ConsentRequiredError } from "../../models/Gdpr.ts";
import * as fs from "fs";
import * as path from "path";

export class GdprService {
  private db: Database.Database;
  private exporter: DataExporter;
  private deleter: DataDeleter;
  private rateLimitMap: Map<string, { count: number; resetAt: number }> =
    new Map();
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
      this.checkRateLimit(userId, "export");

      // Consent check: User must have active data processing consent
      this.checkConsent(userId, "data_processing");

      // Export data using DataExporter
      const userData = await this.exporter.exportAllUserData(userId, options);

      // Optionally save to disk
      let filePath: string | undefined;
      if (options.format === "json") {
        filePath = await this.saveExportToDisk(userId, userData);
      }

      // Audit log
      this.auditLogger.log({
        eventType: "gdpr.export",
        userId: userId.toString(),
        resourceType: "user_data",
        resourceId: userId.toString(),
        action: "export",
        success: true,
        details: {
          format: options.format || "json",
          filePath,
        },
      });

      return {
        ...userData,
        filePath,
      };
    } catch (error) {
      // Audit log failure
      this.auditLogger.log({
        eventType: "gdpr.export",
        userId: userId.toString(),
        resourceType: "user_data",
        resourceId: userId.toString(),
        action: "export",
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Delete all user data (GDPR Article 17)
   */
  async deleteUserData(
    userId: number,
    options: GdprDeleteOptions
  ): Promise<GdprDeleteResult> {
    try {
      // Consent check: User must have active data processing consent
      this.checkConsent(userId, "data_processing");

      // Optionally export before delete
      let exportPath: string | undefined;
      if (options.exportBeforeDelete) {
        const exportResult = await this.exportUserData(userId, {
          format: "json",
        });
        exportPath = exportResult.filePath;
      }

      // Delete data using DataDeleter
      const result = await this.deleter.deleteAllUserData(userId, {
        ...options,
        confirmed: true,
      });

      // Audit log (created AFTER deletion so it's preserved)
      this.auditLogger.log({
        eventType: "gdpr.erasure",
        userId: userId.toString(),
        resourceType: "user_data",
        resourceId: userId.toString(),
        action: "delete",
        success: true,
        details: {
          reason: options.reason,
          exportPath,
        },
      });

      return {
        ...result,
        // Add 1 to audit logs count to account for deletion log created above
        preservedAuditLogs: result.preservedAuditLogs + 1,
        exportPath,
      };
    } catch (error) {
      // Audit log failure
      this.auditLogger.log({
        eventType: "gdpr.deletion_request",
        userId: userId.toString(),
        resourceType: "user_data",
        resourceId: userId.toString(),
        action: "delete",
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
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
    // Query database for active consent
    const consent = this.db
      .prepare(
        `
      SELECT id, granted
      FROM consents
      WHERE user_id = ?
        AND consent_type = ?
        AND revoked_at IS NULL
    `
      )
      .get(userId, consentType) as { id: number; granted: number } | undefined;

    const consentExists = consent && consent.granted === 1;

    if (!consentExists) {
      throw new ConsentRequiredError(`consent required for ${consentType}`);
    }
  }

  /**
   * Save export data to disk
   */
  private async saveExportToDisk(userId: number, data: any): Promise<string> {
    const exportDir = path.join(process.cwd(), "exports");
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
