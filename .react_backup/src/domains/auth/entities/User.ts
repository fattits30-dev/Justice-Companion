/**
 * User model for authentication system
 * Represents a user account with encrypted personal data
 */
export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: "user" | "admin";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role?: "user" | "admin";
}

/**
 * Input for updating user details
 */
export interface UpdateUserInput {
  email?: string;
  isActive?: boolean;
  role?: "user" | "admin";
}
