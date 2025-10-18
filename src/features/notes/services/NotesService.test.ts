import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotesService } from './NotesService';
import { errorLogger } from '../../../utils/error-logger';
import type { Note } from '../../../models/Note';

// Mock centralized repository initialization
const mockNotesRepository = {
  create: vi.fn(),
  findByCaseId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../../repositories', () => ({
  getRepositories: vi.fn(() => ({
    notesRepository: mockNotesRepository,
  })),
  resetRepositories: vi.fn(),
}));

vi.mock('../../../utils/error-logger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('NotesService', () => {
  let notesService: NotesService;

  beforeEach(() => {
    notesService = new NotesService();
    vi.clearAllMocks();
  });

  describe('createNote', () => {
    it('should create a note with valid input', () => {
      const mockNote: Note = {
        id: 1,
        caseId: 100,
        content: 'Test note content',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockNotesRepository.create).mockReturnValue(mockNote);

      const result = notesService.createNote(100, 'Test note content');

      expect(result).toEqual(mockNote);
      expect(mockNotesRepository.create).toHaveBeenCalledWith({
        caseId: 100,
        content: 'Test note content',
      });
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should throw error if content is empty', () => {
      expect(() => notesService.createNote(100, '')).toThrow('Note content is required');
      expect(() => notesService.createNote(100, '   ')).toThrow('Note content is required');
      expect(mockNotesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if content exceeds 10000 characters', () => {
      const longContent = 'a'.repeat(10001);

      expect(() => notesService.createNote(100, longContent)).toThrow(
        'Note content must be 10000 characters or less'
      );
      expect(mockNotesRepository.create).not.toHaveBeenCalled();
    });

    it('should accept content exactly 10000 characters', () => {
      const maxContent = 'a'.repeat(10000);
      const mockNote: Note = {
        id: 1,
        caseId: 100,
        content: maxContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockNotesRepository.create).mockReturnValue(mockNote);

      const result = notesService.createNote(100, maxContent);

      expect(result).toEqual(mockNote);
      expect(mockNotesRepository.create).toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockNotesRepository.create).mockImplementation(() => {
        throw error;
      });

      expect(() => notesService.createNote(100, 'Test content')).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'createNote', caseId: 100 })
      );
    });
  });

  describe('getNotesByCaseId', () => {
    it('should return all notes for a case', () => {
      const mockNotes: Note[] = [
        {
          id: 1,
          caseId: 100,
          content: 'Note 1',
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        },
        {
          id: 2,
          caseId: 100,
          content: 'Note 2',
          createdAt: '2025-10-06T00:01:00.000Z',
          updatedAt: '2025-10-06T00:01:00.000Z',
        },
      ];

      vi.mocked(mockNotesRepository.findByCaseId).mockReturnValue(mockNotes);

      const result = notesService.getNotesByCaseId(100);

      expect(result).toEqual(mockNotes);
      expect(mockNotesRepository.findByCaseId).toHaveBeenCalledWith(100);
    });

    it('should return empty array if no notes exist', () => {
      vi.mocked(mockNotesRepository.findByCaseId).mockReturnValue([]);

      const result = notesService.getNotesByCaseId(999);

      expect(result).toEqual([]);
      expect(mockNotesRepository.findByCaseId).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockNotesRepository.findByCaseId).mockImplementation(() => {
        throw error;
      });

      expect(() => notesService.getNotesByCaseId(100)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getNotesByCaseId', caseId: 100 })
      );
    });
  });

  describe('updateNote', () => {
    it('should update a note with valid input', () => {
      const mockNote: Note = {
        id: 1,
        caseId: 100,
        content: 'Updated content',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(mockNotesRepository.update).mockReturnValue(mockNote);

      const result = notesService.updateNote(1, 'Updated content');

      expect(result).toEqual(mockNote);
      expect(mockNotesRepository.update).toHaveBeenCalledWith(1, { content: 'Updated content' });
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should throw error if content is empty', () => {
      expect(() => notesService.updateNote(1, '')).toThrow('Note content is required');
      expect(() => notesService.updateNote(1, '   ')).toThrow('Note content is required');
      expect(mockNotesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if content exceeds 10000 characters', () => {
      const longContent = 'a'.repeat(10001);

      expect(() => notesService.updateNote(1, longContent)).toThrow(
        'Note content must be 10000 characters or less'
      );
      expect(mockNotesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if note not found', () => {
      vi.mocked(mockNotesRepository.update).mockReturnValue(null);

      expect(() => notesService.updateNote(999, 'Content')).toThrow('Note not found');
      expect(mockNotesRepository.update).toHaveBeenCalledWith(999, { content: 'Content' });
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockNotesRepository.update).mockImplementation(() => {
        throw error;
      });

      expect(() => notesService.updateNote(1, 'Test content')).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'updateNote', id: 1 })
      );
    });
  });

  describe('deleteNote', () => {
    it('should delete a note successfully', () => {
      vi.mocked(mockNotesRepository.delete).mockReturnValue(undefined);

      notesService.deleteNote(1);

      expect(mockNotesRepository.delete).toHaveBeenCalledWith(1);
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockNotesRepository.delete).mockImplementation(() => {
        throw error;
      });

      expect(() => notesService.deleteNote(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'deleteNote', id: 1 })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in content', () => {
      const specialContent =
        'Test with "quotes", \'apostrophes\', & ampersands, <tags>, \n newlines';
      const mockNote: Note = {
        id: 1,
        caseId: 100,
        content: specialContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockNotesRepository.create).mockReturnValue(mockNote);

      const result = notesService.createNote(100, specialContent);

      expect(result.content).toBe(specialContent);
    });

    it('should handle unicode characters in content', () => {
      const unicodeContent = '测试 unicode 🎉 emoji';
      const mockNote: Note = {
        id: 1,
        caseId: 100,
        content: unicodeContent,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockNotesRepository.create).mockReturnValue(mockNote);

      const result = notesService.createNote(100, unicodeContent);

      expect(result.content).toBe(unicodeContent);
    });
  });
});
