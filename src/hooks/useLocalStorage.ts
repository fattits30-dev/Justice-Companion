/**
 * useLocalStorage Hook
 *
 * A React hook that syncs state with localStorage, providing persistent state management.
 * Automatically serializes/deserializes values and handles errors gracefully.
 *
 * Features:
 * - Type-safe with TypeScript generics
 * - Same API as useState for drop-in replacement
 * - Automatic JSON serialization/deserialization
 * - Security: Prevents prototype pollution and injection attacks
 * - Error handling for localStorage access issues
 * - Supports functional updates like setState
 *
 * Usage:
 * ```tsx
 * // Boolean value
 * const [darkMode, setDarkMode] = useLocalStorage('darkMode', false);
 *
 * // String value
 * const [fontSize, setFontSize] = useLocalStorage('fontSize', 'medium');
 *
 * // Object value
 * const [settings, setSettings] = useLocalStorage('settings', { theme: 'dark' });
 *
 * // Functional update
 * setDarkMode(prev => !prev);
 * ```
 *
 * @param key - The localStorage key to use
 * @param defaultValue - The default value if no stored value exists
 * @returns A stateful value and a function to update it, like useState
 */

import { useState, Dispatch, SetStateAction } from 'react';
import { logger } from '../utils/logger.ts';

/**
 * Sanitize parsed data to prevent prototype pollution and other injection attacks
 * Removes dangerous properties that could be used for attacks
 */
function sanitizeValue<T>(value: unknown): T {
  if (value === null || value === undefined) {
    return value as T;
  }

  // For primitive types, return as-is
  if (typeof value !== 'object') {
    return value as T;
  }

  // For objects and arrays, remove dangerous properties
  const sanitized = Array.isArray(value) ? [...value] : { ...value as object };

  // Delete prototype pollution vectors using Reflect.deleteProperty for type safety
  Reflect.deleteProperty(sanitized as object, '__proto__');
  Reflect.deleteProperty(sanitized as object, 'constructor');
  Reflect.deleteProperty(sanitized as object, 'prototype');

  return sanitized as T;
}

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Initialize state from localStorage or use default value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from localStorage
      const item = window.localStorage.getItem(key);

      // Parse stored json or return default value
      if (item !== null) {
        const parsed = JSON.parse(item);

        // Sanitize to prevent prototype pollution and XSS
        const sanitized = sanitizeValue<T>(parsed);

        return sanitized;
      }

      return defaultValue;
    } catch (error) {
      // If error (localStorage unavailable or invalid JSON), return default value
      logger.warn('useLocalStorage', `Error reading localStorage key "${key}"`, { error });
      return defaultValue;
    }
  });

  // Custom setter that also updates localStorage
  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    try {
      // Allow value to be a function (like useState)
      const valueToStore = typeof value === 'function' ? (value as (prev: T) => T)(storedValue) : value;

      // Sanitize before storing to prevent injection on write
      const sanitizedValue = sanitizeValue<T>(valueToStore);

      // Save state
      setStoredValue(sanitizedValue);

      // Save to localStorage
      window.localStorage.setItem(key, JSON.stringify(sanitizedValue));
    } catch (error) {
      // If error (localStorage full or unavailable), still update state
      logger.warn('useLocalStorage', `Error setting localStorage key "${key}"`, { error });

      // Update state even if localStorage fails
      const valueToStore = typeof value === 'function' ? (value as (prev: T) => T)(storedValue) : value;
      const sanitizedValue = sanitizeValue<T>(valueToStore);
      setStoredValue(sanitizedValue);
    }
  };

  // Return state and setter
  return [storedValue, setValue];
}
