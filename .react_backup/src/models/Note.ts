export interface Note {
  id: number;
  caseId: number | null;
  userId: number;
  title?: string | null;
  content: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  caseId: number;
  content: string;
}

export interface UpdateNoteInput {
  content: string;
}
