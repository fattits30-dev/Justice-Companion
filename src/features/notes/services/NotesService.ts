import { notesRepository } from '@/repositories/NotesRepository';
import type { Note } from '@/models/Note';
import { errorLogger } from '@/utils/error-logger';

export class NotesService {
  /**
   * Create a new note for a case
   */
  createNote(caseId: number, content: string): Note {
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new Error('Note content is required');
      }

      if (content.length > 10000) {
        throw new Error('Note content must be 10000 characters or less');
      }

      return notesRepository.create({ caseId, content });
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'createNote',
        caseId,
      });
      throw error;
    }
  }

  /**
   * Get all notes for a case
   */
  getNotesByCaseId(caseId: number): Note[] {
    try {
      return notesRepository.findByCaseId(caseId);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getNotesByCaseId', caseId });
      throw error;
    }
  }

  /**
   * Update a note's content
   */
  updateNote(id: number, content: string): Note {
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new Error('Note content is required');
      }

      if (content.length > 10000) {
        throw new Error('Note content must be 10000 characters or less');
      }

      const note = notesRepository.update(id, { content });

      if (!note) {
        throw new Error('Note not found');
      }

      return note;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'updateNote',
        id,
      });
      throw error;
    }
  }

  /**
   * Delete a note
   */
  deleteNote(id: number): void {
    try {
      notesRepository.delete(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'deleteNote',
        id,
      });
      throw error;
    }
  }
}

export const notesService = new NotesService();
