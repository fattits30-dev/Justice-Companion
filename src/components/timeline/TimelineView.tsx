import { useState } from 'react';
import { useTimeline } from '../../hooks/useTimeline';
import type { TimelineEvent } from '../../models/TimelineEvent';

export interface TimelineViewProps {
  caseId: number;
}

export function TimelineView({ caseId }: TimelineViewProps) {
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

  const handleCreate = async () => {
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
  };

  const handleUpdate = async (id: number) => {
    if (editEvent.title.trim() && editEvent.eventDate) {
      await updateTimelineEvent(id, {
        title: editEvent.title,
        eventDate: editEvent.eventDate,
        description: editEvent.description,
      });
      setEditingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
        Loading timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: '#d32f2f',
          background: '#ffebee',
          borderRadius: '4px',
        }}
      >
        Error: {error}
      </div>
    );
  }

  // Sort events by date (most recent first)
  const sortedEvents = [...timelineEvents].sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>
          Timeline ({timelineEvents.length} events)
        </h2>

        <button
          onClick={() => setIsCreating(true)}
          style={{
            padding: '10px 20px',
            background: '#c2185b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ad1457';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#c2185b';
          }}
        >
          + Add Event
        </button>
      </div>

      {/* New Event Creator */}
      {isCreating && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            background: '#fce4ec',
            border: '2px solid #c2185b',
            borderRadius: '8px',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#333',
              }}
            >
              Event Title:
            </label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent({ ...newEvent, title: e.target.value })
              }
              placeholder="Enter event title..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#333',
              }}
            >
              Event Date:
            </label>
            <input
              type="date"
              value={newEvent.eventDate}
              onChange={(e) =>
                setNewEvent({ ...newEvent, eventDate: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#333',
              }}
            >
              Description (optional):
            </label>
            <textarea
              value={newEvent.description}
              onChange={(e) =>
                setNewEvent({ ...newEvent, description: e.target.value })
              }
              placeholder="Enter event description..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCreate}
              style={{
                padding: '8px 16px',
                background: '#388e3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewEvent({ title: '', eventDate: '', description: '' });
              }}
              style={{
                padding: '8px 16px',
                background: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vertical Timeline */}
      {sortedEvents.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: '#999',
            background: '#f5f5f5',
            borderRadius: '8px',
          }}
        >
          No timeline events yet. Click "Add Event" to create one.
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '40px' }}>
          {/* Vertical Line */}
          <div
            style={{
              position: 'absolute',
              left: '15px',
              top: '0',
              bottom: '0',
              width: '3px',
              background: 'linear-gradient(180deg, #c2185b 0%, #e91e63 100%)',
            }}
          />

          {/* Timeline Events */}
          {sortedEvents.map((event: TimelineEvent) => {
            const isEditing = editingId === event.id;

            return (
              <div
                key={event.id}
                style={{
                  position: 'relative',
                  marginBottom: '32px',
                }}
              >
                {/* Timeline Dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-33px',
                    top: '8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#c2185b',
                    border: '3px solid white',
                    boxShadow: '0 0 0 3px #c2185b',
                  }}
                />

                {/* Event Card */}
                <div
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {isEditing ? (
                    <div>
                      <div style={{ marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={editEvent.title}
                          onChange={(e) =>
                            setEditEvent({ ...editEvent, title: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px',
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <input
                          type="date"
                          value={editEvent.eventDate}
                          onChange={(e) =>
                            setEditEvent({
                              ...editEvent,
                              eventDate: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px',
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <textarea
                          value={editEvent.description || ''}
                          onChange={(e) =>
                            setEditEvent({
                              ...editEvent,
                              description: e.target.value,
                            })
                          }
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '12px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleUpdate(event.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#388e3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            padding: '6px 12px',
                            background: '#757575',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 'bold',
                              color: '#333',
                              fontSize: '16px',
                              marginBottom: '4px',
                            }}
                          >
                            {event.title}
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#c2185b',
                              fontWeight: 'bold',
                            }}
                          >
                            {new Date(event.eventDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingId(event.id);
                              setEditEvent({
                                title: event.title,
                                eventDate: event.eventDate,
                                description: event.description || '',
                              });
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#1976d2',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this event?')) {
                                deleteTimelineEvent(event.id);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#d32f2f',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {event.description && (
                        <div
                          style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: '#555',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            marginTop: '8px',
                          }}
                        >
                          {event.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
