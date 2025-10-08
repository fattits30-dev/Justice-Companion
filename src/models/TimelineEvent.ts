export interface TimelineEvent {
  id: number;
  caseId: number;
  eventDate: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt?: string;
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
  updatedAt?: string;
}
