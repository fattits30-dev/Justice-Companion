import type Database from 'better-sqlite3';
import type { IEventBus } from '../di/service-interfaces.ts';
import type { DomainEvent } from './DomainEvent.ts';
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types.ts';

/**
 * Event Bus Implementation
 * Provides event-driven architecture with pub/sub pattern, event persistence, and replay
 */
@injectable()
export class EventBus implements IEventBus {
  private subscribers: Map<string, Set<(event: unknown) => void | Promise<void>>> = new Map();

  constructor(@inject(TYPES.Database) private db: Database.Database) {}

  /**
   * Subscribe to an event type
   * @param eventType - Event type to subscribe to (e.g., 'case.created')
   * @param handler - Handler function to execute when event is published
   * @returns Unsubscribe function
   */
  subscribe<T = unknown>(
    eventType: string,
    handler: (event: T) => void | Promise<void>
  ): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    const handlers = this.subscribers.get(eventType)!;
    handlers.add(handler as (event: unknown) => void | Promise<void>);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as (event: unknown) => void | Promise<void>);
      if (handlers.size === 0) {
        this.subscribers.delete(eventType);
      }
    };
  }

  /**
   * Publish an event to all subscribers
   * @param event - Event object to publish
   */
  async publish<T = unknown>(event: T): Promise<void> {
    // Type guard: check if event implements DomainEvent interface
    if (!this.isDomainEvent(event)) {
      throw new Error('Event must implement DomainEvent interface');
    }

    const eventType = event.getEventName();
    const aggregateId = event.getAggregateId();
    const eventData = JSON.stringify(event.getPayload());

    // Persist event to database for audit trail
    const stmt = this.db.prepare(`
      INSERT INTO events (aggregate_id, event_type, event_data, occurred_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(aggregateId, eventType, eventData, event.occurredAt.toISOString());

    // Notify all subscribers
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const promises: Promise<void>[] = [];

      for (const handler of handlers) {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
          // Continue processing other handlers
        }
      }

      // Wait for all async handlers to complete
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }
  }

  /**
   * Get all persisted events for an aggregate
   * @param aggregateId - Aggregate ID (e.g., 'case-123')
   * @param options - Query options
   * @returns Array of events
   */
  async getEvents(
    aggregateId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      eventTypes?: string[];
      limit?: number;
    }
  ): Promise<Array<{
    id: number;
    aggregateId: string;
    eventType: string;
    eventData: string;
    occurredAt: Date;
  }>> {
    let query = 'SELECT id, aggregate_id as aggregateId, event_type as eventType, event_data as eventData, occurred_at as occurredAt FROM events WHERE aggregate_id = ?';
    const params: (string | number)[] = [aggregateId];

    // Add date range filters
    if (options?.fromDate) {
      query += ' AND occurred_at >= ?';
      params.push(options.fromDate.toISOString());
    }

    if (options?.toDate) {
      query += ' AND occurred_at <= ?';
      params.push(options.toDate.toISOString());
    }

    // Add event type filter
    if (options?.eventTypes && options.eventTypes.length > 0) {
      const placeholders = options.eventTypes.map(() => '?').join(', ');
      query += ` AND event_type IN (${placeholders})`;
      params.push(...options.eventTypes);
    }

    // Add ordering
    query += ' ORDER BY occurred_at ASC';

    // Add limit
    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Array<{
      id: number;
      aggregateId: string;
      eventType: string;
      eventData: string;
      occurredAt: string;
    }>;

    // Convert occurred_at string to Date
    return rows.map(row => ({
      ...row,
      occurredAt: new Date(row.occurredAt)
    }));
  }

  /**
   * Replay events for an aggregate
   * @param aggregateId - Aggregate ID to replay events for
   * @param options - Replay options
   */
  async replay(
    aggregateId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      eventTypes?: string[];
    }
  ): Promise<void> {
    const events = await this.getEvents(aggregateId, options);

    for (const event of events) {
      const eventData = JSON.parse(event.eventData);
      const eventType = event.eventType;

      // Notify subscribers (replay events to handlers)
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        for (const handler of handlers) {
          try {
            const result = handler(eventData);
            if (result instanceof Promise) {
              await result;
            }
          } catch (error) {
            console.error(`Error replaying event ${eventType} (ID: ${event.id}):`, error);
            // Continue replaying other events
          }
        }
      }
    }
  }

  /**
   * Clear all subscribers (for testing)
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Type guard to check if an object implements DomainEvent interface
   */
  private isDomainEvent(event: unknown): event is DomainEvent {
    return (
      typeof event === 'object' &&
      event !== null &&
      'eventType' in event &&
      'occurredAt' in event &&
      typeof (event as DomainEvent).getEventName === 'function' &&
      typeof (event as DomainEvent).getAggregateId === 'function' &&
      typeof (event as DomainEvent).getPayload === 'function'
    );
  }
}
