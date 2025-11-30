/**
 * Cursor Pagination Utility Tests
 *
 * Comprehensive test coverage for cursor encoding/decoding, validation,
 * and WHERE clause generation for pagination queries.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { encodeSimpleCursor, decodeSimpleCursor, encodeCompositeCursor, decodeCompositeCursor, isSimpleCursor, isCompositeCursor, buildSimpleWhereClause, buildCompositeWhereClause, reverseDirection, getPrevCursor, getNextCursor, isCursorStale, getCursorAge, CursorError, MAX_CURSOR_AGE_MS, } from "./cursor-pagination.ts";
describe("Cursor Pagination Utilities", () => {
    let mockNow;
    beforeEach(() => {
        mockNow = 1734712800000; // Fixed timestamp: 2025-10-20 12:00:00 GMT
        vi.useFakeTimers();
        vi.setSystemTime(mockNow);
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    describe("encodeSimpleCursor", () => {
        it("should encode rowid-only cursor", () => {
            const cursor = encodeSimpleCursor(123);
            expect(cursor).toBe(Buffer.from(JSON.stringify({ rowid: 123, timestamp: mockNow })).toString("base64"));
        });
        it("should encode cursor with custom timestamp", () => {
            const customTimestamp = 1234567890000;
            const cursor = encodeSimpleCursor(456, customTimestamp);
            const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
            expect(decoded).toEqual({ rowid: 456, timestamp: customTimestamp });
        });
        it("should throw error for invalid rowid (negative)", () => {
            expect(() => encodeSimpleCursor(-1)).toThrow(CursorError);
            expect(() => encodeSimpleCursor(-1)).toThrow("Invalid rowid: -1");
        });
        it("should throw error for invalid rowid (zero)", () => {
            expect(() => encodeSimpleCursor(0)).toThrow(CursorError);
        });
        it("should throw error for non-integer rowid", () => {
            expect(() => encodeSimpleCursor(123.45)).toThrow(CursorError);
        });
        it("should encode large rowid values", () => {
            const largeRowid = 999999999;
            const cursor = encodeSimpleCursor(largeRowid);
            const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
            expect(decoded.rowid).toBe(largeRowid);
        });
    });
    describe("decodeSimpleCursor", () => {
        it("should decode valid cursor", () => {
            const encoded = encodeSimpleCursor(123);
            const cursor = decodeSimpleCursor(encoded);
            expect(cursor).toEqual({ rowid: 123, timestamp: mockNow });
        });
        it("should decode cursor with custom timestamp", () => {
            const customTimestamp = 1234567890000;
            const encoded = encodeSimpleCursor(456, customTimestamp);
            const cursor = decodeSimpleCursor(encoded);
            expect(cursor).toEqual({ rowid: 456, timestamp: customTimestamp });
        });
        it("should throw error for empty cursor", () => {
            expect(() => decodeSimpleCursor("")).toThrow(CursorError);
            expect(() => decodeSimpleCursor("")).toThrow("Empty cursor string");
        });
        it("should throw error for invalid base64", () => {
            expect(() => decodeSimpleCursor("not-valid-base64!!!")).toThrow(CursorError);
            expect(() => decodeSimpleCursor("not-valid-base64!!!")).toThrow("Invalid JSON in cursor");
        });
        it("should throw error for invalid JSON", () => {
            const invalidJson = Buffer.from("{invalid-json}").toString("base64");
            expect(() => decodeSimpleCursor(invalidJson)).toThrow(CursorError);
            expect(() => decodeSimpleCursor(invalidJson)).toThrow("Invalid JSON in cursor");
        });
        it("should throw error for missing rowid", () => {
            const invalidCursor = Buffer.from(JSON.stringify({ timestamp: mockNow })).toString("base64");
            expect(() => decodeSimpleCursor(invalidCursor)).toThrow(CursorError);
            expect(() => decodeSimpleCursor(invalidCursor)).toThrow("Invalid cursor structure");
        });
        it("should throw error for non-integer rowid", () => {
            const invalidCursor = Buffer.from(JSON.stringify({ rowid: 123.45, timestamp: mockNow })).toString("base64");
            expect(() => decodeSimpleCursor(invalidCursor)).toThrow(CursorError);
        });
        it("should throw error for extra properties", () => {
            const invalidCursor = Buffer.from(JSON.stringify({ rowid: 123, timestamp: mockNow, extra: "data" })).toString("base64");
            expect(() => decodeSimpleCursor(invalidCursor)).toThrow(CursorError);
        });
        it("should validate cursor age when requested", () => {
            const oldTimestamp = mockNow - (MAX_CURSOR_AGE_MS + 1000);
            const encoded = encodeSimpleCursor(123, oldTimestamp);
            expect(() => decodeSimpleCursor(encoded, { validateAge: true })).toThrow(CursorError);
            expect(() => decodeSimpleCursor(encoded, { validateAge: true })).toThrow("Cursor expired");
        });
        it("should not validate cursor age by default", () => {
            const oldTimestamp = mockNow - (MAX_CURSOR_AGE_MS + 1000);
            const encoded = encodeSimpleCursor(123, oldTimestamp);
            expect(() => decodeSimpleCursor(encoded)).not.toThrow();
        });
        it("should accept fresh cursor when validating age", () => {
            const freshTimestamp = mockNow - 1000; // 1 second old
            const encoded = encodeSimpleCursor(123, freshTimestamp);
            expect(() => decodeSimpleCursor(encoded, { validateAge: true })).not.toThrow();
        });
        it('should handle backward compatibility with old format "rowid:timestamp"', () => {
            const oldFormatCursor = Buffer.from("123:1734712800000").toString("base64");
            const cursor = decodeSimpleCursor(oldFormatCursor);
            expect(cursor).toEqual({ rowid: 123, timestamp: 1734712800000 });
        });
        it("should reject invalid old format", () => {
            const invalidOldFormat = Buffer.from("not-a-number:123").toString("base64");
            expect(() => decodeSimpleCursor(invalidOldFormat)).toThrow(CursorError);
        });
    });
    describe("encodeCompositeCursor", () => {
        it("should encode composite cursor with single key", () => {
            const cursor = encodeCompositeCursor({ eventDate: "2025-10-20" });
            const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
            expect(decoded).toEqual({
                keys: { eventDate: "2025-10-20" },
                timestamp: mockNow,
            });
        });
        it("should encode composite cursor with multiple keys", () => {
            const cursor = encodeCompositeCursor({
                eventDate: "2025-10-20",
                id: 123,
            });
            const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
            expect(decoded).toEqual({
                keys: { eventDate: "2025-10-20", id: 123 },
                timestamp: mockNow,
            });
        });
        it("should encode cursor with null values", () => {
            const cursor = encodeCompositeCursor({ optionalField: null, id: 123 });
            const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
            expect(decoded.keys.optionalField).toBeNull();
        });
        it("should encode cursor with custom timestamp", () => {
            const customTimestamp = 1234567890000;
            const cursor = encodeCompositeCursor({ id: 123 }, customTimestamp);
            const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
            expect(decoded.timestamp).toBe(customTimestamp);
        });
        it("should throw error for empty keys", () => {
            expect(() => encodeCompositeCursor({})).toThrow(CursorError);
            expect(() => encodeCompositeCursor({})).toThrow("Composite cursor keys cannot be empty");
        });
    });
    describe("decodeCompositeCursor", () => {
        it("should decode valid composite cursor", () => {
            const encoded = encodeCompositeCursor({
                eventDate: "2025-10-20",
                id: 123,
            });
            const cursor = decodeCompositeCursor(encoded);
            expect(cursor).toEqual({
                keys: { eventDate: "2025-10-20", id: 123 },
                timestamp: mockNow,
            });
        });
        it("should decode cursor with null values", () => {
            const encoded = encodeCompositeCursor({ optionalField: null, id: 123 });
            const cursor = decodeCompositeCursor(encoded);
            expect(cursor.keys.optionalField).toBeNull();
        });
        it("should throw error for empty cursor", () => {
            expect(() => decodeCompositeCursor("")).toThrow(CursorError);
        });
        it("should throw error for invalid base64", () => {
            expect(() => decodeCompositeCursor("invalid!!!")).toThrow(CursorError);
        });
        it("should throw error for missing keys", () => {
            const invalidCursor = Buffer.from(JSON.stringify({ timestamp: mockNow })).toString("base64");
            expect(() => decodeCompositeCursor(invalidCursor)).toThrow(CursorError);
        });
        it("should throw error for empty keys object", () => {
            const invalidCursor = Buffer.from(JSON.stringify({ keys: {}, timestamp: mockNow })).toString("base64");
            expect(() => decodeCompositeCursor(invalidCursor)).toThrow(CursorError);
        });
        it("should throw error for invalid key values (boolean)", () => {
            const invalidCursor = Buffer.from(JSON.stringify({ keys: { invalid: true }, timestamp: mockNow })).toString("base64");
            expect(() => decodeCompositeCursor(invalidCursor)).toThrow(CursorError);
        });
        it("should throw error for invalid key values (object)", () => {
            const invalidCursor = Buffer.from(JSON.stringify({
                keys: { invalid: { nested: "object" } },
                timestamp: mockNow,
            })).toString("base64");
            expect(() => decodeCompositeCursor(invalidCursor)).toThrow(CursorError);
        });
        it("should validate cursor age when requested", () => {
            const oldTimestamp = mockNow - (MAX_CURSOR_AGE_MS + 1000);
            const encoded = encodeCompositeCursor({ id: 123 }, oldTimestamp);
            expect(() => decodeCompositeCursor(encoded, { validateAge: true })).toThrow(CursorError);
        });
        it("should not validate cursor age by default", () => {
            const oldTimestamp = mockNow - (MAX_CURSOR_AGE_MS + 1000);
            const encoded = encodeCompositeCursor({ id: 123 }, oldTimestamp);
            expect(() => decodeCompositeCursor(encoded)).not.toThrow();
        });
    });
    describe("Type Guards", () => {
        describe("isSimpleCursor", () => {
            it("should return true for valid SimpleCursor", () => {
                const cursor = { rowid: 123, timestamp: mockNow };
                expect(isSimpleCursor(cursor)).toBe(true);
            });
            it("should return true for SimpleCursor without timestamp", () => {
                const cursor = { rowid: 123 };
                expect(isSimpleCursor(cursor)).toBe(true);
            });
            it("should return false for null", () => {
                expect(isSimpleCursor(null)).toBe(false);
            });
            it("should return false for non-object", () => {
                expect(isSimpleCursor("not an object")).toBe(false);
                expect(isSimpleCursor(123)).toBe(false);
            });
            it("should return false for missing rowid", () => {
                expect(isSimpleCursor({ timestamp: mockNow })).toBe(false);
            });
            it("should return false for non-integer rowid", () => {
                expect(isSimpleCursor({ rowid: 123.45, timestamp: mockNow })).toBe(false);
            });
            it("should return false for negative rowid", () => {
                expect(isSimpleCursor({ rowid: -1, timestamp: mockNow })).toBe(false);
            });
            it("should return false for zero rowid", () => {
                expect(isSimpleCursor({ rowid: 0, timestamp: mockNow })).toBe(false);
            });
            it("should return false for extra properties", () => {
                expect(isSimpleCursor({ rowid: 123, timestamp: mockNow, extra: "data" })).toBe(false);
            });
            it("should return false for CompositeCursor", () => {
                const cursor = {
                    keys: { id: 123 },
                    timestamp: mockNow,
                };
                expect(isSimpleCursor(cursor)).toBe(false);
            });
        });
        describe("isCompositeCursor", () => {
            it("should return true for valid CompositeCursor", () => {
                const cursor = {
                    keys: { id: 123 },
                    timestamp: mockNow,
                };
                expect(isCompositeCursor(cursor)).toBe(true);
            });
            it("should return true for CompositeCursor without timestamp", () => {
                const cursor = { keys: { id: 123 } };
                expect(isCompositeCursor(cursor)).toBe(true);
            });
            it("should return true for cursor with null values", () => {
                const cursor = {
                    keys: { optional: null, id: 123 },
                    timestamp: mockNow,
                };
                expect(isCompositeCursor(cursor)).toBe(true);
            });
            it("should return false for null", () => {
                expect(isCompositeCursor(null)).toBe(false);
            });
            it("should return false for missing keys", () => {
                expect(isCompositeCursor({ timestamp: mockNow })).toBe(false);
            });
            it("should return false for empty keys object", () => {
                expect(isCompositeCursor({ keys: {}, timestamp: mockNow })).toBe(false);
            });
            it("should return false for array keys", () => {
                expect(isCompositeCursor({ keys: [123], timestamp: mockNow })).toBe(false);
            });
            it("should return false for invalid key values", () => {
                expect(isCompositeCursor({ keys: { invalid: true }, timestamp: mockNow })).toBe(false);
                expect(isCompositeCursor({
                    keys: { invalid: { nested: "object" } },
                    timestamp: mockNow,
                })).toBe(false);
            });
            it("should return false for extra properties", () => {
                expect(isCompositeCursor({
                    keys: { id: 123 },
                    timestamp: mockNow,
                    extra: "data",
                })).toBe(false);
            });
            it("should return false for SimpleCursor", () => {
                const cursor = { rowid: 123, timestamp: mockNow };
                expect(isCompositeCursor(cursor)).toBe(false);
            });
        });
    });
    describe("buildSimpleWhereClause", () => {
        it("should build WHERE clause for descending pagination", () => {
            const cursor = { rowid: 123 };
            const { clause, params } = buildSimpleWhereClause(cursor, "desc");
            expect(clause).toBe("rowid < ?");
            expect(params).toEqual([123]);
        });
        it("should build WHERE clause for ascending pagination", () => {
            const cursor = { rowid: 456 };
            const { clause, params } = buildSimpleWhereClause(cursor, "asc");
            expect(clause).toBe("rowid > ?");
            expect(params).toEqual([456]);
        });
        it("should handle large rowid values", () => {
            const cursor = { rowid: 999999999 };
            const { clause: _clause, params } = buildSimpleWhereClause(cursor, "desc");
            expect(params).toEqual([999999999]);
        });
    });
    describe("buildCompositeWhereClause", () => {
        it("should build WHERE clause for single column", () => {
            const cursor = { keys: { event_date: "2025-10-20" } };
            const { clause, params } = buildCompositeWhereClause(cursor, ["event_date"], "desc");
            expect(clause).toBe("event_date < ?");
            expect(params).toEqual(["2025-10-20"]);
        });
        it("should build WHERE clause for two columns (DESC)", () => {
            const cursor = {
                keys: { event_date: "2025-10-20", id: 123 },
            };
            const { clause, params } = buildCompositeWhereClause(cursor, ["event_date", "id"], "desc");
            // Expected: (event_date < ? OR (event_date = ? AND id < ?))
            expect(clause).toBe("(event_date < ? OR (event_date = ? AND id < ?))");
            expect(params).toEqual(["2025-10-20", "2025-10-20", 123]);
        });
        it("should build WHERE clause for two columns (ASC)", () => {
            const cursor = {
                keys: { event_date: "2025-10-20", id: 123 },
            };
            const { clause, params } = buildCompositeWhereClause(cursor, ["event_date", "id"], "asc");
            // Expected: (event_date > ? OR (event_date = ? AND id > ?))
            expect(clause).toBe("(event_date > ? OR (event_date = ? AND id > ?))");
            expect(params).toEqual(["2025-10-20", "2025-10-20", 123]);
        });
        it("should build WHERE clause for three columns", () => {
            const cursor = {
                keys: { year: 2025, month: 10, id: 123 },
            };
            const { clause, params } = buildCompositeWhereClause(cursor, ["year", "month", "id"], "desc");
            // Expected: (year < ? OR (year = ? AND month < ?) OR (year = ? AND month = ? AND id < ?))
            expect(clause).toBe("(year < ? OR (year = ? AND month < ?) OR (year = ? AND month = ? AND id < ?))");
            expect(params).toEqual([2025, 2025, 10, 2025, 10, 123]);
        });
        it("should handle null values in cursor", () => {
            const cursor = {
                keys: { optional_field: null, id: 123 },
            };
            const { clause, params } = buildCompositeWhereClause(cursor, ["optional_field", "id"], "desc");
            expect(clause).toBe("(optional_field < ? OR (optional_field = ? AND id < ?))");
            expect(params).toEqual([null, null, 123]);
        });
        it("should throw error for empty columns array", () => {
            const cursor = { keys: { id: 123 } };
            expect(() => buildCompositeWhereClause(cursor, [], "desc")).toThrow(CursorError);
            expect(() => buildCompositeWhereClause(cursor, [], "desc")).toThrow("Columns array cannot be empty");
        });
        it("should throw error for missing cursor keys", () => {
            const cursor = { keys: { id: 123 } };
            expect(() => buildCompositeWhereClause(cursor, ["id", "missing_key"], "desc")).toThrow(CursorError);
            expect(() => buildCompositeWhereClause(cursor, ["id", "missing_key"], "desc")).toThrow("Cursor missing keys: missing_key");
        });
    });
    describe("Utility Functions", () => {
        describe("reverseDirection", () => {
            it("should reverse asc to desc", () => {
                expect(reverseDirection("asc")).toBe("desc");
            });
            it("should reverse desc to asc", () => {
                expect(reverseDirection("desc")).toBe("asc");
            });
        });
        describe("getPrevCursor", () => {
            const items = [
                { id: 1, name: "Item 1" },
                { id: 2, name: "Item 2" },
                { id: 3, name: "Item 3" },
            ];
            it("should return cursor for first item", () => {
                const cursor = getPrevCursor(items, (item) => item.id, "desc");
                expect(cursor).toBeDefined();
                const decoded = decodeSimpleCursor(cursor);
                expect(decoded.rowid).toBe(1);
            });
            it("should return undefined for empty array", () => {
                const cursor = getPrevCursor([], (item) => item.id, "desc");
                expect(cursor).toBeUndefined();
            });
        });
        describe("getNextCursor", () => {
            const items = [
                { id: 1, name: "Item 1" },
                { id: 2, name: "Item 2" },
                { id: 3, name: "Item 3" },
            ];
            it("should return cursor for last item", () => {
                const cursor = getNextCursor(items, (item) => item.id, "desc");
                expect(cursor).toBeDefined();
                const decoded = decodeSimpleCursor(cursor);
                expect(decoded.rowid).toBe(3);
            });
            it("should return undefined for empty array", () => {
                const cursor = getNextCursor([], (item) => item.id, "desc");
                expect(cursor).toBeUndefined();
            });
        });
        describe("isCursorStale", () => {
            it("should return false for fresh cursor", () => {
                const cursor = { rowid: 123, timestamp: mockNow - 1000 };
                expect(isCursorStale(cursor)).toBe(false);
            });
            it("should return true for stale cursor", () => {
                const cursor = {
                    rowid: 123,
                    timestamp: mockNow - (MAX_CURSOR_AGE_MS + 1000),
                };
                expect(isCursorStale(cursor)).toBe(true);
            });
            it("should return false for cursor without timestamp", () => {
                const cursor = { rowid: 123 };
                expect(isCursorStale(cursor)).toBe(false);
            });
            it("should work with CompositeCursor", () => {
                const freshCursor = {
                    keys: { id: 123 },
                    timestamp: mockNow - 1000,
                };
                expect(isCursorStale(freshCursor)).toBe(false);
                const staleCursor = {
                    keys: { id: 123 },
                    timestamp: mockNow - (MAX_CURSOR_AGE_MS + 1000),
                };
                expect(isCursorStale(staleCursor)).toBe(true);
            });
        });
        describe("getCursorAge", () => {
            it("should return age in seconds for cursor with timestamp", () => {
                const cursor = { rowid: 123, timestamp: mockNow - 5000 }; // 5 seconds old
                expect(getCursorAge(cursor)).toBe(5);
            });
            it("should return null for cursor without timestamp", () => {
                const cursor = { rowid: 123 };
                expect(getCursorAge(cursor)).toBeNull();
            });
            it("should handle large age values", () => {
                const cursor = {
                    rowid: 123,
                    timestamp: mockNow - 3600000,
                }; // 1 hour old
                expect(getCursorAge(cursor)).toBe(3600);
            });
            it("should work with CompositeCursor", () => {
                const cursor = {
                    keys: { id: 123 },
                    timestamp: mockNow - 10000,
                };
                expect(getCursorAge(cursor)).toBe(10);
            });
        });
    });
    describe("Round-trip Encoding/Decoding", () => {
        it("should encode and decode simple cursor without loss", () => {
            const original = { rowid: 12345, timestamp: mockNow };
            const encoded = encodeSimpleCursor(original.rowid, original.timestamp);
            const decoded = decodeSimpleCursor(encoded);
            expect(decoded).toEqual(original);
        });
        it("should encode and decode composite cursor without loss", () => {
            const original = {
                keys: {
                    eventDate: "2025-10-20",
                    category: "legal",
                    id: 123,
                    optional: null,
                },
                timestamp: mockNow,
            };
            const encoded = encodeCompositeCursor(original.keys, original.timestamp);
            const decoded = decodeCompositeCursor(encoded);
            expect(decoded).toEqual(original);
        });
        it("should handle multiple encode/decode cycles", () => {
            let cursor = encodeSimpleCursor(999);
            for (let i = 0; i < 5; i++) {
                const decoded = decodeSimpleCursor(cursor);
                cursor = encodeSimpleCursor(decoded.rowid, decoded.timestamp);
            }
            const final = decodeSimpleCursor(cursor);
            expect(final.rowid).toBe(999);
        });
    });
    describe("Edge Cases", () => {
        it("should handle extremely large rowid values", () => {
            const largeRowid = Number.MAX_SAFE_INTEGER;
            const cursor = encodeSimpleCursor(largeRowid);
            const decoded = decodeSimpleCursor(cursor);
            expect(decoded.rowid).toBe(largeRowid);
        });
        it("should handle Unicode characters in composite cursor keys", () => {
            const cursor = encodeCompositeCursor({ title: "法律案件", id: 123 });
            const decoded = decodeCompositeCursor(cursor);
            expect(decoded.keys.title).toBe("法律案件");
        });
        it("should handle special characters in string values", () => {
            const specialChars = 'Test with "quotes" and \\backslashes\\ and \nnewlines';
            const cursor = encodeCompositeCursor({
                description: specialChars,
                id: 123,
            });
            const decoded = decodeCompositeCursor(cursor);
            expect(decoded.keys.description).toBe(specialChars);
        });
        it("should handle very long composite keys", () => {
            const longKeys = {};
            for (let i = 0; i < 50; i++) {
                longKeys[`key_${i}`] = i;
            }
            const cursor = encodeCompositeCursor(longKeys);
            const decoded = decodeCompositeCursor(cursor);
            expect(Object.keys(decoded.keys).length).toBe(50);
            expect(decoded.keys.key_25).toBe(25);
        });
    });
    describe("Performance Characteristics", () => {
        it("should encode/decode 1000 cursors efficiently", () => {
            const cursors = [];
            // Encode
            for (let i = 1; i <= 1000; i++) {
                cursors.push(encodeSimpleCursor(i));
            }
            // Decode
            for (const cursor of cursors) {
                const decoded = decodeSimpleCursor(cursor);
                expect(decoded.rowid).toBeGreaterThan(0);
            }
            expect(cursors.length).toBe(1000);
        });
        it("should handle large composite cursor keys efficiently", () => {
            const largeKeys = {
                year: 2025,
                month: 10,
                day: 20,
                category: "legal",
                subcategory: "evidence",
                type: "document",
                status: "active",
                priority: "high",
                id: 123456,
            };
            const encoded = encodeCompositeCursor(largeKeys);
            const decoded = decodeCompositeCursor(encoded);
            expect(decoded.keys).toEqual(largeKeys);
        });
    });
});
