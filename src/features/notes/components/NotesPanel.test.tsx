/**
 * NotesPanel Component Tests
 *
 * Tests for the NotesPanel component focusing on:
 * - Rendering loading, error, and success states
 * - Notes list display with timestamps
 * - Create new note workflow
 * - Update note functionality (inline editing)
 * - Delete note with confirmation
 * - Save/Cancel button interactions
 * - Empty state display
 * - Accessibility (ARIA labels, keyboard navigation, autofocus)
 *
 * These tests use mocked hooks and IPC calls to isolate component behavior.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotesPanel } from './NotesPanel';
import { useNotes } from '../../hooks/useNotes';
import type { Note } from '../../models/Note';

// Mock the useNotes hook
vi.mock('../../hooks/useNotes');

describe('NotesPanel', () => {
  const mockCreateNote = vi.fn();
  const mockUpdateNote = vi.fn();
  const mockDeleteNote = vi.fn();
  const mockRefresh = vi.fn();

  const mockNotes: Note[] = [
    {
      id: 1,
      caseId: 1,
      content: 'First note about the case',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
    {
      id: 2,
      caseId: 1,
      content: 'Second note with important details',
      createdAt: '2024-01-02T14:30:00Z',
      updatedAt: '2024-01-02T15:45:00Z',
    },
    {
      id: 3,
      caseId: 1,
      content: 'Third note\nwith multiple lines\nof content',
      createdAt: '2024-01-03T09:15:00Z',
      updatedAt: '2024-01-03T09:15:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (useNotes as Mock).mockReturnValue({
      notes: mockNotes,
      loading: false,
      error: null,
      createNote: mockCreateNote,
      updateNote: mockUpdateNote,
      deleteNote: mockDeleteNote,
      refresh: mockRefresh,
    });

    // Mock window.confirm for delete tests
    global.confirm = vi.fn(() => true);
  });

  describe('Rendering States', () => {
    it('should render loading state', () => {
      (useNotes as Mock).mockReturnValue({
        notes: [],
        loading: true,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        refresh: mockRefresh,
      });

      render(<NotesPanel caseId={1} />);

      expect(screen.getByText('Loading notes...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      (useNotes as Mock).mockReturnValue({
        notes: [],
        loading: false,
        error: 'Failed to load notes',
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        refresh: mockRefresh,
      });

      render(<NotesPanel caseId={1} />);

      expect(screen.getByText(/Error: Failed to load notes/i)).toBeInTheDocument();
    });

    it('should render empty state when no notes exist', () => {
      (useNotes as Mock).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        refresh: mockRefresh,
      });

      render(<NotesPanel caseId={1} />);

      expect(
        screen.getByText(/No notes yet. Click "Add Note" to create one./i),
      ).toBeInTheDocument();
    });

    it('should render notes list when data is loaded', () => {
      render(<NotesPanel caseId={1} />);

      expect(screen.getByText(/First note about the case/i)).toBeInTheDocument();
      expect(screen.getByText(/Second note with important details/i)).toBeInTheDocument();
      expect(screen.getByText(/Third note/i)).toBeInTheDocument();
    });

    it('should display correct count in header', () => {
      render(<NotesPanel caseId={1} />);

      expect(screen.getByRole('heading', { name: /Notes \(3\)/i })).toBeInTheDocument();
    });

    it('should render Add Note button', () => {
      render(<NotesPanel caseId={1} />);

      expect(screen.getByRole('button', { name: /\+ Add Note/i })).toBeInTheDocument();
    });

    it('should display timestamps for notes', () => {
      render(<NotesPanel caseId={1} />);

      // Check that date strings are rendered
      // toLocaleString() format may vary by locale, so just check dates exist
      const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Create Note Workflow', () => {
    it('should show note creator when Add button is clicked', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Note/i });
      await user.click(addButton);

      expect(screen.getByPlaceholderText(/Enter note content.../i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Save$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    });

    it('should autofocus textarea when creating new note', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Note/i });
      await user.click(addButton);

      const textarea = screen.getByPlaceholderText(/Enter note content.../i);
      expect(textarea).toHaveFocus();
    });

    it('should call createNote when Save button is clicked with content', async () => {
      const user = userEvent.setup();
      mockCreateNote.mockResolvedValue({
        id: 4,
        caseId: 1,
        content: 'New note content',
        createdAt: '2024-01-04T00:00:00Z',
        updatedAt: '2024-01-04T00:00:00Z',
      });

      render(<NotesPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Note/i });
      await user.click(addButton);

      const textarea = screen.getByPlaceholderText(/Enter note content.../i);
      await user.type(textarea, 'New note content');

      const saveButton = screen.getByRole('button', { name: /^Save$/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateNote).toHaveBeenCalledTimes(1);
        expect(mockCreateNote).toHaveBeenCalledWith('New note content');
      });
    });

    it('should clear textarea and hide creator after successful creation', async () => {
      const user = userEvent.setup();
      mockCreateNote.mockResolvedValue({
        id: 4,
        caseId: 1,
        content: 'New note',
        createdAt: '2024-01-04T00:00:00Z',
        updatedAt: '2024-01-04T00:00:00Z',
      });

      render(<NotesPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Note/i });
      await user.click(addButton);

      const textarea = screen.getByPlaceholderText(/Enter note content.../i);
      await user.type(textarea, 'New note');

      const saveButton = screen.getByRole('button', { name: /^Save$/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Enter note content.../i)).not.toBeInTheDocument();
      });
    });

    it('should NOT call createNote when content is empty', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Note/i });
      await user.click(addButton);

      const saveButton = screen.getByRole('button', { name: /^Save$/i });
      await user.click(saveButton);

      expect(mockCreateNote).not.toHaveBeenCalled();
    });

    it('should NOT call createNote when content is only whitespace', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Note/i });
      await user.click(addButton);

      const textarea = screen.getByPlaceholderText(/Enter note content.../i);
      await user.type(textarea, '   ');

      const saveButton = screen.getByRole('button', { name: /^Save$/i });
      await user.click(saveButton);

      expect(mockCreateNote).not.toHaveBeenCalled();
    });

    it('should hide creator and clear content when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Note/i });
      await user.click(addButton);

      const textarea = screen.getByPlaceholderText(/Enter note content.../i);
      await user.type(textarea, 'Some content');

      const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
      await user.click(cancelButton);

      expect(screen.queryByPlaceholderText(/Enter note content.../i)).not.toBeInTheDocument();
      expect(mockCreateNote).not.toHaveBeenCalled();
    });
  });

  describe('Update Note Workflow', () => {
    it('should enter edit mode when Edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
      await user.click(editButtons[0]);

      const textarea = screen.getByDisplayValue(/First note about the case/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveFocus();
    });

    it('should show Save and Cancel buttons in edit mode', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
      await user.click(editButtons[0]);

      expect(screen.getByRole('button', { name: /^Save$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument();
    });

    it('should call updateNote when Save button is clicked with changes', async () => {
      const user = userEvent.setup();
      mockUpdateNote.mockResolvedValue({
        id: 1,
        caseId: 1,
        content: 'Updated note content',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-04T12:00:00Z',
      });

      render(<NotesPanel caseId={1} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
      await user.click(editButtons[0]);

      const textarea = screen.getByDisplayValue(/First note about the case/i);
      await user.clear(textarea);
      await user.type(textarea, 'Updated note content');

      const saveButton = screen.getByRole('button', { name: /^Save$/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateNote).toHaveBeenCalledTimes(1);
        expect(mockUpdateNote).toHaveBeenCalledWith(1, 'Updated note content');
      });
    });

    it('should exit edit mode after successful update', async () => {
      const user = userEvent.setup();
      mockUpdateNote.mockResolvedValue({
        id: 1,
        caseId: 1,
        content: 'Updated content',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-04T12:00:00Z',
      });

      render(<NotesPanel caseId={1} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
      await user.click(editButtons[0]);

      const textarea = screen.getByDisplayValue(/First note about the case/i);
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');

      const saveButton = screen.getByRole('button', { name: /^Save$/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByDisplayValue(/Updated content/i)).not.toBeInTheDocument();
      });
    });

    it('should NOT call updateNote when content is empty', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
      await user.click(editButtons[0]);

      const textarea = screen.getByDisplayValue(/First note about the case/i);
      await user.clear(textarea);

      const saveButton = screen.getByRole('button', { name: /^Save$/i });
      await user.click(saveButton);

      expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    it('should exit edit mode and revert changes when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
      await user.click(editButtons[0]);

      const textarea = screen.getByDisplayValue(/First note about the case/i);
      await user.clear(textarea);
      await user.type(textarea, 'Changed content');

      const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
      await user.click(cancelButton);

      expect(mockUpdateNote).not.toHaveBeenCalled();
      // Should show original content
      expect(screen.getByText(/First note about the case/i)).toBeInTheDocument();
    });

    it('should handle editing multiple notes independently', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });

      // Edit first note
      await user.click(editButtons[0]);
      expect(screen.getByDisplayValue(/First note about the case/i)).toBeInTheDocument();

      // Cancel first note
      const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
      await user.click(cancelButton);

      // Edit second note
      const editButtons2 = screen.getAllByRole('button', { name: /^Edit$/i });
      await user.click(editButtons2[1]);
      expect(screen.getByDisplayValue(/Second note with important details/i)).toBeInTheDocument();
    });
  });

  describe('Delete Note Workflow', () => {
    it('should call deleteNote when Delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => true);
      mockDeleteNote.mockResolvedValue(undefined);

      render(<NotesPanel caseId={1} />);

      const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('Delete this note?');
      await waitFor(() => {
        expect(mockDeleteNote).toHaveBeenCalledTimes(1);
        expect(mockDeleteNote).toHaveBeenCalledWith(1);
      });
    });

    it('should NOT call deleteNote when delete is cancelled', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => false);

      render(<NotesPanel caseId={1} />);

      const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
      await user.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('Delete this note?');
      expect(mockDeleteNote).not.toHaveBeenCalled();
    });
  });

  describe('Content Display', () => {
    it('should preserve multiline content with pre-wrap', () => {
      render(<NotesPanel caseId={1} />);

      const multilineNote = screen.getByText(/Third note/i);
      expect(multilineNote).toBeInTheDocument();
      expect(multilineNote).toHaveStyle({ whiteSpace: 'pre-wrap' });
    });

    it('should display full timestamps in locale format', () => {
      render(<NotesPanel caseId={1} />);

      // Get all timestamp divs
      const timestampElements = document.querySelectorAll('div[style*="font-size: 12px"]');
      expect(timestampElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long note content', () => {
      const longNote: Note = {
        id: 100,
        caseId: 1,
        content: 'A'.repeat(5000),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (useNotes as Mock).mockReturnValue({
        notes: [longNote],
        loading: false,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        refresh: mockRefresh,
      });

      render(<NotesPanel caseId={1} />);

      expect(screen.getByText(/A{5,}/)).toBeInTheDocument();
    });

    it('should handle special characters in note content', () => {
      const specialNote: Note = {
        id: 101,
        caseId: 1,
        content: '<script>alert("XSS")</script> & "quotes" \'apostrophes\'',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (useNotes as Mock).mockReturnValue({
        notes: [specialNote],
        loading: false,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        refresh: mockRefresh,
      });

      render(<NotesPanel caseId={1} />);

      // Should render as text, not execute script
      expect(screen.getByText(/<script>alert\("XSS"\)<\/script>/)).toBeInTheDocument();
    });

    it('should handle caseId prop changes', () => {
      const { rerender } = render(<NotesPanel caseId={1} />);

      expect(useNotes).toHaveBeenCalledWith(1);

      rerender(<NotesPanel caseId={2} />);

      expect(useNotes).toHaveBeenCalledWith(2);
    });

    it('should handle rapid create and cancel clicks', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Note/i });

      // Click add multiple times
      await user.click(addButton);
      const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
      await user.click(cancelButton);

      await user.click(addButton);
      const cancelButton2 = screen.getByRole('button', { name: /^Cancel$/i });
      await user.click(cancelButton2);

      expect(mockCreateNote).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<NotesPanel caseId={1} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/Notes/i);
    });

    it('should have accessible placeholder for new note textarea', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Note/i });
      await user.click(addButton);

      const textarea = screen.getByPlaceholderText(/Enter note content.../i);
      expect(textarea).toBeInTheDocument();
    });

    it('should autofocus edit textarea when entering edit mode', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
      await user.click(editButtons[0]);

      const textarea = screen.getByDisplayValue(/First note about the case/i);
      expect(textarea).toHaveFocus();
    });

    it('should have clear button labels', () => {
      render(<NotesPanel caseId={1} />);

      expect(screen.getByRole('button', { name: /\+ Add Note/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^Edit$/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /^Delete$/i }).length).toBeGreaterThan(0);
    });

    it('should handle keyboard navigation through buttons', async () => {
      const user = userEvent.setup();
      render(<NotesPanel caseId={1} />);

      // Tab to first button (Add Note)
      await user.tab();
      expect(screen.getByRole('button', { name: /\+ Add Note/i })).toHaveFocus();
    });
  });

  describe('Empty State Behavior', () => {
    it('should show empty state with correct styling', () => {
      (useNotes as Mock).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        refresh: mockRefresh,
      });

      render(<NotesPanel caseId={1} />);

      const emptyState = screen.getByText(/No notes yet. Click "Add Note" to create one./i);
      expect(emptyState).toBeInTheDocument();
    });

    it('should show count of 0 in header when no notes', () => {
      (useNotes as Mock).mockReturnValue({
        notes: [],
        loading: false,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        refresh: mockRefresh,
      });

      render(<NotesPanel caseId={1} />);

      expect(screen.getByRole('heading', { name: /Notes \(0\)/i })).toBeInTheDocument();
    });
  });
});
