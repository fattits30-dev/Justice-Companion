/**
 * CaseUpdated Domain Event
 * Fired when a case is updated in the system
 */
export class CaseUpdated {
  public readonly eventType = 'case.updated' as const;
  public readonly occurredAt: Date;

  constructor(
    public readonly caseId: number,
    public readonly userId: number,
    public readonly changes: {
      title?: string;
      description?: string;
      caseType?: string;
      status?: string;
    },
    public readonly previousValues?: {
      title?: string;
      description?: string;
      caseType?: string;
      status?: string;
    },
    public readonly metadata?: {
      updatedBy?: string;
      reason?: string;
      source?: string;
    }
  ) {
    this.occurredAt = new Date();
  }

  /**
   * Get event payload for serialization
   */
  getPayload() {
    return {
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      caseId: this.caseId,
      userId: this.userId,
      changes: this.changes,
      previousValues: this.previousValues,
      metadata: this.metadata
    };
  }

  /**
   * Get event name for event bus routing
   */
  getEventName(): string {
    return this.eventType;
  }

  /**
   * Get aggregate ID for event sourcing
   */
  getAggregateId(): string {
    return `case-${this.caseId}`;
  }

  /**
   * Check if status was changed
   */
  isStatusChange(): boolean {
    return this.changes.status !== undefined &&
           this.previousValues?.status !== undefined &&
           this.changes.status !== this.previousValues.status;
  }

  /**
   * Check if case was closed
   */
  isCaseClosed(): boolean {
    return this.isStatusChange() && this.changes.status === 'closed';
  }
}