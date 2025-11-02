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
  private subscribers: Map<string, Set<(event: DomainEvent) => void | Promise<void>>> = new Map();

  constructor(@inject(TYPES.Database) private db: Database.Database) {}

  /**
   * Subscribe to an event type
   * @param eventType - Event type to subscribe to (e.g., 'case.created')
   * @param handler - Handler function to execute when event is published
   * @returns Unsubscribe function
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => void | Promise<void>
  ): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    const handlers = this.subscribers.get(eventType)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(eventType);
      }
    };
  }

  /**
   * Publish an event to all subscribers
   * @param event - Event object to publish
   */
  async publish(event: DomainEvent): Promise<void> {
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
          console.error('Error in event handler:', error);
        }
      }

      await Promise.all(promises);
    }
  }

  /**
   * Check if object is a DomainEvent
   */
  private isDomainEvent(event: unknown): event is DomainEvent {
    return (
      typeof event === 'object' &&
      event !== null &&
      typeof (event as DomainEvent).getEventName === 'function' &&
      typeof (event as DomainEvent).getAggregateId === 'function' &&
      typeof (event as DomainEvent).getPayload === 'function'
    );
  }
}