/**
 * Bulk Operation Service
 * Wave 6 Task 4: Bulk Operations
 *
 * Provides bulk operations on cases and evidence with:
 * - Transaction support with rollback
 * - Progress tracking via EventBus
 * - Comprehensive audit logging
 */

import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { IEventBus } from '../shared/infrastructure/di/service-interfaces.ts';
import type { CaseRepository } from '../repositories/CaseRepository.ts';
import type { EvidenceRepository } from '../repositories/EvidenceRepository.ts';
import type { AuditLogger } from './AuditLogger.ts';
import type { UpdateCaseInput } from '../domains/cases/entities/Case.ts';
import {
  BulkOperationStartedEvent,
  BulkOperationProgressEvent,
  BulkOperationCompletedEvent,
  BulkOperationFailedEvent,
  BulkOperationRolledBackEvent,
  type BulkOperationProgress,
  type BulkOperationType,
} from '../domains/bulk/events/BulkOperationEvents.ts';

export interface BulkOperationOptions {
  /**
   * If true, stop processing on first error and rollback
   * If false, continue processing and collect errors
   */
  failFast?: boolean;

  /**
   * Emit progress events every N items (default: 10)
   */
  progressInterval?: number;

  /**
   * Maximum number of items to process in a single transaction
   * If exceeded, operations will be batched (default: 1000)
   */
  batchSize?: number;
}

export interface BulkOperationResult {
  operationId: string;
  totalItems: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ itemId: number; error: string }>;
  rolledBack: boolean;
}

export class BulkOperationService {
  private db: Database.Database;
  private eventBus: IEventBus;
  private caseRepository: CaseRepository;
  private evidenceRepository: EvidenceRepository;
  private auditLogger: AuditLogger;

  constructor(
    db: Database.Database,
    eventBus: IEventBus,
    caseRepository: CaseRepository,
    evidenceRepository: EvidenceRepository,
    auditLogger: AuditLogger
  ) {
    this.db = db;
    this.eventBus = eventBus;
    this.caseRepository = caseRepository;
    this.evidenceRepository = evidenceRepository;
    this.auditLogger = auditLogger;
  }

  /**
   * Delete multiple cases in a transaction
   */
  async bulkDeleteCases(
    caseIds: number[],
    userId: number,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const operationId = uuidv4();
    const operationType: BulkOperationType = 'bulk_delete_cases';

    return this.executeBulkOperation(
      operationId,
      operationType,
      caseIds,
      userId,
      async (caseId) => {
        const success = this.caseRepository.delete(caseId);
        if (!success) {
          throw new Error(`Failed to delete case ${caseId}`);
        }
      },
      options
    );
  }

  /**
   * Update multiple cases with the same updates in a transaction
   */
  async bulkUpdateCases(
    caseIds: number[],
    updates: UpdateCaseInput,
    userId: number,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const operationId = uuidv4();
    const operationType: BulkOperationType = 'bulk_update_cases';

    return this.executeBulkOperation(
      operationId,
      operationType,
      caseIds,
      userId,
      async (caseId) => {
        const result = this.caseRepository.update(caseId, updates);
        if (!result) {
          throw new Error(`Failed to update case ${caseId}`);
        }
      },
      options
    );
  }

  /**
   * Archive multiple cases (set status to 'closed')
   */
  async bulkArchiveCases(
    caseIds: number[],
    userId: number,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const operationId = uuidv4();
    const operationType: BulkOperationType = 'bulk_archive_cases';

    return this.executeBulkOperation(
      operationId,
      operationType,
      caseIds,
      userId,
      async (caseId) => {
        const result = this.caseRepository.close(caseId);
        if (!result) {
          throw new Error(`Failed to archive case ${caseId}`);
        }
      },
      options
    );
  }

  /**
   * Delete multiple evidence items in a transaction
   */
  async bulkDeleteEvidence(
    evidenceIds: number[],
    userId: number,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const operationId = uuidv4();
    const operationType: BulkOperationType = 'bulk_delete_evidence';

    return this.executeBulkOperation(
      operationId,
      operationType,
      evidenceIds,
      userId,
      async (evidenceId) => {
        const success = this.evidenceRepository.delete(evidenceId);
        if (!success) {
          throw new Error(`Failed to delete evidence ${evidenceId}`);
        }
      },
      options
    );
  }

