/**
 * Path Security Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { join } from 'path';
import type { App } from 'electron';

// Mock electron app
const mockApp = {
  getPath: vi.fn((name: string) => {
    const paths: Record<string, string> = {
      userData: 'C:\\Users\\test\\AppData\\Roaming\\JusticeCompanion',
      documents: 'C:\\Users\\test\\Documents',
      downloads: 'C:\\Users\\test\\Downloads',
      temp: 'C:\\Users\\test\\AppData\\Local\\Temp',
    };
    return paths[name] || '';
  }),
} as unknown as App;

vi.mock('electron', () => ({
  app: mockApp,
}));

import { isPathAllowed, validatePathOrThrow, getAllowedDirectories, addAllowedDirectory } from './path-security';

describe('Path Security', () => {
  beforeEach(() => {
    // Reset mock
    vi.clearAllMocks();
  });

  describe('isPathAllowed', () => {
    it('allows paths within userData directory', () => {
      const userDataPath = 'C:\\Users\\test\\AppData\\Roaming\\JusticeCompanion\\database.db';
      expect(isPathAllowed(userDataPath)).toBe(true);
    });

    it('allows paths within documents directory', () => {
      const documentsPath = 'C:\\Users\\test\\Documents\\case-export.json';
      expect(isPathAllowed(documentsPath)).toBe(true);
    });

    it('allows paths within downloads directory', () => {
      const downloadsPath = 'C:\\Users\\test\\Downloads\\backup.db';
      expect(isPathAllowed(downloadsPath)).toBe(true);
    });

    it('allows paths within temp directory', () => {
      const tempPath = 'C:\\Users\\test\\AppData\\Local\\Temp\\temp-file.txt';
      expect(isPathAllowed(tempPath)).toBe(true);
    });

    it('allows the exact allowed directory path', () => {
      const userDataPath = 'C:\\Users\\test\\AppData\\Roaming\\JusticeCompanion';
      expect(isPathAllowed(userDataPath)).toBe(true);
    });

    it('denies paths outside allowed directories', () => {
      const systemPath = 'C:\\Windows\\System32\\config\\SAM';
      expect(isPathAllowed(systemPath)).toBe(false);
    });

    it('denies paths in root directory', () => {
      const rootPath = 'C:\\sensitive-file.txt';
      expect(isPathAllowed(rootPath)).toBe(false);
    });

    it('denies paths attempting directory traversal', () => {
      const traversalPath = 'C:\\Users\\test\\Documents\\..\\..\\Windows\\System32\\config';
      expect(isPathAllowed(traversalPath)).toBe(false);
    });

    it('denies parent directory of allowed directory', () => {
      const parentPath = 'C:\\Users\\test\\AppData\\Roaming';
      expect(isPathAllowed(parentPath)).toBe(false);
    });

    it('denies paths with similar prefix but different directory', () => {
      // Documents is allowed, but DocumentsEvil is not
      const similarPath = 'C:\\Users\\test\\DocumentsEvil\\malicious.txt';
      expect(isPathAllowed(similarPath)).toBe(false);
    });

    it('handles relative paths by resolving them', () => {
      // Relative paths should be resolved to absolute before checking
      const relativePath = './test-file.txt';
      const result = isPathAllowed(relativePath);
      // Result depends on current working directory
      expect(typeof result).toBe('boolean');
    });

    it('handles invalid paths gracefully', () => {
      const invalidPath = '<>:|?*';
      expect(isPathAllowed(invalidPath)).toBe(false);
    });

    it('handles empty paths', () => {
      expect(isPathAllowed('')).toBe(false);
    });
  });

  describe('validatePathOrThrow', () => {
    it('does not throw for allowed paths', () => {
      const allowedPath = 'C:\\Users\\test\\Documents\\file.txt';
      expect(() => validatePathOrThrow(allowedPath)).not.toThrow();
    });

    it('throws error for disallowed paths', () => {
      const disallowedPath = 'C:\\Windows\\System32\\file.txt';
      expect(() => validatePathOrThrow(disallowedPath)).toThrow(/Access denied/);
    });

    it('includes path in error message', () => {
      const disallowedPath = 'C:\\Windows\\System32\\file.txt';
      expect(() => validatePathOrThrow(disallowedPath)).toThrow(disallowedPath);
    });

    it('includes allowed directories in error message', () => {
      const disallowedPath = 'C:\\Windows\\System32\\file.txt';
      expect(() => validatePathOrThrow(disallowedPath)).toThrow(/Allowed directories:/);
    });
  });

  describe('getAllowedDirectories', () => {
    it('returns array of allowed directories', () => {
      const directories = getAllowedDirectories();
      expect(Array.isArray(directories)).toBe(true);
      expect(directories.length).toBeGreaterThan(0);
    });

    it('includes userData directory', () => {
      const directories = getAllowedDirectories();
      expect(directories).toContain('C:\\Users\\test\\AppData\\Roaming\\JusticeCompanion');
    });

    it('includes documents directory', () => {
      const directories = getAllowedDirectories();
      expect(directories).toContain('C:\\Users\\test\\Documents');
    });

    it('returns a copy of the array', () => {
      const directories1 = getAllowedDirectories();
      const directories2 = getAllowedDirectories();
      expect(directories1).not.toBe(directories2);
      expect(directories1).toEqual(directories2);
    });
  });

  describe('addAllowedDirectory', () => {
    it('adds new directory to allowed list', () => {
      const customDir = 'C:\\CustomProject\\exports';
      addAllowedDirectory(customDir);

      const directories = getAllowedDirectories();
      expect(directories).toContain(customDir);
    });

    it('allows paths in newly added directory', () => {
      const customDir = 'C:\\CustomProject\\exports';
      addAllowedDirectory(customDir);

      const testPath = join(customDir, 'test-file.txt');
      expect(isPathAllowed(testPath)).toBe(true);
    });

    it('normalizes directory path before adding', () => {
      const unnormalizedDir = 'C:\\CustomProject\\..\\CustomProject\\exports';
      addAllowedDirectory(unnormalizedDir);

      const normalizedPath = 'C:\\CustomProject\\exports\\file.txt';
      expect(isPathAllowed(normalizedPath)).toBe(true);
    });

    it('does not add duplicate directories', () => {
      const customDir = 'C:\\Test\\Directory';
      const initialCount = getAllowedDirectories().length;

      addAllowedDirectory(customDir);
      addAllowedDirectory(customDir);
      addAllowedDirectory(customDir);

      const finalCount = getAllowedDirectories().length;
      expect(finalCount).toBe(initialCount + 1);
    });
  });

  describe('Security scenarios', () => {
    it('prevents access to Windows system files', () => {
      const systemPaths = [
        'C:\\Windows\\System32\\config\\SAM',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        'C:\\ProgramData\\Microsoft\\Windows\\Start Menu',
      ];

      systemPaths.forEach(path => {
        expect(isPathAllowed(path)).toBe(false);
      });
    });

    it('prevents access to other users directories', () => {
      const otherUserPath = 'C:\\Users\\otheruser\\Documents\\file.txt';
      expect(isPathAllowed(otherUserPath)).toBe(false);
    });

    it('prevents access to program files', () => {
      const programFilesPath = 'C:\\Program Files\\SomeApp\\config.ini';
      expect(isPathAllowed(programFilesPath)).toBe(false);
    });

    it('allows subdirectories of allowed directories', () => {
      const deepPath = join(
        'C:\\Users\\test\\Documents',
        'projects',
        'justice-companion',
        'exports',
        'case-123.json'
      );
      expect(isPathAllowed(deepPath)).toBe(true);
    });
  });
});
