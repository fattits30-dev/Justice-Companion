import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimelineService } from './TimelineService';
import { errorLogger } from '../../../utils/error-logger';
import type { TimelineEvent } from '../../../models/TimelineEvent';

// Mock centralized repository initialization
const mockTimelineRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByCaseId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../../repositories', () => ({
  getRepositories: vi.fn(() => ({
    timelineRepository: mockTimelineRepository,
  })),
  resetRepositories: vi.fn(),
}));

vi.mock('../../../utils/error-logger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('TimelineService', () => {
  let timelineService: TimelineService;

  beforeEach(() => {
    timelineService = new TimelineService();
    vi.clearAllMocks();
  });

  describe('createTimelineEvent', () => {
    it('should create a timeline event with valid input', () => {
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: 'First Meeting',
        eventDate: '2025-01-15',
        description: 'Initial client consultation',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockTimelineRepository.create).mockReturnValue(mockTimelineEvent);

      const result = timelineService.createTimelineEvent({
        caseId: 100,
        title: 'First Meeting',
        eventDate: '2025-01-15',
        description: 'Initial client consultation',
      });

      expect(result).toEqual(mockTimelineEvent);
      expect(mockTimelineRepository.create).toHaveBeenCalledWith({
        caseId: 100,
        title: 'First Meeting',
        eventDate: '2025-01-15',
        description: 'Initial client consultation',
      });
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should create a timeline event without description', () => {
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: 'Court Hearing',
        eventDate: '2025-02-20',
        description: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockTimelineRepository.create).mockReturnValue(mockTimelineEvent);

      const result = timelineService.createTimelineEvent({
        caseId: 100,
        title: 'Court Hearing',
        eventDate: '2025-02-20',
      });

      expect(result).toEqual(mockTimelineEvent);
      expect(mockTimelineRepository.create).toHaveBeenCalled();
    });

    it('should throw error if title is empty', () => {
      expect(() =>
        timelineService.createTimelineEvent({
          caseId: 100,
          title: '',
          eventDate: '2025-01-15',
        })
      ).toThrow('Timeline event title is required');

      expect(() =>
        timelineService.createTimelineEvent({
          caseId: 100,
          title: '   ',
          eventDate: '2025-01-15',
        })
      ).toThrow('Timeline event title is required');

      expect(mockTimelineRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if title exceeds 200 characters', () => {
      const longTitle = 'a'.repeat(201);

      expect(() =>
        timelineService.createTimelineEvent({
          caseId: 100,
          title: longTitle,
          eventDate: '2025-01-15',
        })
      ).toThrow('Timeline event title must be 200 characters or less');

      expect(mockTimelineRepository.create).not.toHaveBeenCalled();
    });

    it('should accept title exactly 200 characters', () => {
      const maxTitle = 'a'.repeat(200);
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: maxTitle,
        eventDate: '2025-01-15',
        description: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockTimelineRepository.create).mockReturnValue(mockTimelineEvent);

      const result = timelineService.createTimelineEvent({
        caseId: 100,
        title: maxTitle,
        eventDate: '2025-01-15',
      });

      expect(result).toEqual(mockTimelineEvent);
      expect(mockTimelineRepository.create).toHaveBeenCalled();
    });

    it('should throw error if eventDate is missing', () => {
      expect(() =>
        timelineService.createTimelineEvent({
          caseId: 100,
          title: 'Test Event',
          eventDate: '',
        })
      ).toThrow('Timeline event date is required');

      expect(mockTimelineRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if description exceeds 10000 characters', () => {
      const longDescription = 'a'.repeat(10001);

      expect(() =>
        timelineService.createTimelineEvent({
          caseId: 100,
          title: 'Test Event',
          eventDate: '2025-01-15',
          description: longDescription,
        })
      ).toThrow('Timeline event description must be 10000 characters or less');

      expect(mockTimelineRepository.create).not.toHaveBeenCalled();
    });

    it('should accept description exactly 10000 characters', () => {
      const maxDescription = 'a'.repeat(10000);
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: 'Test Event',
        eventDate: '2025-01-15',
        description: maxDescription,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockTimelineRepository.create).mockReturnValue(mockTimelineEvent);

      const result = timelineService.createTimelineEvent({
        caseId: 100,
        title: 'Test Event',
        eventDate: '2025-01-15',
        description: maxDescription,
      });

      expect(result).toEqual(mockTimelineEvent);
      expect(mockTimelineRepository.create).toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockTimelineRepository.create).mockImplementation(() => {
        throw error;
      });

      expect(() =>
        timelineService.createTimelineEvent({
          caseId: 100,
          title: 'Test Event',
          eventDate: '2025-01-15',
        })
      ).toThrow('Database error');

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'createTimelineEvent',
          caseId: 100,
        })
      );
    });
  });

  describe('getTimelineEventById', () => {
    it('should return a timeline event by id', () => {
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: 'Test Event',
        eventDate: '2025-01-15',
        description: 'Test description',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockTimelineRepository.findById).mockReturnValue(mockTimelineEvent);

      const result = timelineService.getTimelineEventById(1);

      expect(result).toEqual(mockTimelineEvent);
      expect(mockTimelineRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if timeline event not found', () => {
      vi.mocked(mockTimelineRepository.findById).mockReturnValue(null);

      const result = timelineService.getTimelineEventById(999);

      expect(result).toBeNull();
      expect(mockTimelineRepository.findById).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockTimelineRepository.findById).mockImplementation(() => {
        throw error;
      });

      expect(() => timelineService.getTimelineEventById(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getTimelineEventById', id: 1 })
      );
    });
  });

  describe('getTimelineEventsByCaseId', () => {
    it('should return all timeline events for a case', () => {
      const mockTimelineEvents: TimelineEvent[] = [
        {
          id: 1,
          caseId: 100,
          title: 'Event 1',
          eventDate: '2025-01-15',
          description: 'Description 1',
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        },
        {
          id: 2,
          caseId: 100,
          title: 'Event 2',
          eventDate: '2025-02-20',
          description: 'Description 2',
          createdAt: '2025-10-06T00:01:00.000Z',
          updatedAt: '2025-10-06T00:01:00.000Z',
        },
      ];

      vi.mocked(mockTimelineRepository.findByCaseId).mockReturnValue(mockTimelineEvents);

      const result = timelineService.getTimelineEventsByCaseId(100);

      expect(result).toEqual(mockTimelineEvents);
      expect(mockTimelineRepository.findByCaseId).toHaveBeenCalledWith(100);
    });

    it('should return empty array if no timeline events exist', () => {
      vi.mocked(mockTimelineRepository.findByCaseId).mockReturnValue([]);

      const result = timelineService.getTimelineEventsByCaseId(999);

      expect(result).toEqual([]);
      expect(mockTimelineRepository.findByCaseId).toHaveBeenCalledWith(999);
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockTimelineRepository.findByCaseId).mockImplementation(() => {
        throw error;
      });

      expect(() => timelineService.getTimelineEventsByCaseId(100)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'getTimelineEventsByCaseId', caseId: 100 })
      );
    });
  });

  describe('updateTimelineEvent', () => {
    it('should update a timeline event with valid input', () => {
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: 'Updated Event',
        eventDate: '2025-03-10',
        description: 'Updated description',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(mockTimelineRepository.update).mockReturnValue(mockTimelineEvent);

      const result = timelineService.updateTimelineEvent(1, {
        title: 'Updated Event',
        eventDate: '2025-03-10',
        description: 'Updated description',
      });

      expect(result).toEqual(mockTimelineEvent);
      expect(mockTimelineRepository.update).toHaveBeenCalledWith(1, {
        title: 'Updated Event',
        eventDate: '2025-03-10',
        description: 'Updated description',
      });
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should update only title', () => {
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: 'Updated Title',
        eventDate: '2025-01-15',
        description: 'Original description',
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:05:00.000Z',
      };

      vi.mocked(mockTimelineRepository.update).mockReturnValue(mockTimelineEvent);

      const result = timelineService.updateTimelineEvent(1, {
        title: 'Updated Title',
      });

      expect(result).toEqual(mockTimelineEvent);
    });

    it('should throw error if title is empty string', () => {
      expect(() => timelineService.updateTimelineEvent(1, { title: '' })).toThrow(
        'Timeline event title cannot be empty'
      );

      expect(() => timelineService.updateTimelineEvent(1, { title: '   ' })).toThrow(
        'Timeline event title cannot be empty'
      );

      expect(mockTimelineRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if title exceeds 200 characters', () => {
      const longTitle = 'a'.repeat(201);

      expect(() => timelineService.updateTimelineEvent(1, { title: longTitle })).toThrow(
        'Timeline event title must be 200 characters or less'
      );

      expect(mockTimelineRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if description exceeds 10000 characters', () => {
      const longDescription = 'a'.repeat(10001);

      expect(() =>
        timelineService.updateTimelineEvent(1, { description: longDescription })
      ).toThrow('Timeline event description must be 10000 characters or less');

      expect(mockTimelineRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if timeline event not found', () => {
      vi.mocked(mockTimelineRepository.update).mockReturnValue(null);

      expect(() => timelineService.updateTimelineEvent(999, { title: 'Test' })).toThrow(
        'Timeline event not found'
      );

      expect(mockTimelineRepository.update).toHaveBeenCalledWith(999, { title: 'Test' });
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockTimelineRepository.update).mockImplementation(() => {
        throw error;
      });

      expect(() => timelineService.updateTimelineEvent(1, { title: 'Test' })).toThrow(
        'Database error'
      );

      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'updateTimelineEvent',
          id: 1,
          fields: ['title'],
        })
      );
    });
  });

  describe('deleteTimelineEvent', () => {
    it('should delete a timeline event successfully', () => {
      vi.mocked(mockTimelineRepository.delete).mockReturnValue(undefined);

      timelineService.deleteTimelineEvent(1);

      expect(mockTimelineRepository.delete).toHaveBeenCalledWith(1);
      expect(errorLogger.logError).not.toHaveBeenCalled();
    });

    it('should log and rethrow repository errors', () => {
      const error = new Error('Database error');
      vi.mocked(mockTimelineRepository.delete).mockImplementation(() => {
        throw error;
      });

      expect(() => timelineService.deleteTimelineEvent(1)).toThrow('Database error');
      expect(errorLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ context: 'deleteTimelineEvent', id: 1 })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in title', () => {
      const specialTitle = 'Meeting @ "Client\'s Office" <urgent>';
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: specialTitle,
        eventDate: '2025-01-15',
        description: null,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockTimelineRepository.create).mockReturnValue(mockTimelineEvent);

      const result = timelineService.createTimelineEvent({
        caseId: 100,
        title: specialTitle,
        eventDate: '2025-01-15',
      });

      expect(result.title).toBe(specialTitle);
    });

    it('should handle unicode characters in title and description', () => {
      const unicodeTitle = '法庭聽證 Court Hearing 🏛️';
      const unicodeDescription = '重要事件 Important event 📅';
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: unicodeTitle,
        eventDate: '2025-01-15',
        description: unicodeDescription,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockTimelineRepository.create).mockReturnValue(mockTimelineEvent);

      const result = timelineService.createTimelineEvent({
        caseId: 100,
        title: unicodeTitle,
        eventDate: '2025-01-15',
        description: unicodeDescription,
      });

      expect(result.title).toBe(unicodeTitle);
      expect(result.description).toBe(unicodeDescription);
    });

    it('should handle various date formats', () => {
      const dateFormats = [
        '2025-01-15',
        '2025-12-31',
        '2025-06-15T14:30:00Z',
        '2025-03-20T10:00:00.000Z',
      ];

      dateFormats.forEach((dateFormat) => {
        const mockTimelineEvent: TimelineEvent = {
          id: 1,
          caseId: 100,
          title: 'Test Event',
          eventDate: dateFormat,
          description: null,
          createdAt: '2025-10-06T00:00:00.000Z',
          updatedAt: '2025-10-06T00:00:00.000Z',
        };

        vi.mocked(mockTimelineRepository.create).mockReturnValue(mockTimelineEvent);

        const result = timelineService.createTimelineEvent({
          caseId: 100,
          title: 'Test Event',
          eventDate: dateFormat,
        });

        expect(result.eventDate).toBe(dateFormat);
      });
    });

    it('should handle newlines in description', () => {
      const descriptionWithNewlines = 'Event details:\n- Item 1\n- Item 2\n- Item 3';
      const mockTimelineEvent: TimelineEvent = {
        id: 1,
        caseId: 100,
        title: 'Test',
        eventDate: '2025-01-15',
        description: descriptionWithNewlines,
        createdAt: '2025-10-06T00:00:00.000Z',
        updatedAt: '2025-10-06T00:00:00.000Z',
      };

      vi.mocked(mockTimelineRepository.create).mockReturnValue(mockTimelineEvent);

      const result = timelineService.createTimelineEvent({
        caseId: 100,
        title: 'Test',
        eventDate: '2025-01-15',
        description: descriptionWithNewlines,
      });

      expect(result.description).toBe(descriptionWithNewlines);
    });
  });
});
