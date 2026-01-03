export interface UserProfile {
  id: number; // Always 1 (single-row table)
  name: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileInput {
  name?: string;
  email?: string | null;
  avatarUrl?: string | null;
}
