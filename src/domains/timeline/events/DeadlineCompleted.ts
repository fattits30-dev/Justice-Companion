/**
 * DeadlineCompleted Domain Event
 * Fired when a deadline is marked as completed
 */
export class DeadlineCompleted {
  public readonly eventType = "deadline.completed" as const;
  public readonly occurredAt: Date;

  constructor(
    public readonly deadlineId: number,
    public readonly caseId: number,
    public readonly userId: number,
    public readonly completedAt: string,
    public readonly metadata?: {
      completedBy?: string;
      completionNotes?: string;
      wasOverdue?: boolean;
      daysOverdue?: number;
      source?: string;
    },
  ) {
    this.occurredAt = new Date();
  }

  /**
   * Create a DeadlineCompleted event from a Deadline entity
   */
  static fromEntity(deadline: {
    id: number;
    caseId: number;
    userId: number;
    deadlineDate: string;
    completedAt?: string | null;
  }): DeadlineCompleted {
    const completedDate = deadline.completedAt || new Date().toISOString();
    const wasOverdue =
      new Date(completedDate) > new Date(deadline.deadlineDate);
    let daysOverdue = 0;

    if (wasOverdue) {
      const completed = new Date(completedDate);
      const due = new Date(deadline.deadlineDate);
      const diffTime = completed.getTime() - due.getTime();
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return new DeadlineCompleted(
      deadline.id,
      deadline.caseId,
      deadline.userId,
      completedDate,
      {
        wasOverdue,
        daysOverdue: wasOverdue ? daysOverdue : undefined,
      },
    );
  }

  /**
   * Get event payload for serialization
   */
  getPayload() {
    return {
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      deadlineId: this.deadlineId,
      caseId: this.caseId,
      userId: this.userId,
      completedAt: this.completedAt,
      metadata: this.metadata,
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
    return `deadline-${this.deadlineId}`;
  }

  /**
   * Get related case aggregate ID
   */
  getCaseAggregateId(): string {
    return `case-${this.caseId}`;
  }

  /**
   * Check if deadline was completed late
   */
  wasCompletedLate(): boolean {
    return this.metadata?.wasOverdue || false;
  }

  /**
   * Get days overdue if completed late
   */
  getDaysOverdue(): number {
    return this.metadata?.daysOverdue || 0;
  }
}
