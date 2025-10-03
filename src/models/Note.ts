export interface Note {
  id: number;
  caseId: number;
  content: string;
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
