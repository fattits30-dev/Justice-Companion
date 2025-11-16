export interface UserFact {
  id: number;
  caseId: number;
  factContent: string;
  factType:
    | "personal"
    | "employment"
    | "financial"
    | "contact"
    | "medical"
    | "other";
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserFactInput {
  caseId: number;
  factContent: string;
  factType:
    | "personal"
    | "employment"
    | "financial"
    | "contact"
    | "medical"
    | "other";
}

export interface UpdateUserFactInput {
  factContent?: string;
  factType?:
    | "personal"
    | "employment"
    | "financial"
    | "contact"
    | "medical"
    | "other";
}
