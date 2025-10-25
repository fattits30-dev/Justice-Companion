// src/interfaces/IDatabase.ts
export interface IDatabase {
  prepare(sql: string): any;
  exec(sql: string): void;
  transaction(fn: () => void): void;
  close(): void;
}