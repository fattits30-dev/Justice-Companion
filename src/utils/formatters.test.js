/**
 * Formatters utility tests
 *
 * Tests for formatting functions including dates, file sizes, and text.
 */
import { describe, expect, it, vi } from "vitest";
import { capitalize, formatCurrency, formatDate, formatDateTime, formatDuration, formatFileSize, formatNumber, formatPercentage, formatPhoneNumber, formatRelativeTime, formatTime, toTitleCase, truncate, } from "./formatters";
// Mock Date.now to ensure consistent test results
const mockNow = new Date("2023-12-15T12:00:00Z");
vi.useFakeTimers();
vi.setSystemTime(mockNow);
describe("formatters", () => {
    describe("formatRelativeTime", () => {
        it("should return 'Just now' for very recent dates", () => {
            const recentDate = new Date(mockNow.getTime() - 5000); // 5 seconds ago
            expect(formatRelativeTime(recentDate)).toBe("Just now");
        });
        it("should format seconds correctly", () => {
            const date = new Date(mockNow.getTime() - 30000); // 30 seconds ago
            expect(formatRelativeTime(date)).toBe("30 seconds ago");
        });
        it("should roll over to hours after 60 minutes", () => {
            const date = new Date(mockNow.getTime() - 3600000); // 60 minutes ago = 1 hour ago
            expect(formatRelativeTime(date)).toBe("1 hour ago");
        });
        it("should format hours correctly", () => {
            const date = new Date(mockNow.getTime() - 7200000); // 2 hours ago
            expect(formatRelativeTime(date)).toBe("2 hours ago");
        });
        it("should format days correctly", () => {
            const date = new Date(mockNow.getTime() - 172800000); // 2 days ago
            expect(formatRelativeTime(date)).toBe("2 days ago");
        });
        it("should handle string dates", () => {
            const dateStr = "2023-12-13T12:00:00Z"; // 2 days ago
            expect(formatRelativeTime(dateStr)).toBe("2 days ago");
        });
    });
    describe("formatFileSize", () => {
        it("should return '0 B' for zero bytes", () => {
            expect(formatFileSize(0)).toBe("0 B");
        });
        it("should return 'Invalid size' for negative bytes", () => {
            expect(formatFileSize(-100)).toBe("Invalid size");
        });
        it("should format bytes correctly", () => {
            expect(formatFileSize(500)).toBe("500 B");
        });
        it("should format kilobytes correctly", () => {
            expect(formatFileSize(1536)).toBe("1.5 KB");
        });
        it("should format megabytes correctly", () => {
            expect(formatFileSize(1048576)).toBe("1 MB");
        });
        it("should format gigabytes correctly", () => {
            expect(formatFileSize(1073741824)).toBe("1 GB");
        });
        it("should respect decimal places parameter", () => {
            expect(formatFileSize(1536, 0)).toBe("2 KB");
            expect(formatFileSize(1536, 2)).toBe("1.5 KB");
        });
    });
    describe("formatDate", () => {
        it("should format date string correctly", () => {
            const expected = new Date("2023-12-15").toLocaleDateString();
            expect(formatDate("2023-12-15")).toBe(expected);
        });
        it("should format Date object correctly", () => {
            const date = new Date("2023-12-15");
            expect(formatDate(date)).toBe(date.toLocaleDateString());
        });
        it("should accept format options", () => {
            const options = {
                year: "numeric",
                month: "long",
            };
            expect(formatDate("2023-12-15", options)).toContain("December 2023");
        });
    });
    describe("formatTime", () => {
        it("should format time correctly", () => {
            const date = new Date("2023-12-15T14:30:00");
            const timeString = formatTime(date);
            expect(timeString).toBeTruthy();
            // Time format will vary by locale, just check it contains numbers
            expect(timeString).toMatch(/\d/);
        });
    });
    describe("formatDateTime", () => {
        it("should format date and time correctly", () => {
            const dateTimeString = formatDateTime("2023-12-15T14:30:00");
            expect(dateTimeString).toContain("15 Dec");
            expect(dateTimeString).toContain("14:30");
        });
    });
    describe("formatNumber", () => {
        it("should format numbers with thousand separators", () => {
            expect(formatNumber(1000)).toBe("1,000");
            expect(formatNumber(1234567)).toBe("1,234,567");
        });
    });
    describe("formatDuration", () => {
        it("should format seconds correctly", () => {
            expect(formatDuration(5000)).toBe("5s");
            expect(formatDuration(65000)).toBe("1m 5s");
        });
        it("should format minutes correctly", () => {
            expect(formatDuration(300000)).toBe("5m");
            expect(formatDuration(3900000)).toBe("1h 5m");
        });
        it("should format hours correctly", () => {
            expect(formatDuration(7200000)).toBe("2h");
        });
        it("should format days correctly", () => {
            expect(formatDuration(86400000)).toBe("1d");
        });
    });
    describe("formatPercentage", () => {
        it("should format percentages correctly", () => {
            expect(formatPercentage(85.5)).toBe("86%");
            expect(formatPercentage(85.5, 1)).toBe("85.5%");
            expect(formatPercentage(85.5, 2)).toBe("85.50%");
        });
    });
    describe("truncate", () => {
        it("should not truncate short strings", () => {
            expect(truncate("Short")).toBe("Short");
        });
        it("should truncate long strings with ellipsis", () => {
            expect(truncate("This is a very long string that should be truncated", 20)).toBe("This is a very lo...");
        });
        it("should use default maxLength of 50", () => {
            const longString = "a".repeat(55);
            const truncated = truncate(longString);
            expect(truncated.length).toBeLessThan(55);
            expect(truncated).toMatch(/\.\.\.$/);
        });
    });
    describe("formatCurrency", () => {
        it("should format GBP currency correctly", () => {
            expect(formatCurrency(1250)).toBe("£12.50");
            expect(formatCurrency(100)).toBe("£1.00");
        });
        it("should accept different currency codes", () => {
            expect(formatCurrency(1250, "USD")).toContain("$");
        });
    });
    describe("formatPhoneNumber", () => {
        it("should format UK landline numbers", () => {
            expect(formatPhoneNumber("02012345678")).toBe("020 1234 5678");
        });
        it("should format UK mobile numbers using current pattern", () => {
            expect(formatPhoneNumber("07123456789")).toBe("071 2345 6789");
        });
        it("should return original for unrecognized formats", () => {
            expect(formatPhoneNumber("123456")).toBe("123456");
        });
        it("should handle formatted input", () => {
            expect(formatPhoneNumber("020 1234 5678")).toBe("020 1234 5678");
        });
    });
    describe("capitalize", () => {
        it("should capitalize first letter and lowercase rest", () => {
            expect(capitalize("hello")).toBe("Hello");
            expect(capitalize("HELLO")).toBe("Hello");
            expect(capitalize("hELLO")).toBe("Hello");
        });
        it("should handle empty strings", () => {
            expect(capitalize("")).toBe("");
        });
    });
    describe("toTitleCase", () => {
        it("should convert snake_case to Title Case", () => {
            expect(toTitleCase("hello_world")).toBe("Hello World");
        });
        it("should convert kebab-case to Title Case", () => {
            expect(toTitleCase("hello-world")).toBe("Hello World");
        });
        it("should handle mixed separators", () => {
            expect(toTitleCase("hello_world-test")).toBe("Hello World Test");
        });
    });
});
