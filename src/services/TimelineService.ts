import { timelineRepository } from '../repositories/TimelineRepository';
import type { TimelineEvent, CreateTimelineEventInput, UpdateTimelineEventInput } from '../models/TimelineEvent';
import { errorLogger } from '../utils/error-logger';

export class TimelineService {
  /**
   * Create a new timeline event for a case
   */
  createTimelineEvent(input: CreateTimelineEventInput): TimelineEvent {
    try {
      // Validate input
      if (!input.title || input.title.trim().length === 0) {
        throw new Error('Timeline event title is required');
      }

      if (input.title.length > 200) {
        throw new Error('Timeline event title must be 200 characters or less');
      }

      if (!input.eventDate) {
        throw new Error('Timeline event date is required');
      }

      if (input.description && input.description.length > 10000) {
        throw new Error('Timeline event description must be 10000 characters or less');
      }

      const timelineEvent = timelineRepository.create(input);

      errorLogger.logError('Timeline event created successfully', {
        type: 'info',
        timelineEventId: timelineEvent.id,
        caseId: input.caseId,
      });

      return timelineEvent;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'createTimelineEvent', input });
      throw error;
    }
  }

  /**
   * Get timeline event by ID
   */
  getTimelineEventById(id: number): TimelineEvent | null {
    try {
      return timelineRepository.findById(id);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getTimelineEventById', id });
      throw error;
    }
  }

  /**
   * Get all timeline events for a case
   */
  getTimelineEventsByCaseId(caseId: number): TimelineEvent[] {
    try {
      return timelineRepository.findByCaseId(caseId);
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'getTimelineEventsByCaseId', caseId });
      throw error;
    }
  }

  /**
   * Update a timeline event
   */
  updateTimelineEvent(id: number, input: UpdateTimelineEventInput): TimelineEvent {
    try {
      // Validate input
      if (input.title !== undefined && input.title.trim().length === 0) {
        throw new Error('Timeline event title cannot be empty');
      }

      if (input.title && input.title.length > 200) {
        throw new Error('Timeline event title must be 200 characters or less');
      }

      if (input.description && input.description.length > 10000) {
        throw new Error('Timeline event description must be 10000 characters or less');
      }

      const timelineEvent = timelineRepository.update(id, input);

      errorLogger.logError('Timeline event updated successfully', {
        type: 'info',
        timelineEventId: id,
      });

      return timelineEvent;
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'updateTimelineEvent', id, input });
      throw error;
    }
  }

  /**
   * Delete a timeline event
   */
  deleteTimelineEvent(id: number): void {
    try {
      timelineRepository.delete(id);

      errorLogger.logError('Timeline event deleted successfully', {
        type: 'info',
        timelineEventId: id,
      });
    } catch (error) {
      errorLogger.logError(error as Error, { context: 'deleteTimelineEvent', id });
      throw error;
    }
  }
}

export const timelineService = new TimelineService();
