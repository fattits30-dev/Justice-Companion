export interface TimelineEvent {
  id: number;
  caseId: number;
  eventDate: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface CreateTimelineEventInput {
  caseId: number;
  eventDate: string;
  title: string;
  description?: string;
}

export interface UpdateTimelineEventInput {
  eventDate?: string;
  title?: string;
  description?: string;
}