  /**
   * Core bulk operation executor with transaction support and progress tracking
   */
  private async executeBulkOperation<T extends number>(
    operationId: string,
    operationType: BulkOperationType,
    items: T[],
    userId: number,
    operation: (item: T) => Promise<void>,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const {
      failFast = false,
      progressInterval = 10,
      batchSize = 1000,
    } = options;

    const totalItems = items.length;
    let processedItems = 0;
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ itemId: number; error: string }> = [];
    let rolledBack = false;

    // Emit started event
    await this.eventBus.publish(
      new BulkOperationStartedEvent(operationId, operationType, totalItems, userId)
    );

    // Audit: Bulk operation started
    this.auditLogger.log({
      eventType: `bulk.${operationType}.started`,
      resourceType: 'bulk_operation',
      resourceId: operationId,
      action: 'start',
      details: {
        totalItems,
        operationType,
        userId,
        failFast,
      },
      success: true,
    });

    try {
      // If items exceed batch size, process in batches
      if (items.length > batchSize) {
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const batchResult = await this.processBatch(
            operationId,
            operationType,
            batch,
            operation,
            failFast,
            progressInterval,
            processedItems,
            totalItems
          );

          processedItems += batchResult.processedItems;
          successCount += batchResult.successCount;
          failureCount += batchResult.failureCount;
          errors.push(...batchResult.errors);

          if (batchResult.rolledBack) {
            rolledBack = true;
            throw new Error('Batch processing failed and was rolled back');
          }
        }
      } else {
        // Process all items in a single transaction
        const batchResult = await this.processBatch(
          operationId,
          operationType,
          items,
          operation,
          failFast,
          progressInterval,
          0,
          totalItems
        );

        processedItems = batchResult.processedItems;
        successCount = batchResult.successCount;
        failureCount = batchResult.failureCount;
        errors.push(...batchResult.errors);
        rolledBack = batchResult.rolledBack;
      }

      // Emit completed event
      await this.eventBus.publish(
        new BulkOperationCompletedEvent(
          operationId,
          totalItems,
          successCount,
          failureCount,
          errors
        )
      );

      // Audit: Bulk operation completed
      this.auditLogger.log({
        eventType: `bulk.${operationType}.completed`,
        resourceType: 'bulk_operation',
        resourceId: operationId,
        action: 'complete',
        details: {
          totalItems,
          successCount,
          failureCount,
          errorCount: errors.length,
        },
        success: true,
      });

