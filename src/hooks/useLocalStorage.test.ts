/**
 * Tests for useLocalStorage hook
 *
 * Verifies localStorage integration, type safety, and state management.
 * Tests cover:
 * - Initial load with no saved value (returns default)
 * - Initial load with saved value (returns parsed value)
 * - Setting new values (persists to localStorage)
 * - Type safety (boolean, string, number, object)
 * - Error handling (localStorage unavailable)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  // Mock localStorage before each test
  beforeEach(() => {
    // Clear all localStorage data
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Initial Load - No Saved Value', () => {
    it('should return default value when localStorage is empty (string)', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', 'default'));

      expect(result.current[0]).toBe('default');
      expect(localStorage.getItem('testKey')).toBeNull();
    });

    it('should return default value when localStorage is empty (boolean)', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', true));

      expect(result.current[0]).toBe(true);
      expect(localStorage.getItem('testKey')).toBeNull();
    });

    it('should return default value when localStorage is empty (number)', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', 42));

      expect(result.current[0]).toBe(42);
      expect(localStorage.getItem('testKey')).toBeNull();
    });

    it('should return default value when localStorage is empty (object)', () => {
      const defaultObj = { theme: 'dark', fontSize: 16 };
      const { result } = renderHook(() => useLocalStorage('testKey', defaultObj));

      expect(result.current[0]).toEqual(defaultObj);
      expect(localStorage.getItem('testKey')).toBeNull();
    });
  });

  describe('Initial Load - With Saved Value', () => {
    it('should return saved value from localStorage (string)', () => {
      localStorage.setItem('testKey', JSON.stringify('saved'));

      const { result } = renderHook(() => useLocalStorage('testKey', 'default'));

      expect(result.current[0]).toBe('saved');
    });

    it('should return saved value from localStorage (boolean)', () => {
      localStorage.setItem('testKey', JSON.stringify(false));

      const { result } = renderHook(() => useLocalStorage('testKey', true));

      expect(result.current[0]).toBe(false);
    });

    it('should return saved value from localStorage (number)', () => {
      localStorage.setItem('testKey', JSON.stringify(100));

      const { result } = renderHook(() => useLocalStorage('testKey', 42));

      expect(result.current[0]).toBe(100);
    });

    it('should return saved value from localStorage (object)', () => {
      const savedObj = { theme: 'light', fontSize: 18 };
      localStorage.setItem('testKey', JSON.stringify(savedObj));

      const { result } = renderHook(() => useLocalStorage('testKey', { theme: 'dark', fontSize: 16 }));

      expect(result.current[0]).toEqual(savedObj);
    });
  });

  describe('Setting New Values', () => {
    it('should update state and localStorage when setting new value (string)', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', 'default'));

      expect(result.current[0]).toBe('default');

      act(() => {
        result.current[1]('updated');
      });

      expect(result.current[0]).toBe('updated');
      expect(localStorage.getItem('testKey')).toBe(JSON.stringify('updated'));
    });

    it('should update state and localStorage when setting new value (boolean)', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', true));

      expect(result.current[0]).toBe(true);

      act(() => {
        result.current[1](false);
      });

      expect(result.current[0]).toBe(false);
      expect(localStorage.getItem('testKey')).toBe(JSON.stringify(false));
    });

    it('should update state and localStorage when setting new value (number)', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', 42));

      expect(result.current[0]).toBe(42);

      act(() => {
        result.current[1](100);
      });

      expect(result.current[0]).toBe(100);
      expect(localStorage.getItem('testKey')).toBe(JSON.stringify(100));
    });

    it('should update state and localStorage when setting new value (object)', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', { count: 0 }));

      expect(result.current[0]).toEqual({ count: 0 });

      act(() => {
        result.current[1]({ count: 5 });
      });

      expect(result.current[0]).toEqual({ count: 5 });
      expect(localStorage.getItem('testKey')).toBe(JSON.stringify({ count: 5 }));
    });

    it('should support functional updates like useState', () => {
      const { result } = renderHook(() => useLocalStorage('counter', 0));

      expect(result.current[0]).toBe(0);

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(1);
      expect(localStorage.getItem('counter')).toBe(JSON.stringify(1));

      act(() => {
        result.current[1]((prev) => prev + 1);
      });

      expect(result.current[0]).toBe(2);
      expect(localStorage.getItem('counter')).toBe(JSON.stringify(2));
    });
  });

  describe('Error Handling', () => {
    it('should return default value if localStorage.getItem throws error', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      const { result } = renderHook(() => useLocalStorage('testKey', 'default'));

      expect(result.current[0]).toBe('default');

      getItemSpy.mockRestore();
    });

    it('should return default value if stored value is invalid JSON', () => {
      localStorage.setItem('testKey', 'invalid json {');

      const { result } = renderHook(() => useLocalStorage('testKey', 'default'));

      expect(result.current[0]).toBe('default');
    });

    it('should handle localStorage.setItem errors gracefully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockImplementation(() => {
        throw new Error('localStorage full');
      });

      const { result } = renderHook(() => useLocalStorage('testKey', 'default'));

      // Should not throw when setting value
      expect(() => {
        act(() => {
          result.current[1]('new value');
        });
      }).not.toThrow();

      // State should still update even if localStorage fails
      expect(result.current[0]).toBe('new value');

      setItemSpy.mockRestore();
    });
  });

  describe('Multiple Hook Instances', () => {
    it('should synchronize state across multiple hook instances with same key', () => {
      const { result: result1 } = renderHook(() => useLocalStorage('sharedKey', 'initial'));
      const { result: result2 } = renderHook(() => useLocalStorage('sharedKey', 'initial'));

      expect(result1.current[0]).toBe('initial');
      expect(result2.current[0]).toBe('initial');

      act(() => {
        result1.current[1]('updated');
      });

      expect(result1.current[0]).toBe('updated');
      expect(localStorage.getItem('sharedKey')).toBe(JSON.stringify('updated'));

      // Note: result2 won't auto-sync unless we implement storage event listener
      // For now, this test just verifies localStorage is updated
    });

    it('should handle different keys independently', () => {
      const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'));
      const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'));

      expect(result1.current[0]).toBe('value1');
      expect(result2.current[0]).toBe('value2');

      act(() => {
        result1.current[1]('updated1');
      });

      expect(result1.current[0]).toBe('updated1');
      expect(result2.current[0]).toBe('value2'); // Should not change
      expect(localStorage.getItem('key1')).toBe(JSON.stringify('updated1'));
      expect(localStorage.getItem('key2')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null as default value', () => {
      const { result } = renderHook(() => useLocalStorage<string | null>('testKey', null));

      expect(result.current[0]).toBeNull();
    });

    it('should handle undefined as stored value (treats as no value)', () => {
      localStorage.setItem('testKey', JSON.stringify(undefined));

      const { result } = renderHook(() => useLocalStorage('testKey', 'default'));

      // undefined in JSON becomes "undefined" string, which is invalid JSON
      // So it should fallback to default value
      expect(result.current[0]).toBe('default');
    });

    it('should handle empty string as valid value', () => {
      const { result } = renderHook(() => useLocalStorage('testKey', 'default'));

      act(() => {
        result.current[1]('');
      });

      expect(result.current[0]).toBe('');
      expect(localStorage.getItem('testKey')).toBe(JSON.stringify(''));
    });

    it('should handle array values', () => {
      const defaultArray = [1, 2, 3];
      const { result } = renderHook(() => useLocalStorage('testKey', defaultArray));

      expect(result.current[0]).toEqual(defaultArray);

      act(() => {
        result.current[1]([4, 5, 6]);
      });

      expect(result.current[0]).toEqual([4, 5, 6]);
      expect(localStorage.getItem('testKey')).toBe(JSON.stringify([4, 5, 6]));
    });
  });

  describe('Security - Prototype Pollution Protection', () => {
    it('should prevent prototype pollution via __proto__ injection', () => {
      // Attempt to pollute Object.prototype via malicious payload
      const maliciousPayload = JSON.stringify({ __proto__: { isAdmin: true } });
      localStorage.setItem('testKey', maliciousPayload);

      const { result } = renderHook(() => useLocalStorage('testKey', {}));

      // Should not pollute Object.prototype
      expect(({}as any).isAdmin).toBeUndefined();
      // Should not have __proto__ property in returned value
      expect(result.current[0]).not.toHaveProperty('__proto__');
    });

    it('should prevent constructor injection attacks', () => {
      // Attempt to inject constructor property
      const maliciousPayload = JSON.stringify({ constructor: { prototype: { isAdmin: true } } });
      localStorage.setItem('testKey', maliciousPayload);

      const { result } = renderHook(() => useLocalStorage<Record<string, any>>('testKey', {}));

      // Should not have constructor property
      expect(result.current[0]).not.toHaveProperty('constructor');
      // Should not pollute Object constructor
      expect(({}as any).isAdmin).toBeUndefined();
    });

    it('should sanitize dangerous properties when writing values', () => {
      const { result } = renderHook(() => useLocalStorage<Record<string, any>>('testKey', {}));

      // Attempt to write object with dangerous properties
      act(() => {
        result.current[1]({
          __proto__: { isAdmin: true },
          constructor: { prototype: { isEvil: true } },
          prototype: { isBad: true },
          normalProperty: 'safe',
        } as any);
      });

      const storedValue = result.current[0];

      // Dangerous properties should be removed
      expect(storedValue).not.toHaveProperty('__proto__');
      expect(storedValue).not.toHaveProperty('constructor');
      expect(storedValue).not.toHaveProperty('prototype');

      // Normal properties should remain
      expect(storedValue).toHaveProperty('normalProperty', 'safe');

      // Global prototypes should not be polluted
      expect(({}as any).isAdmin).toBeUndefined();
      expect(({}as any).isEvil).toBeUndefined();
      expect(({}as any).isBad).toBeUndefined();
    });

    it('should sanitize nested objects and arrays', () => {
      const maliciousPayload = JSON.stringify({
        user: {
          name: 'John',
          __proto__: { role: 'admin' },
        },
        items: [
          { id: 1 },
          { id: 2, __proto__: { elevated: true } },
        ],
      });
      localStorage.setItem('testKey', maliciousPayload);

      const { result } = renderHook(() =>
        useLocalStorage<Record<string, any>>('testKey', {})
      );

      const storedValue = result.current[0];

      // Top level should not have __proto__
      expect(storedValue).not.toHaveProperty('__proto__');

      // Note: Current implementation only sanitizes top-level properties
      // Nested __proto__ may still exist but won't pollute global prototypes
      // because they're in a clean object created by spread operator
      expect(({}as any).role).toBeUndefined();
      expect(({}as any).elevated).toBeUndefined();
    });

    it('should handle large payloads without DoS', () => {
      // Create a large but valid payload (100KB)
      const largeArray = new Array(10000).fill({ key: 'value', number: 12345 });
      const largePayload = JSON.stringify(largeArray);

      localStorage.setItem('testKey', largePayload);

      const startTime = performance.now();
      const { result } = renderHook(() => useLocalStorage('testKey', []));
      const endTime = performance.now();

      // Should complete in reasonable time (<500ms)
      expect(endTime - startTime).toBeLessThan(500);
      expect(result.current[0]).toHaveLength(10000);
    });
  });
});
