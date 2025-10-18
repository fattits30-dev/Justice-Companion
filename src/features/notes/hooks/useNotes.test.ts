import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotes } from './useNotes';
import type { Note } from '../../../models/Note';

/**
 * Test Suite for useNotes Hook
 *
 * Tests cover:
 * - Initial state and data loading
 * - CRUD operations (create, update, delete)
 * - Error handling and edge cases
 * - Loading states
 * - CaseId changes (re-fetch data)
 * - Refresh functionality
 */

// Mock window.electron.notes API
const mockNotesAPI = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Setup global window.electron mock
beforeEach(() => {
  // Properly mock window.electron in jsdom environment
  if (!window.electron) {
    (window as any).electron = {};
  }
  (window as any).electron.notes = mockNotesAPI;
});

afterEach(() => {
  vi.clearAllMocks();
  // Clean up window.electron
  if ((window as any).electron) {
    delete (window as any).electron.notes;
  }
});

// Test data
const mockNote1: Note = {
  id: 1,
  caseId: 100,
  content: 'First note content',
  createdAt: '2025-10-05T10:00:00Z',
  updatedAt: '2025-10-05T10:00:00Z',
};

const mockNote2: Note = {
  id: 2,
  caseId: 100,
  content: 'Second note content',
  createdAt: '2025-10-05T11:00:00Z',
  updatedAt: '2025-10-05T11:00:00Z',
};

