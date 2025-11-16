// src/interfaces/IUserRepository.ts
import type { User } from "../domains/auth/entities/User.ts";

export interface IUserRepository {
  findById(id: number): User | null;
  findByUsername(username: string): User | null;
  findByEmail(email: string): User | null;
  create(data: Partial<User>): User;
  update(id: number, data: Partial<User>): User | null;
}
