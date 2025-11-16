/**
 * Bulk Operation Domain Events
 * Wave 6 Task 4: Bulk Operations
 *
 * Events for tracking progress of bulk operations
 */

import type { DomainEvent } from "../../../shared/infrastructure/events/DomainEvent.ts";

export type BulkOperationType =
  | "bulk_delete_cases"
  | "bulk_update_cases"
  | "bulk_archive_cases"
  | "bulk_delete_evidence"
  | "bulk_tag_evidence";

export type BulkOperationStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "rolled_back";

export interface BulkOperationProgress {
  operationId: string;
  operationType: BulkOperationType;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  status: BulkOperationStatus;
  errors: Array<{ itemId: number; error: string }>;
  startedAt: Date;
  completedAt?: Date;
}

// Export the interface for use in services
export type { BulkOperationProgress as OperationProgress };

/**
 * Event emitted when a bulk operation starts
 */
export class BulkOperationStartedEvent implements DomainEvent {
  public readonly eventType = "bulk.operation.started";
  public readonly occurredAt: Date;

  constructor(
    public readonly operationId: string,
    public readonly operationType: BulkOperationType,
    public readonly totalItems: number,
    public readonly userId: number,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt || new Date();
  }

  getEventName(): string {
    return this.eventType;
  }

  getAggregateId(): string {
    return `bulk-operation-${this.operationId}`;
  }

  getPayload(): Record<string, unknown> {
    return {
      operationId: this.operationId,
      operationType: this.operationType,
      totalItems: this.totalItems,
      userId: this.userId,
    };
  }
}

/**
 * Event emitted as bulk operation progresses
 */
export class BulkOperationProgressEvent implements DomainEvent {
  public readonly eventType = "bulk.operation.progress";
  public readonly occurredAt: Date;

  constructor(
    public readonly operationId: string,
    public readonly processedItems: number,
    public readonly totalItems: number,
    public readonly successCount: number,
    public readonly failureCount: number,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt || new Date();
  }

  getEventName(): string {
    return this.eventType;
  }

  getAggregateId(): string {
    return `bulk-operation-${this.operationId}`;
  }

  getPayload(): Record<string, unknown> {
    return {
      operationId: this.operationId,
      processedItems: this.processedItems,
      totalItems: this.totalItems,
      successCount: this.successCount,
      failureCount: this.failureCount,
      percentComplete: Math.round(
        (this.processedItems / this.totalItems) * 100,
      ),
    };
  }
}

/**
 * Event emitted when bulk operation completes successfully
 */
export class BulkOperationCompletedEvent implements DomainEvent {
  public readonly eventType = "bulk.operation.completed";
  public readonly occurredAt: Date;

  constructor(
    public readonly operationId: string,
    public readonly totalItems: number,
    public readonly successCount: number,
    public readonly failureCount: number,
    public readonly errors: Array<{ itemId: number; error: string }>,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt || new Date();
  }

  getEventName(): string {
    return this.eventType;
  }

  getAggregateId(): string {
    return `bulk-operation-${this.operationId}`;
  }

  getPayload(): Record<string, unknown> {
    return {
      operationId: this.operationId,
      totalItems: this.totalItems,
      successCount: this.successCount,
      failureCount: this.failureCount,
      errors: this.errors,
    };
  }
}

/**
 * Event emitted when bulk operation fails
 */
export class BulkOperationFailedEvent implements DomainEvent {
  public readonly eventType = "bulk.operation.failed";
  public readonly occurredAt: Date;

  constructor(
    public readonly operationId: string,
    public readonly error: string,
    public readonly processedItems: number,
    public readonly totalItems: number,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt || new Date();
  }

  getEventName(): string {
    return this.eventType;
  }

  getAggregateId(): string {
    return `bulk-operation-${this.operationId}`;
  }

  getPayload(): Record<string, unknown> {
    return {
      operationId: this.operationId,
      error: this.error,
      processedItems: this.processedItems,
      totalItems: this.totalItems,
    };
  }
}

/**
 * Event emitted when bulk operation is rolled back
 */
export class BulkOperationRolledBackEvent implements DomainEvent {
  public readonly eventType = "bulk.operation.rolled_back";
  public readonly occurredAt: Date;

  constructor(
    public readonly operationId: string,
    public readonly reason: string,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt || new Date();
  }

  getEventName(): string {
    return this.eventType;
  }

  getAggregateId(): string {
    return `bulk-operation-${this.operationId}`;
  }

  getPayload(): Record<string, unknown> {
    return {
      operationId: this.operationId,
      reason: this.reason,
    };
  }
}
