/// <reference types="vitest/globals" />
import { ErrorLogger } from "./error-logger.ts";
import fs from "fs";
import path from "path";
describe("ErrorLogger", () => {
    const testLogDir = "logs-test-js"; // Use unique directory to avoid conflicts with .ts version
    const testLogFile = "test-errors.log";
    let logger;
    beforeEach(() => {
        // Create fresh logger for each test
        logger = new ErrorLogger(testLogDir, testLogFile, 1, 2); // 1KB max, 2 backups
    });
    afterEach(async () => {
        // Ensure any pending writes complete before cleanup
        await logger.waitForFlush();
        await logger.clearLogs();
        if (fs.existsSync(testLogDir)) {
            fs.rmSync(testLogDir, { recursive: true });
        }
    });
    test("should create log directory if it does not exist", () => {
        expect(fs.existsSync(testLogDir)).toBe(true);
    });
    test("should log error to file", async () => {
        const error = new Error("Test error");
        logger.logError(error);
        await logger.waitForFlush();
        const logPath = path.join(testLogDir, testLogFile);
        expect(fs.existsSync(logPath)).toBe(true);
        const content = fs.readFileSync(logPath, "utf8");
        expect(content).toContain("Test error");
        expect(content).toContain("Error:");
    });
    test("should log string error", async () => {
        logger.logError("Simple error message");
        await logger.waitForFlush();
        const logPath = path.join(testLogDir, testLogFile);
        const content = fs.readFileSync(logPath, "utf8");
        expect(content).toContain("Simple error message");
    });
    test("should include context in log", async () => {
        logger.logError("Error with context", { userId: 123, action: "save" });
        await logger.waitForFlush();
        const logPath = path.join(testLogDir, testLogFile);
        const content = fs.readFileSync(logPath, "utf8");
        expect(content).toContain("Context:");
        expect(content).toContain("userId");
        expect(content).toContain("123");
    });
    test("should rotate log file when exceeding max size", async () => {
        // Write enough data to exceed 1KB
        for (let i = 0; i < 50; i++) {
            logger.logError(`Error ${i} with some padding text to increase size`);
        }
        await logger.waitForFlush();
        const logPath = path.join(testLogDir, testLogFile);
        const backupPath = `${logPath}.1`;
        // Should have rotated
        expect(fs.existsSync(backupPath)).toBe(true);
        // Current log should be smaller than max
        expect(await logger.getLogSizeKB()).toBeLessThan(1);
    });
    test("should read recent errors", async () => {
        logger.logError("Error 1");
        logger.logError("Error 2");
        logger.logError("Error 3");
        await logger.waitForFlush();
        const recent = await logger.readRecentErrors(2);
        expect(recent.length).toBeGreaterThan(0);
        expect(recent.join("\n")).toContain("Error 3");
    });
    test("should clear all logs", async () => {
        logger.logError("Error 1");
        logger.logError("Error 2");
        await logger.waitForFlush();
        await logger.clearLogs();
        const logPath = path.join(testLogDir, testLogFile);
        expect(fs.existsSync(logPath)).toBe(false);
    });
    test("should maintain max number of backups", async () => {
        // Write enough to trigger multiple rotations
        for (let i = 0; i < 150; i++) {
            logger.logError(`Error ${i} with padding text to increase file size quickly`);
        }
        await logger.waitForFlush();
        const logPath = path.join(testLogDir, testLogFile);
        // Should have backup .1 and .2 (max 2 backups)
        expect(fs.existsSync(`${logPath}.1`)).toBe(true);
        expect(fs.existsSync(`${logPath}.2`)).toBe(true);
        // Should NOT have .3 (exceeds max backups)
        expect(fs.existsSync(`${logPath}.3`)).toBe(false);
    });
});
