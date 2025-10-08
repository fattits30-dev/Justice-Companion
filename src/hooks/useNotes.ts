import { useState, useEffect } from 'react';
import type { Note } from '../models/Note';

export function useNotes(caseId: number) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electron.notes.list(caseId);
      if (result.success) {
        setNotes(result.data || []);
      } else {
        setError(result.error || 'Failed to load notes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (content: string) => {
    try {
      const result = await window.electron.notes.create(caseId, content);
      if (result.success && result.data) {
        setNotes((prev) => [...prev, result.data!]);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to create note');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateNote = async (id: number, content: string) => {
    try {
      const result = await window.electron.notes.update(id, content);
      if (result.success && result.data) {
        setNotes((prev) => prev.map((n) => (n.id === id ? result.data! : n)));
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to update note');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteNote = async (id: number) => {
    try {
      const result = await window.electron.notes.delete(id);
      if (result.success) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } else {
        throw new Error(result.error || 'Failed to delete note');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  useEffect(() => {
    void loadNotes();
  }, [caseId]);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refresh: loadNotes,
  };
}
