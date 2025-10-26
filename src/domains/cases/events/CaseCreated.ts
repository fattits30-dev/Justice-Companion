import type { DomainEvent } from '../../../shared/infrastructure/events/DomainEvent.ts';

/**
 * CaseCreated Domain Event
 * Fired when a new case is created in the system
 */
export class CaseCreated implements DomainEvent {
  public readonly eventType = 'case.created' as const;
  public readonly occurredAt: Date;

  constructor(
    public readonly caseId: number,
    public readonly userId: number,
    public readonly title: string,
    public readonly caseType: string,
    public readonly status: string,
    public readonly metadata?: {
      description?: string;
      createdBy?: string;
      source?: string;
    }
  ) {
    this.occurredAt = new Date();
  }

  /**
   * Create a CaseCreated event from a Case entity
   */
  static fromEntity(case_: {
    id: number;
    userId: number | null;
    title: string;
    caseType: string;
    status: string;
    description?: string | null;
  }): CaseCreated {
    return new CaseCreated(
      case_.id,
      case_.userId || 0,
      case_.title,
      case_.caseType,
      case_.status,
      {
        description: case_.description || undefined
      }
    );
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
      title: this.title,
      caseType: this.caseType,
      status: this.status,
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
}