import { getRepositories } from '@/repositories';
import type {
  TimelineEvent,
  CreateTimelineEventInput,
  UpdateTimelineEventInput,
} from '@/models/TimelineEvent';
import { errorLogger } from '@/utils/error-logger';

export class TimelineService {
  private get timelineRepository() {
    return getRepositories().timelineRepository;
  }

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

      return this.timelineRepository.create(input);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'createTimelineEvent',
        caseId: input.caseId,
      });
      throw error;
    }
  }

  /**
   * Get timeline event by ID
   */
  getTimelineEventById(id: number): TimelineEvent | null {
    try {
      return this.timelineRepository.findById(id);
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
      return this.timelineRepository.findByCaseId(caseId);
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

      const timelineEvent = this.timelineRepository.update(id, input);

      if (!timelineEvent) {
        throw new Error('Timeline event not found');
      }

      return timelineEvent;
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'updateTimelineEvent',
        id,
        fields: Object.keys(input ?? {}),
      });
      throw error;
    }
  }

  /**
   * Delete a timeline event
   */
  deleteTimelineEvent(id: number): void {
    try {
      this.timelineRepository.delete(id);
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'deleteTimelineEvent',
        id,
      });
      throw error;
    }
  }
}

export const timelineService = new TimelineService();
