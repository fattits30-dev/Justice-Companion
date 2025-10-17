import { useState, useEffect } from 'react';
import type { TimelineEvent, CreateTimelineEventInput, UpdateTimelineEventInput } from '@/models/TimelineEvent';

export function useTimeline(caseId: number) {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTimelineEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.timeline.list(caseId);
      if (result.success) {
        setTimelineEvents(result.data || []);
      } else {
        setError(result.error || 'Failed to load timeline events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createTimelineEvent = async (input: CreateTimelineEventInput) => {
    try {
      const result = await window.electron.timeline.create(input);
      if (result.success && result.data) {
        setTimelineEvents((prev) => [...prev, result.data!]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create timeline event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateTimelineEvent = async (id: number, input: UpdateTimelineEventInput) => {
    try {
      const result = await window.electron.timeline.update(id, input);
      if (result.success && result.data) {
        setTimelineEvents((prev) =>
          prev.map((event) => (event.id === id ? result.data! : event)),
        );
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update timeline event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteTimelineEvent = async (id: number) => {
    try {
      const result = await window.electron.timeline.delete(id);
      if (result.success) {
        setTimelineEvents((prev) => prev.filter((event) => event.id !== id));
      } else {
        throw new Error(result.error || 'Failed to delete timeline event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  useEffect(() => {
    void loadTimelineEvents();
  }, [caseId]);

  return {
    timelineEvents,
    loading,
    error,
    createTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    refresh: loadTimelineEvents,
  };
}
