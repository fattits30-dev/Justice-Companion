/**
 * Base Domain Event Interface
 * All domain events should implement this interface
 */
export interface DomainEvent {
  /**
   * Event type identifier (e.g., 'case.created', 'evidence.uploaded')
   */
  readonly eventType: string;

  /**
   * Timestamp when event occurred
   */
  readonly occurredAt: Date;

  /**
   * Get event name for routing
   */
  getEventName(): string;

  /**
   * Get aggregate ID for event sourcing
   */
  getAggregateId(): string;

  /**
   * Get event payload for serialization
   */
  getPayload(): Record<string, unknown>;
}
