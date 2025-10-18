import type { Note } from '@/models/Note';
import { useState, memo, useCallback } from 'react';
import { useNotes } from '../hooks/useNotes';

export interface NotesPanelProps {
  caseId: number;
}

/**
 * Notes panel with CRUD operations
 *
 * @performance Memoized to prevent unnecessary re-renders when props haven't changed
 */
const NotesPanelComponent = ({ caseId }: NotesPanelProps) => {
  const { notes, loading, error, createNote, updateNote, deleteNote } = useNotes(caseId);

  const [isCreating, setIsCreating] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  // Memoize event handlers to prevent child re-renders
  const handleCreate = useCallback(async () => {
    if (newNoteContent.trim()) {
      await createNote(newNoteContent);
      setNewNoteContent('');
      setIsCreating(false);
    }
  }, [newNoteContent, createNote]);

  const handleUpdate = useCallback(async (id: number) => {
    if (editContent.trim()) {
      await updateNote(id, editContent);
      setEditingId(null);
      setEditContent('');
    }
  }, [editContent, updateNote]);

  const handleStartCreating = useCallback(() => {
    setIsCreating(true);
  }, []);

  const handleCancelCreating = useCallback(() => {
    setIsCreating(false);
    setNewNoteContent('');
  }, []);

  const handleNewNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewNoteContent(e.target.value);
  }, []);

  const handleEditContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditContent('');
  }, []);

  const handleStartEdit = useCallback((id: number, content: string) => {
    setEditingId(id);
    setEditContent(content);
  }, []);

  const handleDelete = useCallback((id: number) => {
    if (window.confirm('Delete this note?')) {
      void deleteNote(id);
    }
  }, [deleteNote]);

  if (loading) {
    return <div className="p-6 text-center text-blue-300">Loading notes...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-300 bg-red-900/30 rounded-lg">Error: {error}</div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Notes ({notes.length})</h2>

        <button
          onClick={handleStartCreating}
          className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-bold transition-all duration-200"
        >
          + Add Note
        </button>
      </div>

      {/* New Note Creator */}
      {isCreating && (
        <div className="mb-4 p-4 bg-yellow-900/20 border-2 border-yellow-600/50 rounded-lg">
          <textarea
            value={newNoteContent}
            onChange={handleNewNoteChange}
            placeholder="Enter note content..."
            className="w-full min-h-[100px] p-3 border border-blue-700/30 bg-slate-800/50 rounded-lg text-sm text-white placeholder-blue-400/50 focus:outline-none focus:ring-3 focus:ring-yellow-500 resize-y"
            autoFocus
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-all duration-200"
            >
              Save
            </button>
            <button
              onClick={handleCancelCreating}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="p-12 text-center text-blue-400 bg-slate-800/30 rounded-lg">
          No notes yet. Click "Add Note" to create one.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note: Note) => (
            <div
              key={note.id}
              className="p-4 bg-slate-900/50 border border-blue-800/30 rounded-lg shadow-lg"
            >
              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={handleEditContentChange}
                    className="w-full min-h-[100px] p-3 border border-blue-700/30 bg-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:ring-3 focus:ring-blue-500 resize-y"
                    autoFocus
                  />
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleUpdate(note.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-all duration-200"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="whitespace-pre-wrap break-words text-blue-100 text-sm leading-relaxed mb-3">
                    {note.content}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-blue-400/70">
                      {new Date(note.updatedAt).toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(note.id, note.content)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all duration-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const NotesPanel = memo(NotesPanelComponent);
