import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { EventBus } from './EventBus.ts';
import type { DomainEvent } from './DomainEvent.ts';

// Test event implementation
class TestEvent implements DomainEvent {
  public readonly eventType = 'test.created' as const;
  public readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly data: string
  ) {
    this.occurredAt = new Date();
  }

  getEventName(): string {
    return this.eventType;
  }

  getAggregateId(): string {
    return this.aggregateId;
  }

  getPayload(): Record<string, unknown> {
    return {
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      data: this.data,
      occurredAt: this.occurredAt.toISOString(),
    };
  }
}

describe('EventBus', () => {
  let db: Database.Database;
  let eventBus: EventBus;

  beforeEach(() => {
    // Create in-memory database for each test
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Create events table
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        aggregate_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT NOT NULL,
        occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_events_aggregate_id ON events(aggregate_id);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_aggregate_occurred ON events(aggregate_id, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(occurred_at);
    `);

    // Create EventBus instance
    eventBus = new EventBus(db);
  });

  describe('subscribe', () => {
    it('should subscribe to an event type', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribe('test.created', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow multiple subscribers for same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test.created', handler1);
      eventBus.subscribe('test.created', handler2);

      // Both handlers should be subscribed (verified in publish tests)
    });
  });

  describe('publish', () => {
    it('should publish event to subscribers', async () => {
      const handler = vi.fn();
      eventBus.subscribe('test.created', handler);

      const event = new TestEvent('test-123', 'test data');
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should publish event to multiple subscribers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test.created', handler1);
      eventBus.subscribe('test.created', handler2);

      const event = new TestEvent('test-123', 'test data');
      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should persist event to database', async () => {
      const event = new TestEvent('test-123', 'test data');
      await eventBus.publish(event);

      const row = db
        .prepare('SELECT * FROM events WHERE aggregate_id = ?')
        .get('test-123') as { id: number; aggregate_id: string; event_type: string; event_data: string; occurred_at: string };

      expect(row).toBeDefined();
      expect(row.aggregate_id).toBe('test-123');
      expect(row.event_type).toBe('test.created');
      expect(row.event_data).toContain('test data');
    });

    it('should persist event data as JSON', async () => {
      const event = new TestEvent('test-123', 'test data');
      await eventBus.publish(event);

      const row = db
        .prepare('SELECT event_data FROM events WHERE aggregate_id = ?')
        .get('test-123') as { event_data: string };

      const parsedData = JSON.parse(row.event_data);
      expect(parsedData.aggregateId).toBe('test-123');
      expect(parsedData.data).toBe('test data');
      expect(parsedData.eventType).toBe('test.created');
    });

    it('should handle async handlers', async () => {
      const asyncHandler = vi.fn(async (event: TestEvent) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return;
      });

      eventBus.subscribe('test.created', asyncHandler);

      const event = new TestEvent('test-123', 'test data');
      await eventBus.publish(event);

      expect(asyncHandler).toHaveBeenCalledWith(event);
    });

    it('should continue publishing even if one handler fails', async () => {
      const failingHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = vi.fn();

      eventBus.subscribe('test.created', failingHandler);
      eventBus.subscribe('test.created', successHandler);

      const event = new TestEvent('test-123', 'test data');
      await eventBus.publish(event);

      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('should throw error if event does not implement DomainEvent interface', async () => {
      const invalidEvent = { foo: 'bar' };

      await expect(eventBus.publish(invalidEvent)).rejects.toThrow(
        'Event must implement DomainEvent interface'
      );
    });

    it('should not notify subscribers of different event types', async () => {
      const handler = vi.fn();
      eventBus.subscribe('test.updated', handler);

      const event = new TestEvent('test-123', 'test data'); // test.created
      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from an event type', async () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribe('test.created', handler);

      unsubscribe();

      const event = new TestEvent('test-123', 'test data');
      await eventBus.publish(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only unsubscribe specific handler', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = eventBus.subscribe('test.created', handler1);
      eventBus.subscribe('test.created', handler2);

      unsubscribe1();

      const event = new TestEvent('test-123', 'test data');
      await eventBus.publish(event);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('getEvents', () => {
    it('should retrieve events for an aggregate', async () => {
      const event1 = new TestEvent('test-123', 'data 1');
      const event2 = new TestEvent('test-123', 'data 2');

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      const events = await eventBus.getEvents('test-123');

      expect(events).toHaveLength(2);
      expect(events[0].aggregateId).toBe('test-123');
      expect(events[1].aggregateId).toBe('test-123');
    });

    it('should filter events by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const event = new TestEvent('test-123', 'data');
      await eventBus.publish(event);

      const eventsInRange = await eventBus.getEvents('test-123', {
        fromDate: yesterday,
        toDate: tomorrow,
      });

      expect(eventsInRange).toHaveLength(1);

      const eventsOutOfRange = await eventBus.getEvents('test-123', {
        fromDate: tomorrow,
        toDate: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
      });

      expect(eventsOutOfRange).toHaveLength(0);
    });

    it('should filter events by event types', async () => {
      // Create custom event class for testing
      class UpdatedEvent implements DomainEvent {
        public readonly eventType = 'test.updated' as const;
        public readonly occurredAt = new Date();

        constructor(public readonly aggregateId: string) {}

        getEventName(): string {
          return this.eventType;
        }

        getAggregateId(): string {
          return this.aggregateId;
        }

        getPayload(): Record<string, unknown> {
          return { eventType: this.eventType, aggregateId: this.aggregateId };
        }
      }

      const createdEvent = new TestEvent('test-123', 'data');
      const updatedEvent = new UpdatedEvent('test-123');

      await eventBus.publish(createdEvent);
      await eventBus.publish(updatedEvent);

      const filteredEvents = await eventBus.getEvents('test-123', {
        eventTypes: ['test.created'],
      });

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].eventType).toBe('test.created');
    });

    it('should limit number of events returned', async () => {
      for (let i = 0; i < 10; i++) {
        const event = new TestEvent('test-123', `data ${i}`);
        await eventBus.publish(event);
      }

      const events = await eventBus.getEvents('test-123', { limit: 5 });

      expect(events).toHaveLength(5);
    });

    it('should return events in chronological order', async () => {
      const event1 = new TestEvent('test-123', 'first');
      const event2 = new TestEvent('test-123', 'second');
      const event3 = new TestEvent('test-123', 'third');

      await eventBus.publish(event1);
      await eventBus.publish(event2);
      await eventBus.publish(event3);

      const events = await eventBus.getEvents('test-123');

      expect(events).toHaveLength(3);
      const data1 = JSON.parse(events[0].eventData);
      const data2 = JSON.parse(events[1].eventData);
      const data3 = JSON.parse(events[2].eventData);
      expect(data1.data).toBe('first');
      expect(data2.data).toBe('second');
      expect(data3.data).toBe('third');
    });
  });

  describe('replay', () => {
    it('should replay events to subscribers', async () => {
      const event1 = new TestEvent('test-123', 'data 1');
      const event2 = new TestEvent('test-123', 'data 2');

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      // Clear subscribers and add new one
      eventBus.clearSubscribers();
      const handler = vi.fn();
      eventBus.subscribe('test.created', handler);

      await eventBus.replay('test-123');

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should replay events in chronological order', async () => {
      const event1 = new TestEvent('test-123', 'first');
      const event2 = new TestEvent('test-123', 'second');

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      const calls: string[] = [];
      const handler = vi.fn((event: { data: string }) => {
        calls.push(event.data);
      });

      eventBus.clearSubscribers();
      eventBus.subscribe('test.created', handler);

      await eventBus.replay('test-123');

      expect(calls).toEqual(['first', 'second']);
    });

    it('should replay only events matching filter', async () => {
      class UpdatedEvent implements DomainEvent {
        public readonly eventType = 'test.updated' as const;
        public readonly occurredAt = new Date();

        constructor(public readonly aggregateId: string) {}

        getEventName(): string {
          return this.eventType;
        }

        getAggregateId(): string {
          return this.aggregateId;
        }

        getPayload(): Record<string, unknown> {
          return { eventType: this.eventType, aggregateId: this.aggregateId };
        }
      }

      const createdEvent = new TestEvent('test-123', 'created');
      const updatedEvent = new UpdatedEvent('test-123');

      await eventBus.publish(createdEvent);
      await eventBus.publish(updatedEvent);

      const handler = vi.fn();
      eventBus.clearSubscribers();
      eventBus.subscribe('test.created', handler);

      await eventBus.replay('test-123', {
        eventTypes: ['test.created'],
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should continue replay even if handler fails', async () => {
      const event1 = new TestEvent('test-123', 'data 1');
      const event2 = new TestEvent('test-123', 'data 2');

      await eventBus.publish(event1);
      await eventBus.publish(event2);

      let callCount = 0;
      const failingHandler = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Handler error');
        }
      });

      eventBus.clearSubscribers();
      eventBus.subscribe('test.created', failingHandler);

      await eventBus.replay('test-123');

      expect(failingHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearSubscribers', () => {
    it('should remove all subscribers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test.created', handler1);
      eventBus.subscribe('test.updated', handler2);

      eventBus.clearSubscribers();

      const event = new TestEvent('test-123', 'data');
      await eventBus.publish(event);

      expect(handler1).not.toHaveBeenCalled();
    });
  });
});
