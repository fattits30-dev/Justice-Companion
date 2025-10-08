import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTimeline } from './useTimeline';
import type {
  TimelineEvent,
  CreateTimelineEventInput,
  UpdateTimelineEventInput,
} from '../models/TimelineEvent';

/**
 * Test Suite for useTimeline Hook
 *
 * Tests cover:
 * - Initial state and data loading
 * - CRUD operations (create, update, delete)
 * - Error handling and edge cases
 * - Loading states
 * - CaseId changes (re-fetch data)
 * - Refresh functionality
 * - Date handling
 * - Optional description field
 */

// Mock window.electron.timeline API
const mockTimelineAPI = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Setup global window.electron mock
beforeEach(() => {
  (global as any).window = {
    electron: {
      timeline: mockTimelineAPI,
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

// Test data
const mockEvent1: TimelineEvent = {
  id: 1,
  caseId: 100,
  eventDate: '2025-01-15',
  title: 'Initial Meeting',
  description: 'First meeting with client',
  createdAt: '2025-10-05T10:00:00Z',
};

const mockEvent2: TimelineEvent = {
  id: 2,
  caseId: 100,
  eventDate: '2025-02-20',
  title: 'Evidence Submission',
  description: null,
  createdAt: '2025-10-05T11:00:00Z',
};

describe('useTimeline', () => {
  describe('Initial State and Data Loading', () => {
    it('should initialize with empty array and loading state', () => {
      mockTimelineAPI.list.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useTimeline(100));

      expect(result.current.timelineEvents).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should load timeline events on mount', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1, mockEvent2],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.timelineEvents).toEqual([mockEvent1, mockEvent2]);
      expect(result.current.error).toBe(null);
      expect(mockTimelineAPI.list).toHaveBeenCalledWith(100);
    });

    it('should handle empty timeline events list', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.timelineEvents).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should handle missing data property in response', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: null,
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.timelineEvents).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should handle timeline events with null description', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent2],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.timelineEvents[0].description).toBe(null);
    });
  });

  describe('CaseId Changes', () => {
    it('should reload timeline events when caseId changes', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      const { result, rerender } = renderHook(({ caseId }) => useTimeline(caseId), {
        initialProps: { caseId: 100 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockTimelineAPI.list).toHaveBeenCalledWith(100);
      expect(result.current.timelineEvents).toEqual([mockEvent1]);

      // Change caseId
      const mockEvent3: TimelineEvent = {
        id: 3,
        caseId: 200,
        eventDate: '2025-03-10',
        title: 'Court Hearing',
        description: 'First court appearance',
        createdAt: '2025-10-05T12:00:00Z',
      };

      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent3],
      });

      rerender({ caseId: 200 });

      await waitFor(() => {
        expect(mockTimelineAPI.list).toHaveBeenCalledWith(200);
      });

      await waitFor(() => {
        expect(result.current.timelineEvents).toEqual([mockEvent3]);
      });
    });
  });

  describe('Create Operation', () => {
    it('should create a new timeline event with all fields', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const input: CreateTimelineEventInput = {
        caseId: 100,
        eventDate: '2025-04-01',
        title: 'New Event',
        description: 'Event description',
      };

      const newEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        eventDate: '2025-04-01',
        title: 'New Event',
        description: 'Event description',
        createdAt: '2025-10-05T13:00:00Z',
      };

      mockTimelineAPI.create.mockResolvedValue({
        success: true,
        data: newEvent,
      });

      const created = await result.current.createTimelineEvent(input);

      expect(created).toEqual(newEvent);
      expect(result.current.timelineEvents).toEqual([newEvent]);
      expect(mockTimelineAPI.create).toHaveBeenCalledWith(input);
    });

    it('should create a new timeline event without description', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const input: CreateTimelineEventInput = {
        caseId: 100,
        eventDate: '2025-04-01',
        title: 'Minimal Event',
      };

      const newEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        eventDate: '2025-04-01',
        title: 'Minimal Event',
        description: null,
        createdAt: '2025-10-05T13:00:00Z',
      };

      mockTimelineAPI.create.mockResolvedValue({
        success: true,
        data: newEvent,
      });

      const created = await result.current.createTimelineEvent(input);

      expect(created).toEqual(newEvent);
      expect(created.description).toBe(null);
    });

    it('should handle various date formats', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const input: CreateTimelineEventInput = {
        caseId: 100,
        eventDate: '2025-12-31T23:59:59Z',
        title: 'Year End Event',
      };

      const newEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        eventDate: '2025-12-31T23:59:59Z',
        title: 'Year End Event',
        description: null,
        createdAt: '2025-10-05T13:00:00Z',
      };

      mockTimelineAPI.create.mockResolvedValue({
        success: true,
        data: newEvent,
      });

      const created = await result.current.createTimelineEvent(input);

      expect(created.eventDate).toBe('2025-12-31T23:59:59Z');
    });

    it('should handle create failure with error message', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockTimelineAPI.create.mockResolvedValue({
        success: false,
        error: 'Failed to create timeline event',
      });

      const input: CreateTimelineEventInput = {
        caseId: 100,
        eventDate: '2025-04-01',
        title: 'Test Event',
      };

      await expect(result.current.createTimelineEvent(input)).rejects.toThrow(
        'Failed to create timeline event',
      );

      expect(result.current.error).toBe('Failed to create timeline event');
      expect(result.current.timelineEvents).toEqual([]);
    });

    it('should handle create exception', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockTimelineAPI.create.mockRejectedValue(new Error('Network error'));

      const input: CreateTimelineEventInput = {
        caseId: 100,
        eventDate: '2025-04-01',
        title: 'Test Event',
      };

      await expect(result.current.createTimelineEvent(input)).rejects.toThrow('Network error');

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Update Operation', () => {
    it('should update an existing timeline event with all fields', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1, mockEvent2],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateInput: UpdateTimelineEventInput = {
        eventDate: '2025-01-20',
        title: 'Updated Meeting',
        description: 'Updated description',
      };

      const updatedEvent: TimelineEvent = {
        ...mockEvent1,
        eventDate: '2025-01-20',
        title: 'Updated Meeting',
        description: 'Updated description',
      };

      mockTimelineAPI.update.mockResolvedValue({
        success: true,
        data: updatedEvent,
      });

      const returned = await result.current.updateTimelineEvent(1, updateInput);

      expect(returned).toEqual(updatedEvent);
      expect(result.current.timelineEvents).toEqual([updatedEvent, mockEvent2]);
      expect(mockTimelineAPI.update).toHaveBeenCalledWith(1, updateInput);
    });

    it('should update with partial fields', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateInput: UpdateTimelineEventInput = {
        title: 'Only title updated',
      };

      const updatedEvent: TimelineEvent = {
        ...mockEvent1,
        title: 'Only title updated',
      };

      mockTimelineAPI.update.mockResolvedValue({
        success: true,
        data: updatedEvent,
      });

      await result.current.updateTimelineEvent(1, updateInput);

      expect(result.current.timelineEvents[0].title).toBe('Only title updated');
      expect(result.current.timelineEvents[0].eventDate).toBe(mockEvent1.eventDate); // Unchanged
      expect(result.current.timelineEvents[0].description).toBe(mockEvent1.description); // Unchanged
    });

    it('should update only the event date', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateInput: UpdateTimelineEventInput = {
        eventDate: '2025-01-16',
      };

      const updatedEvent: TimelineEvent = {
        ...mockEvent1,
        eventDate: '2025-01-16',
      };

      mockTimelineAPI.update.mockResolvedValue({
        success: true,
        data: updatedEvent,
      });

      await result.current.updateTimelineEvent(1, updateInput);

      expect(result.current.timelineEvents[0].eventDate).toBe('2025-01-16');
    });

    it('should handle update failure with error message', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockTimelineAPI.update.mockResolvedValue({
        success: false,
        error: 'Failed to update timeline event',
      });

      const updateInput: UpdateTimelineEventInput = {
        title: 'Updated Title',
      };

      await expect(result.current.updateTimelineEvent(1, updateInput)).rejects.toThrow(
        'Failed to update timeline event',
      );

      expect(result.current.error).toBe('Failed to update timeline event');
      expect(result.current.timelineEvents).toEqual([mockEvent1]); // Unchanged
    });

    it('should handle update exception', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockTimelineAPI.update.mockRejectedValue(new Error('Database error'));

      const updateInput: UpdateTimelineEventInput = {
        title: 'Updated Title',
      };

      await expect(result.current.updateTimelineEvent(1, updateInput)).rejects.toThrow(
        'Database error',
      );

      expect(result.current.error).toBe('Database error');
    });
  });

  describe('Delete Operation', () => {
    it('should delete a timeline event successfully', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1, mockEvent2],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockTimelineAPI.delete.mockResolvedValue({
        success: true,
      });

      await result.current.deleteTimelineEvent(1);

      expect(result.current.timelineEvents).toEqual([mockEvent2]);
      expect(mockTimelineAPI.delete).toHaveBeenCalledWith(1);
    });

    it('should handle delete failure with error message', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockTimelineAPI.delete.mockResolvedValue({
        success: false,
        error: 'Failed to delete timeline event',
      });

      await expect(result.current.deleteTimelineEvent(1)).rejects.toThrow(
        'Failed to delete timeline event',
      );

      expect(result.current.error).toBe('Failed to delete timeline event');
      expect(result.current.timelineEvents).toEqual([mockEvent1]); // Unchanged
    });

    it('should handle delete exception', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockTimelineAPI.delete.mockRejectedValue(new Error('Permission denied'));

      await expect(result.current.deleteTimelineEvent(1)).rejects.toThrow('Permission denied');

      expect(result.current.error).toBe('Permission denied');
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh timeline events list', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.timelineEvents).toEqual([mockEvent1]);

      // Update mock to return different data
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1, mockEvent2],
      });

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.timelineEvents).toEqual([mockEvent1, mockEvent2]);
      });

      expect(mockTimelineAPI.list).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during refresh', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockTimelineAPI.list.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ success: true, data: [mockEvent1, mockEvent2] });
            }, 10);
          }),
      );

      const refreshPromise = result.current.refresh();

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await refreshPromise;

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle list failure with error message', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: false,
        error: 'Failed to load timeline events',
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load timeline events');
      expect(result.current.timelineEvents).toEqual([]);
    });

    it('should handle list failure without error message', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: false,
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load timeline events');
    });

    it('should handle list exception', async () => {
      mockTimelineAPI.list.mockRejectedValue(new Error('Connection timeout'));

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Connection timeout');
      expect(result.current.timelineEvents).toEqual([]);
    });

    it('should handle non-Error exception', async () => {
      mockTimelineAPI.list.mockRejectedValue('String error');

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Unknown error');
    });

    it('should clear previous error on successful operation', async () => {
      mockTimelineAPI.list.mockResolvedValue({
        success: false,
        error: 'Initial error',
      });

      const { result } = renderHook(() => useTimeline(100));

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      mockTimelineAPI.list.mockResolvedValue({
        success: true,
        data: [mockEvent1],
      });

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      expect(result.current.timelineEvents).toEqual([mockEvent1]);
    });
  });
});
