import { memo } from 'react';
import type { TimelineEvent } from '@/models/TimelineEvent';

export interface TimelineEventCardProps {
  event: TimelineEvent;
  isEditing: boolean;
  editEvent: {
    title: string;
    eventDate: string;
    description: string;
  };
  onEditClick: () => void;
  onFieldChange: (field: 'title' | 'eventDate' | 'description', value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const TimelineEventCardComponent = ({
  event,
  isEditing,
  editEvent,
  onEditClick,
  onFieldChange,
  onSave,
  onCancel,
  onDelete,
}: TimelineEventCardProps): JSX.Element => {
  return (
    <div className="relative mb-8">
      {/* Timeline Dot */}
      <div className="absolute -left-8 top-2 w-4 h-4 rounded-full bg-pink-700 border-[3px] border-white shadow-[0_0_0_3px_#c2185b]" />

      {/* Event Card */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        {isEditing ? (
          <div>
            <div className="mb-3">
              <input
                type="text"
                value={editEvent.title}
                onChange={(e) => onFieldChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="mb-3">
              <input
                type="date"
                value={editEvent.eventDate}
                onChange={(e) => onFieldChange('eventDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="mb-3">
              <textarea
                value={editEvent.description || ''}
                onChange={(e) => onFieldChange('description', e.target.value)}
                className="w-full min-h-[80px] px-3 py-3 border border-gray-300 rounded text-sm font-[inherit] resize-y"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onSave}
                className="px-3 py-1.5 bg-green-700 text-white border-0 rounded text-xs font-bold cursor-pointer transition-colors hover:bg-green-800"
              >
                Save
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1.5 bg-gray-600 text-white border-0 rounded text-xs font-bold cursor-pointer transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-gray-800 text-base mb-1">
                  {event.title}
                </div>
                <div className="text-[13px] text-pink-700 font-bold">
                  {new Date(event.eventDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onEditClick}
                  className="px-3 py-1.5 bg-blue-600 text-white border-0 rounded text-xs font-bold cursor-pointer transition-colors hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 bg-red-700 text-white border-0 rounded text-xs font-bold cursor-pointer transition-colors hover:bg-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
            {event.description && (
              <div className="whitespace-pre-wrap break-words text-gray-600 text-sm leading-relaxed mt-2">
                {event.description}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize with custom comparison - only re-render if THIS event changed or isEditing changed
export const TimelineEventCard = memo(
  TimelineEventCardComponent,
  (prevProps, nextProps) => {
    // Return true if props are equal (should NOT re-render)
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.event.title === nextProps.event.title &&
      prevProps.event.eventDate === nextProps.event.eventDate &&
      prevProps.event.description === nextProps.event.description &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.editEvent.title === nextProps.editEvent.title &&
      prevProps.editEvent.eventDate === nextProps.editEvent.eventDate &&
      prevProps.editEvent.description === nextProps.editEvent.description
    );
  }
);
