import type { TimelineEvent } from '@/models/TimelineEvent';
import { useState, useMemo, useCallback, memo } from 'react';
import { useTimeline } from '../hooks/useTimeline';
import { TimelineEventCard } from './TimelineEventCard';

export interface TimelineViewProps {
  caseId: number;
}

const TimelineViewComponent = ({ caseId }: TimelineViewProps) => {
  const {
    timelineEvents,
    loading,
    error,
    createTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
  } = useTimeline(caseId);

  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    eventDate: '',
    description: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEvent, setEditEvent] = useState({
    title: '',
    eventDate: '',
    description: '',
  });

  const handleCreate = useCallback(async () => {
    if (newEvent.title.trim() && newEvent.eventDate) {
      await createTimelineEvent({
        caseId,
        title: newEvent.title,
        eventDate: newEvent.eventDate,
        description: newEvent.description,
      });
      setNewEvent({ title: '', eventDate: '', description: '' });
      setIsCreating(false);
    }
  }, [caseId, newEvent, createTimelineEvent]);

  const handleUpdate = useCallback(async (id: number) => {
    if (editEvent.title.trim() && editEvent.eventDate) {
      await updateTimelineEvent(id, {
        title: editEvent.title,
        eventDate: editEvent.eventDate,
        description: editEvent.description,
      });
      setEditingId(null);
    }
  }, [editEvent, updateTimelineEvent]);

  const handleDelete = useCallback((id: number) => {
    if (window.confirm('Delete this event?')) {
      void deleteTimelineEvent(id);
    }
  }, [deleteTimelineEvent]);

  const handleFieldChange = useCallback((field: 'title' | 'eventDate' | 'description', value: string) => {
    setEditEvent({ ...editEvent, [field]: value });
  }, [editEvent]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600">Loading timeline...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-700 bg-red-50 rounded">
        Error: {error}
      </div>
    );
  }

  // Sort events by date (most recent first) - memoized to prevent re-sort on unrelated state changes
  const sortedEvents = useMemo(() => {
    return [...timelineEvents].sort(
      (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );
  }, [timelineEvents]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="m-0 text-gray-800 text-2xl font-medium">
          Timeline ({timelineEvents.length} events)
        </h2>

        <button
          onClick={() => setIsCreating(true)}
          className="px-5 py-2.5 bg-pink-700 text-white border-0 rounded cursor-pointer font-bold text-sm transition-colors hover:bg-pink-800"
        >
          + Add Event
        </button>
      </div>

      {/* New Event Creator */}
      {isCreating && (
        <div className="mb-6 p-4 bg-pink-50 border-2 border-pink-700 rounded-lg">
          <div className="mb-3">
            <label className="block mb-2 font-bold text-gray-800">
              Event Title:
            </label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Enter event title..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="block mb-2 font-bold text-gray-800">
              Event Date:
            </label>
            <input
              type="date"
              value={newEvent.eventDate}
              onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          <div className="mb-3">
            <label className="block mb-2 font-bold text-gray-800">
              Description (optional):
            </label>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="Enter event description..."
              className="w-full min-h-[100px] px-3 py-3 border border-gray-300 rounded text-sm font-[inherit] resize-y"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-green-700 text-white border-0 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-green-800"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewEvent({ title: '', eventDate: '', description: '' });
              }}
              className="px-4 py-2 bg-gray-600 text-white border-0 rounded text-sm font-bold cursor-pointer transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vertical Timeline */}
      {sortedEvents.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-gray-100 rounded-lg">
          No timeline events yet. Click "Add Event" to create one.
        </div>
      ) : (
        <div className="relative pl-10">
          {/* Vertical Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-700 to-pink-500" />

          {/* Timeline Events */}
          {sortedEvents.map((event: TimelineEvent) => (
            <TimelineEventCard
              key={event.id}
              event={event}
              isEditing={editingId === event.id}
              editEvent={editEvent}
              onEditClick={() => {
                setEditingId(event.id);
                setEditEvent({
                  title: event.title,
                  eventDate: event.eventDate,
                  description: event.description || '',
                });
              }}
              onFieldChange={handleFieldChange}
              onSave={() => handleUpdate(event.id)}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(event.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Memoize component - only re-render when caseId changes
export const TimelineView = memo(TimelineViewComponent, (prevProps, nextProps) => {
  return prevProps.caseId === nextProps.caseId;
});