      return {
        operationId,
        totalItems,
        successCount,
        failureCount,
        errors,
        rolledBack,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Emit failed event
      await this.eventBus.publish(
        new BulkOperationFailedEvent(operationId, errorMessage, processedItems, totalItems)
      );

      // Audit: Bulk operation failed
      this.auditLogger.log({
        eventType: `bulk.${operationType}.failed`,
        resourceType: 'bulk_operation',
        resourceId: operationId,
        action: 'fail',
        details: {
          totalItems,
          processedItems,
          successCount,
          failureCount,
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      return {
        operationId,
        totalItems,
        successCount,
        failureCount,
        errors,
        rolledBack: true,
      };
    }
  }

  /**
   * Process a batch of items within a transaction
   */
  private async processBatch<T extends number>(
    operationId: string,
    operationType: BulkOperationType,
    items: T[],
    operation: (item: T) => Promise<void>,
    failFast: boolean,
    progressInterval: number,
    startIndex: number,
    totalItems: number
  ): Promise<{
    processedItems: number;
    successCount: number;
    failureCount: number;
    errors: Array<{ itemId: number; error: string }>;
    rolledBack: boolean;
  }> {
    let processedItems = 0;
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ itemId: number; error: string }> = [];
    let rolledBack = false;

    // Wrap in transaction
    const transaction = this.db.transaction((items: T[]) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          // Execute operation synchronously within transaction
          // Note: We can't use async/await inside better-sqlite3 transaction
          // So we'll execute operations outside transaction for now
          processedItems++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ itemId: item, error: errorMessage });
          failureCount++;

          if (failFast) {
            throw error; // Rollback transaction
          }
        }
      }
    });

    try {
      // Since better-sqlite3 transactions don't support async operations,
      // we'll use manual BEGIN/COMMIT/ROLLBACK
      this.db.prepare('BEGIN').run();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          await operation(item);
          successCount++;
          processedItems++;

          // Emit progress event periodically
          if (processedItems % progressInterval === 0) {
            await this.eventBus.publish(
              new BulkOperationProgressEvent(
                operationId,
                startIndex + processedItems,
                totalItems,
                successCount,
                failureCount
              )
            );
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ itemId: item, error: errorMessage });
          failureCount++;

          if (failFast) {
            // Rollback transaction
            this.db.prepare('ROLLBACK').run();
            rolledBack = true;

            // Emit rollback event
            await this.eventBus.publish(
              new BulkOperationRolledBackEvent(operationId, errorMessage)
            );

            // Audit: Transaction rolled back
            this.auditLogger.log({
              eventType: `bulk.${operationType}.rolled_back`,
              resourceType: 'bulk_operation',
              resourceId: operationId,
              action: 'rollback',
              details: {
                reason: errorMessage,
                processedItems,
                successCount,
                failureCount,
              },
              success: true,
            });

            throw error;
          }
        }
      }

      // Commit transaction
      this.db.prepare('COMMIT').run();
    } catch (error) {
      // If not already rolled back, rollback now
      if (!rolledBack) {
        try {
          this.db.prepare('ROLLBACK').run();
          rolledBack = true;
        } catch (rollbackError) {
          console.error('Failed to rollback transaction:', rollbackError);
        }
      }
      throw error;
    }

    return {
      processedItems,
      successCount,
      failureCount,
      errors,
      rolledBack,
    };
  }

  /**
   * Get progress for a bulk operation by ID
   */
  async getOperationProgress(operationId: string): Promise<BulkOperationProgress | null> {
    try {
      const events = await this.eventBus.getEvents(`bulk-operation-${operationId}`);

      if (events.length === 0) {
        return null;
      }

      // Reconstruct progress from events
      let totalItems = 0;
      let processedItems = 0;
      let successCount = 0;
      let failureCount = 0;
      let status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back' = 'pending';
      let operationType: BulkOperationType = 'bulk_delete_cases';
      const errors: Array<{ itemId: number; error: string }> = [];
      let startedAt: Date | null = null;
      let completedAt: Date | null = null;

      for (const event of events) {
        const eventData = JSON.parse(event.eventData);

        switch (event.eventType) {
          case 'bulk.operation.started':
            totalItems = eventData.totalItems;
            operationType = eventData.operationType;
            status = 'in_progress';
            startedAt = event.occurredAt;
            break;

          case 'bulk.operation.progress':
            processedItems = eventData.processedItems;
            successCount = eventData.successCount;
            failureCount = eventData.failureCount;
            break;

          case 'bulk.operation.completed':
            processedItems = eventData.totalItems;
            successCount = eventData.successCount;
            failureCount = eventData.failureCount;
            errors.push(...eventData.errors);
            status = 'completed';
            completedAt = event.occurredAt;
            break;

          case 'bulk.operation.failed':
            processedItems = eventData.processedItems;
            status = 'failed';
            completedAt = event.occurredAt;
            break;

          case 'bulk.operation.rolled_back':
            status = 'rolled_back';
            completedAt = event.occurredAt;
            break;
        }
      }

      return {
        operationId,
        operationType,
        totalItems,
        processedItems,
        successCount,
        failureCount,
        status,
        errors,
        startedAt: startedAt || new Date(),
        completedAt: completedAt || undefined,
      };
    } catch (error) {
      console.error('Failed to get operation progress:', error);
      return null;
    }
  }
}
