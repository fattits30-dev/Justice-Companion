/**
 * DeadlineCreated Domain Event
 * Fired when a new deadline is created for a case
 */
export class DeadlineCreated {
  public readonly eventType = 'deadline.created' as const;
  public readonly occurredAt: Date;

  constructor(
    public readonly deadlineId: number,
    public readonly caseId: number,
    public readonly userId: number,
    public readonly title: string,
    public readonly deadlineDate: string,
    public readonly priority: 'high' | 'medium' | 'low',
    public readonly metadata?: {
      description?: string;
      createdBy?: string;
      source?: string;
      daysUntilDeadline?: number;
      isUrgent?: boolean;
    }
  ) {
    this.occurredAt = new Date();
  }

  /**
   * Create a DeadlineCreated event from a Deadline entity
   */
  static fromEntity(deadline: {
    id: number;
    caseId: number;
    userId: number;
    title: string;
    deadlineDate: string;
    priority: 'high' | 'medium' | 'low';
    description?: string | null;
  }): DeadlineCreated {
    const daysUntil = DeadlineCreated.calculateDaysUntil(deadline.deadlineDate);
    return new DeadlineCreated(
      deadline.id,
      deadline.caseId,
      deadline.userId,
      deadline.title,
      deadline.deadlineDate,
      deadline.priority,
      {
        description: deadline.description || undefined,
        daysUntilDeadline: daysUntil,
        isUrgent: daysUntil >= 0 && daysUntil <= 7
      }
    );
  }

  /**
   * Calculate days until deadline
   */
  private static calculateDaysUntil(deadlineDate: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
      title: this.title,
      deadlineDate: this.deadlineDate,
      priority: this.priority,
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
    return `deadline-${this.deadlineId}`;
  }

  /**
   * Get related case aggregate ID
   */
  getCaseAggregateId(): string {
    return `case-${this.caseId}`;
  }

  /**
   * Check if deadline is high priority
   */
  isHighPriority(): boolean {
    return this.priority === 'high';
  }

  /**
   * Check if deadline is urgent (within 7 days)
   */
  isUrgent(): boolean {
    return this.metadata?.isUrgent || false;
  }
}