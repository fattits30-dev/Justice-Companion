import { describe, it, expect } from 'vitest';
import { PaginationParamsSchema } from './pagination';
import type { PaginationParams, PaginatedResult } from './pagination';

describe('Pagination Types', () => {
  describe('PaginationParamsSchema Validation', () => {
    it('should validate correct pagination parameters', () => {
      const params: PaginationParams = {
        limit: 20,
        cursor: 'some-cursor',
        direction: 'desc',
      };

      const result = PaginationParamsSchema.parse(params);

      expect(result.limit).toBe(20);
      expect(result.cursor).toBe('some-cursor');
      expect(result.direction).toBe('desc');
    });

    it('should apply default limit of 20', () => {
      const params = {};

      const result = PaginationParamsSchema.parse(params);

      expect(result.limit).toBe(20);
    });

    it('should apply default direction of desc', () => {
      const params = { limit: 10 };

      const result = PaginationParamsSchema.parse(params);

      expect(result.direction).toBe('desc');
    });

    it('should accept asc direction', () => {
      const params = { limit: 10, direction: 'asc' as const };

      const result = PaginationParamsSchema.parse(params);

      expect(result.direction).toBe('asc');
    });

    it('should accept desc direction', () => {
      const params = { limit: 10, direction: 'desc' as const };

      const result = PaginationParamsSchema.parse(params);

      expect(result.direction).toBe('desc');
    });

    it('should make cursor optional', () => {
      const params = { limit: 10 };

      const result = PaginationParamsSchema.parse(params);

      expect(result.cursor).toBeUndefined();
    });

    it('should accept minimum limit of 1', () => {
      const params = { limit: 1 };

      const result = PaginationParamsSchema.parse(params);

      expect(result.limit).toBe(1);
    });

    it('should accept maximum limit of 100', () => {
      const params = { limit: 100 };

      const result = PaginationParamsSchema.parse(params);

      expect(result.limit).toBe(100);
    });
  });

  describe('PaginationParamsSchema - OWASP Validation', () => {
    it('should reject limit below minimum (OWASP: Input Validation)', () => {
      const params = { limit: 0 };

      expect(() => PaginationParamsSchema.parse(params)).toThrow();
    });

    it('should reject negative limit', () => {
      const params = { limit: -10 };

      expect(() => PaginationParamsSchema.parse(params)).toThrow();
    });

    it('should reject limit above maximum (OWASP: DoS Prevention)', () => {
      const params = { limit: 101 };

      expect(() => PaginationParamsSchema.parse(params)).toThrow();
    });

    it('should reject limit above maximum (extreme value)', () => {
      const params = { limit: 10000 };

      expect(() => PaginationParamsSchema.parse(params)).toThrow();
    });

    it('should reject non-integer limit', () => {
      const params = { limit: 20.5 };

      expect(() => PaginationParamsSchema.parse(params)).toThrow();
    });

    it('should reject invalid direction', () => {
      const params = { limit: 20, direction: 'invalid' };

      expect(() => PaginationParamsSchema.parse(params)).toThrow();
    });

    it('should reject null direction', () => {
      const params = { limit: 20, direction: null };

      expect(() => PaginationParamsSchema.parse(params)).toThrow();
    });
  });

  describe('PaginatedResult Structure', () => {
    it('should have required fields', () => {
      const result: PaginatedResult<{ id: number }> = {
        items: [{ id: 1 }, { id: 2 }],
        nextCursor: 'cursor-to-next-page',
        prevCursor: undefined,
        hasMore: true,
        pageSize: 20,
        totalReturned: 2,
      };

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('cursor-to-next-page');
      expect(result.prevCursor).toBeUndefined();
      expect(result.hasMore).toBe(true);
      expect(result.pageSize).toBe(20);
      expect(result.totalReturned).toBe(2);
    });

    it('should allow totalCount to be optional', () => {
      const result: PaginatedResult<{ id: number }> = {
        items: [],
        nextCursor: undefined,
        prevCursor: undefined,
        hasMore: false,
        pageSize: 20,
        totalReturned: 0,
        // totalCount is optional
      };

      expect(result.totalCount).toBeUndefined();
    });

    it('should include totalCount when provided', () => {
      const result: PaginatedResult<{ id: number }> = {
        items: [],
        nextCursor: undefined,
        prevCursor: undefined,
        hasMore: false,
        pageSize: 20,
        totalReturned: 0,
        totalCount: 1000,
      };

      expect(result.totalCount).toBe(1000);
    });

    it('should indicate hasMore=true when more pages available', () => {
      const result: PaginatedResult<{ id: number }> = {
        items: Array(20)
          .fill(null)
          .map((_, i) => ({ id: i + 1 })),
        nextCursor: 'next-page-cursor',
        prevCursor: undefined,
        hasMore: true,
        pageSize: 20,
        totalReturned: 20,
      };

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should indicate hasMore=false on last page', () => {
      const result: PaginatedResult<{ id: number }> = {
        items: [{ id: 1 }, { id: 2 }], // Less than page size
        nextCursor: undefined,
        prevCursor: 'prev-page-cursor',
        hasMore: false,
        pageSize: 20,
        totalReturned: 2,
      };

      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe('Cursor Encoding/Decoding', () => {
    it('should encode cursor as base64', () => {
      // Simulate cursor generation
      const rowid = 12345;
      const timestamp = Date.now();
      const cursorData = `${rowid}:${timestamp}`;
      const cursor = Buffer.from(cursorData).toString('base64');

      expect(cursor).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should decode cursor from base64', () => {
      const rowid = 12345;
      const timestamp = 1234567890;
      const cursorData = `${rowid}:${timestamp}`;
      const cursor = Buffer.from(cursorData).toString('base64');

      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [decodedRowid, decodedTimestamp] = decoded.split(':');

      expect(parseInt(decodedRowid, 10)).toBe(rowid);
      expect(parseInt(decodedTimestamp, 10)).toBe(timestamp);
    });

    it('should handle cursor with special characters after encoding', () => {
      const cursor = Buffer.from('test:data:with:colons').toString('base64');

      expect(() => {
        Buffer.from(cursor, 'base64').toString('utf-8');
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const result: PaginatedResult<{ id: number }> = {
        items: [],
        nextCursor: undefined,
        prevCursor: undefined,
        hasMore: false,
        pageSize: 20,
        totalReturned: 0,
      };

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle single item', () => {
      const result: PaginatedResult<{ id: number }> = {
        items: [{ id: 1 }],
        nextCursor: undefined,
        prevCursor: undefined,
        hasMore: false,
        pageSize: 20,
        totalReturned: 1,
      };

      expect(result.items).toHaveLength(1);
    });

    it('should handle full page of items', () => {
      const result: PaginatedResult<{ id: number }> = {
        items: Array(20)
          .fill(null)
          .map((_, i) => ({ id: i + 1 })),
        nextCursor: 'next',
        prevCursor: 'prev',
        hasMore: true,
        pageSize: 20,
        totalReturned: 20,
      };

      expect(result.items).toHaveLength(20);
      expect(result.items.length).toBe(result.pageSize);
    });
  });
});