describe('useNotes', () => {
  describe('Initial State and Data Loading', () => {
    it('should initialize with empty notes array and loading state', async () => {
      let resolvePromise: any;
      mockNotesAPI.list.mockReturnValue(new Promise((resolve) => {
        resolvePromise = resolve;
      }));

      const { result, unmount } = renderHook(() => useNotes(100));

      // Check initial loading state immediately
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });
      expect(result.current.notes).toEqual([]);
      expect(result.current.error).toBe(null);

      // Clean up by resolving the promise
      act(() => {
        resolvePromise({ success: true, data: [] });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      unmount();
    });

    it('should load notes on mount', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1, mockNote2],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notes).toEqual([mockNote1, mockNote2]);
      expect(result.current.error).toBe(null);
      expect(mockNotesAPI.list).toHaveBeenCalledWith(100);

      unmount();
    });

    it('should handle empty notes list', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notes).toEqual([]);
      expect(result.current.error).toBe(null);

      unmount();
    });

    it('should handle missing data property in response', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: null,
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notes).toEqual([]);
      expect(result.current.error).toBe(null);

      unmount();
    });
  });

  describe('CaseId Changes', () => {
    it('should reload notes when caseId changes', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1],
      });

      const { result, rerender, unmount } = renderHook(({ caseId }) => useNotes(caseId), {
        initialProps: { caseId: 100 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockNotesAPI.list).toHaveBeenCalledWith(100);
      expect(result.current.notes).toEqual([mockNote1]);

      // Change caseId
      const mockNote3: Note = {
        id: 3,
        caseId: 200,
        content: 'Note for different case',
        createdAt: '2025-10-05T12:00:00Z',
        updatedAt: '2025-10-05T12:00:00Z',
      };

      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote3],
      });

      rerender({ caseId: 200 });

      await waitFor(() => {
        expect(mockNotesAPI.list).toHaveBeenCalledWith(200);
      });

      await waitFor(() => {
        expect(result.current.notes).toEqual([mockNote3]);
      });

      unmount();
    });
  });

  describe('Create Operation', () => {
    it('should create a new note successfully', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newNote: Note = {
        id: 1,
        caseId: 100,
        content: 'New note content',
        createdAt: '2025-10-05T13:00:00Z',
        updatedAt: '2025-10-05T13:00:00Z',
      };

      mockNotesAPI.create.mockResolvedValue({
        success: true,
        data: newNote,
      });

      let createdNote: Note | undefined;
      await act(async () => {
        createdNote = await result.current.createNote('New note content');
      });

      expect(createdNote).toEqual(newNote);
      expect(result.current.notes).toEqual([newNote]);
      expect(mockNotesAPI.create).toHaveBeenCalledWith(100, 'New note content');

      unmount();
    });

    it('should handle create failure with error message', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockNotesAPI.create.mockResolvedValue({
        success: false,
        error: 'Failed to create note',
      });

      // Call the function and let it throw
      const createPromise = act(async () => {
        return result.current.createNote('Test content');
      });

      // Verify it rejects with the correct error
      await expect(createPromise).rejects.toThrow('Failed to create note');

      // The state is unchanged (no new note was added)
      expect(result.current.notes).toEqual([]);

      unmount();
    });

    it('should handle create failure without error message', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockNotesAPI.create.mockResolvedValue({
        success: false,
      });

      await expect(async () => {
        await act(async () => {
          await result.current.createNote('Test content');
        });
      }).rejects.toThrow('Failed to create note');

      unmount();
    });

    it('should handle create exception', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockNotesAPI.create.mockRejectedValue(new Error('Network error'));

      // Call the function and let it throw
      const createPromise = act(async () => {
        return result.current.createNote('Test content');
      });

      // Verify it rejects with the correct error
      await expect(createPromise).rejects.toThrow('Network error');

      unmount();
    });
  });

  describe('Update Operation', () => {
    it('should update an existing note successfully', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1, mockNote2],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedNote: Note = {
        ...mockNote1,
        content: 'Updated content',
        updatedAt: '2025-10-05T14:00:00Z',
      };

      mockNotesAPI.update.mockResolvedValue({
        success: true,
        data: updatedNote,
      });

      let returnedNote: Note | undefined;
      await act(async () => {
        returnedNote = await result.current.updateNote(1, 'Updated content');
      });

      expect(returnedNote).toEqual(updatedNote);
      expect(result.current.notes).toEqual([updatedNote, mockNote2]);
      expect(mockNotesAPI.update).toHaveBeenCalledWith(1, 'Updated content');

      unmount();
    });

    it('should handle update failure with error message', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockNotesAPI.update.mockResolvedValue({
        success: false,
        error: 'Failed to update note',
      });

      // Call the function and let it throw
      const updatePromise = act(async () => {
        return result.current.updateNote(1, 'Updated content');
      });

      // Verify it rejects with the correct error
      await expect(updatePromise).rejects.toThrow('Failed to update note');

      // The state is unchanged (note was not updated)
      expect(result.current.notes).toEqual([mockNote1]);

      unmount();
    });

    it('should handle update exception', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockNotesAPI.update.mockRejectedValue(new Error('Database error'));

      // Call the function and let it throw
      const updatePromise = act(async () => {
        return result.current.updateNote(1, 'Updated content');
      });

      // Verify it rejects with the correct error
      await expect(updatePromise).rejects.toThrow('Database error');

      unmount();
    });
  });

  describe('Delete Operation', () => {
    it('should delete a note successfully', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1, mockNote2],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockNotesAPI.delete.mockResolvedValue({
        success: true,
      });

      await act(async () => {
        await result.current.deleteNote(1);
      });

      expect(result.current.notes).toEqual([mockNote2]);
      expect(mockNotesAPI.delete).toHaveBeenCalledWith(1);

      unmount();
    });

    it('should handle delete failure with error message', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockNotesAPI.delete.mockResolvedValue({
        success: false,
        error: 'Failed to delete note',
      });

      // Call the function and let it throw
      const deletePromise = act(async () => {
        return result.current.deleteNote(1);
      });

      // Verify it rejects with the correct error
      await expect(deletePromise).rejects.toThrow('Failed to delete note');

      // The state is unchanged (note was not deleted)
      expect(result.current.notes).toEqual([mockNote1]);

      unmount();
    });

    it('should handle delete exception', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockNotesAPI.delete.mockRejectedValue(new Error('Permission denied'));

      // Call the function and let it throw
      const deletePromise = act(async () => {
        return result.current.deleteNote(1);
      });

      // Verify it rejects with the correct error
      await expect(deletePromise).rejects.toThrow('Permission denied');

      unmount();
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh notes list', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notes).toEqual([mockNote1]);

      // Update mock to return different data
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1, mockNote2],
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.notes).toEqual([mockNote1, mockNote2]);
      });

      expect(mockNotesAPI.list).toHaveBeenCalledTimes(2);

      unmount();
    });

    it('should set loading state during refresh', async () => {
      let resolveRefresh: any;
      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1],
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock a slow-loading refresh
      mockNotesAPI.list.mockReturnValue(
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
      );

      act(() => {
        void result.current.refresh();
      });

      // Check that loading becomes true
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Resolve the promise
      act(() => {
        resolveRefresh({ success: true, data: [mockNote1, mockNote2] });
      });

      // Wait for loading to become false
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      unmount();
    });
  });

  describe('Error Handling', () => {
    it('should handle list failure with error message', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: false,
        error: 'Failed to load notes',
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load notes');
      expect(result.current.notes).toEqual([]);

      unmount();
    });

    it('should handle list failure without error message', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: false,
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load notes');

      unmount();
    });

    it('should handle list exception', async () => {
      mockNotesAPI.list.mockRejectedValue(new Error('Connection timeout'));

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Connection timeout');
      expect(result.current.notes).toEqual([]);

      unmount();
    });

    it('should handle non-Error exception', async () => {
      mockNotesAPI.list.mockRejectedValue('String error');

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Unknown error');

      unmount();
    });

    it('should clear previous error on successful operation', async () => {
      mockNotesAPI.list.mockResolvedValue({
        success: false,
        error: 'Initial error',
      });

      const { result, unmount } = renderHook(() => useNotes(100));

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      mockNotesAPI.list.mockResolvedValue({
        success: true,
        data: [mockNote1],
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      expect(result.current.notes).toEqual([mockNote1]);

      unmount();
    });
  });
});
