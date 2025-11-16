import { describe, it, expect } from "vitest";
import { generateCacheKey, generatePageCacheKey } from "./cache";
import type { PaginationParams } from "./pagination";

describe("Cache Key Generation", () => {
  describe("generateCacheKey", () => {
    it("should generate consistent cache keys for same inputs", () => {
      const key1 = generateCacheKey("cases", 1, "encrypted-data-123");
      const key2 = generateCacheKey("cases", 1, "encrypted-data-123");

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different encrypted values", () => {
      const key1 = generateCacheKey("cases", 1, "encrypted-data-v1");
      const key2 = generateCacheKey("cases", 1, "encrypted-data-v2");

      expect(key1).not.toBe(key2);
    });

    it("should include entity type and ID in key", () => {
      const key = generateCacheKey("cases", 123, "data");

      expect(key).toContain("cases");
      expect(key).toContain("123");
    });

    it("should include version hash in key", () => {
      const key = generateCacheKey("cases", 1, "data");
      const parts = key.split(":");

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe("cases");
      expect(parts[1]).toBe("1");
      expect(parts[2]).toMatch(/^[a-f0-9]{16}$/); // 16-char hex hash
    });

    it("should generate different version hashes for different encrypted values", () => {
      const key1 = generateCacheKey("cases", 1, "value-a");
      const key2 = generateCacheKey("cases", 1, "value-b");

      const version1 = key1.split(":")[2];
      const version2 = key2.split(":")[2];

      expect(version1).not.toBe(version2);
    });

    it("should handle string IDs", () => {
      const key = generateCacheKey("cases", "abc-123", "data");

      expect(key).toContain("abc-123");
    });

    it("should detect stale cache when encrypted value changes", () => {
      const originalKey = generateCacheKey("cases", 1, "original-encrypted");
      const updatedKey = generateCacheKey("cases", 1, "updated-encrypted");

      // Different encrypted values should produce different cache keys
      // This ensures stale cache is automatically invalidated
      expect(originalKey).not.toBe(updatedKey);
    });
  });

  describe("generatePageCacheKey", () => {
    it("should generate cache keys for paginated queries", () => {
      const params: PaginationParams = {
        limit: 20,
        cursor: undefined,
        direction: "desc",
      };

      const key = generatePageCacheKey("cases", params);

      expect(key).toContain("cases");
      expect(key).toContain("page");
      expect(key).toContain("20");
      expect(key).toContain("desc");
    });

    it('should use "start" for first page (no cursor)', () => {
      const params: PaginationParams = {
        limit: 20,
        direction: "desc",
      };

      const key = generatePageCacheKey("cases", params);

      expect(key).toContain(":start:");
    });

    it("should hash cursor for subsequent pages", () => {
      const params: PaginationParams = {
        limit: 20,
        cursor: "some-base64-cursor==",
        direction: "desc",
      };

      const key = generatePageCacheKey("cases", params);
      const parts = key.split(":");

      expect(parts[0]).toBe("cases");
      expect(parts[1]).toBe("page");
      expect(parts[2]).toMatch(/^[a-f0-9]{8}$/); // 8-char cursor hash
      expect(parts[3]).toBe("20");
      expect(parts[4]).toBe("desc");
    });

    it("should generate different keys for different cursors", () => {
      const params1: PaginationParams = {
        limit: 20,
        cursor: "cursor-1",
        direction: "desc",
      };

      const params2: PaginationParams = {
        limit: 20,
        cursor: "cursor-2",
        direction: "desc",
      };

      const key1 = generatePageCacheKey("cases", params1);
      const key2 = generatePageCacheKey("cases", params2);

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different page sizes", () => {
      const params1: PaginationParams = {
        limit: 20,
        direction: "desc",
      };

      const params2: PaginationParams = {
        limit: 50,
        direction: "desc",
      };

      const key1 = generatePageCacheKey("cases", params1);
      const key2 = generatePageCacheKey("cases", params2);

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different directions", () => {
      const params1: PaginationParams = {
        limit: 20,
        direction: "asc",
      };

      const params2: PaginationParams = {
        limit: 20,
        direction: "desc",
      };

      const key1 = generatePageCacheKey("cases", params1);
      const key2 = generatePageCacheKey("cases", params2);

      expect(key1).not.toBe(key2);
    });

    it("should default to desc direction when not specified", () => {
      const paramsWithDefault: PaginationParams = {
        limit: 20,
      };

      const paramsExplicit: PaginationParams = {
        limit: 20,
        direction: "desc",
      };

      const key1 = generatePageCacheKey("cases", paramsWithDefault);
      const key2 = generatePageCacheKey("cases", paramsExplicit);

      expect(key1).toBe(key2);
    });

    it("should be deterministic for same parameters", () => {
      const params: PaginationParams = {
        limit: 25,
        cursor: "abc123",
        direction: "asc",
      };

      const key1 = generatePageCacheKey("cases", params);
      const key2 = generatePageCacheKey("cases", params);

      expect(key1).toBe(key2);
    });
  });

  describe("Cache Key Security", () => {
    it("should use SHA-256 for version hashing", () => {
      const key = generateCacheKey("cases", 1, "test-data");
      const version = key.split(":")[2];

      // SHA-256 produces 64-char hex string, we take first 16
      expect(version).toHaveLength(16);
      expect(version).toMatch(/^[a-f0-9]+$/);
    });

    it("should prevent cache key collisions", () => {
      const keys = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const key = generateCacheKey("entity", i, `data-${i}`);
        keys.add(key);
      }

      // All keys should be unique
      expect(keys.size).toBe(iterations);
    });

    it("should handle special characters in encrypted values", () => {
      const specialChars = "data with spaces & symbols: {}\"'\\n\\t";

      expect(() => {
        generateCacheKey("cases", 1, specialChars);
      }).not.toThrow();
    });
  });
});
