// Vitest test setup file
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend the global expect with jest-dom matchers
expect.extend(matchers);

// Note: React Testing Library 16+ automatically cleans up after each test
// No manual afterEach cleanup needed!

/**
 * IMPROVED: Full-featured Storage mock that behaves exactly like real browser Storage.
 * This implementation:
 * - Stores data in-memory
 * - Implements all Storage interface methods correctly
 * - Works with both localStorage and sessionStorage
 * - Fixes issues with partial implementations in test environments
 */
class StorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  // Support bracket notation (e.g., localStorage['key'])
  [key: string]: any;
  [index: number]: string;
}

// ALWAYS override localStorage and sessionStorage with our robust implementation
// This ensures consistent behavior across all test environments (jsdom, happy-dom, etc.)
(globalThis as any).localStorage = new StorageMock();
(globalThis as any).sessionStorage = new StorageMock();
(globalThis as any).Storage = StorageMock;
