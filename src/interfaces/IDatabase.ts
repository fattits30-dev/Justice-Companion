// src/interfaces/IDatabase.ts
export interface IDatabase {
  prepare(sql: string): unknown; // This is a complex type that varies by database implementation
  exec(sql: string): unknown; // Return type depends on database implementation
  transaction(fn: () => void): unknown; // Transaction handling return type
  close(): unknown; // Close operation return type
}
