import type Database from "better-sqlite3";
import type { IEventBus } from "../di/service-interfaces.ts";
import type { DomainEvent } from "./DomainEvent.ts";
import { injectable, inject } from "inversify";
import { TYPES } from "../di/types.ts";
import { logger } from "../../../utils/logger";

/**
 * Event Bus Implementation
 * Provides event-driven architecture with pub/sub pattern, event persistence, and replay
 */
@injectable()
export class EventBus implements IEventBus {
  private subscribers: Map<
    string,
    Set<(event: DomainEvent) => void | Promise<void>>
  > = new Map();

  constructor(@inject(TYPES.Database) private db: Database.Database) {}

  /**
   * Subscribe to an event type
   * @param eventType - Event type to subscribe to (e.g., 'case.created')
   * @param handler - Handler function to execute when event is published
   * @returns Unsubscribe function
   */
  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => void | Promise<void>,
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
      throw new Error("Event must implement DomainEvent interface");
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
          logger.error("Error in event handler:", error);
        }
      }

      await Promise.all(promises);
    }
  }

  /**
   * Get events for an aggregate (for replay/debugging)
   * @param aggregateId - Aggregate ID to filter events
   * @param options - Optional filters (date range, event types)
   */
  async getEvents(
    aggregateId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      eventTypes?: string[];
    },
  ): Promise<DomainEvent[]> {
    let sql = "SELECT * FROM events WHERE aggregate_id = ?";
    const params: (string | number)[] = [aggregateId];

    if (options?.fromDate) {
      sql += " AND occurred_at >= ?";
      params.push(options.fromDate.toISOString());
    }

    if (options?.toDate) {
      sql += " AND occurred_at <= ?";
      params.push(options.toDate.toISOString());
    }

    if (options?.eventTypes && options.eventTypes.length > 0) {
      sql += ` AND event_type IN (${options.eventTypes.map(() => "?").join(",")})`;
      params.push(...options.eventTypes);
    }

    sql += " ORDER BY occurred_at ASC";

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Array<{
      id: number;
      aggregate_id: string;
      event_type: string;
      event_data: string;
      occurred_at: string;
    }>;

    return rows.map((row) => {
      const payload = JSON.parse(row.event_data);
      return {
        eventType: row.event_type,
        aggregateId: row.aggregate_id,
        occurredAt: new Date(row.occurred_at),
        getEventName: () => row.event_type,
        getAggregateId: () => row.aggregate_id,
        getPayload: () => payload,
        ...payload,
      } as DomainEvent;
    });
  }

  /**
   * Clear all subscribers (for testing)
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Replay events for an aggregate (for event sourcing)
   * @param aggregateId - Aggregate ID to replay events for
   * @param options - Optional filters (same as getEvents)
   */
  async replay(
    aggregateId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      eventTypes?: string[];
    },
  ): Promise<void> {
    const events = await this.getEvents(aggregateId, options);

    for (const event of events) {
      const eventType = event.getEventName();
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
            logger.error("Error in event replay handler:", error);
          }
        }

        await Promise.all(promises);
      }
    }
  }

  /**
   * Check if object is a DomainEvent
   */
  private isDomainEvent(event: unknown): event is DomainEvent {
    return (
      typeof event === "object" &&
      event !== null &&
      typeof (event as DomainEvent).getEventName === "function" &&
      typeof (event as DomainEvent).getAggregateId === "function" &&
      typeof (event as DomainEvent).getPayload === "function"
    );
  }
}
