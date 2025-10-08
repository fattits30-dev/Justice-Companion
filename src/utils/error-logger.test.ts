/// <reference types="vitest/globals" />

import { ErrorLogger } from './error-logger';
import fs from 'fs';
import path from 'path';

describe('ErrorLogger', () => {
  const testLogDir = 'logs-test';
  const testLogFile = 'test-errors.log';
  let logger: ErrorLogger;

  beforeEach(() => {
    // Create fresh logger for each test
    logger = new ErrorLogger(testLogDir, testLogFile, 1, 2); // 1KB max, 2 backups
  });

  afterEach(() => {
    // Clean up test files
    logger.clearLogs();
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true });
    }
  });

  test('should create log directory if it does not exist', () => {
    expect(fs.existsSync(testLogDir)).toBe(true);
  });

  test('should log error to file', () => {
    const error = new Error('Test error');
    logger.logError(error);

    const logPath = path.join(testLogDir, testLogFile);
    expect(fs.existsSync(logPath)).toBe(true);

    const content = fs.readFileSync(logPath, 'utf8');
    expect(content).toContain('Test error');
    expect(content).toContain('Error:');
  });

  test('should log string error', () => {
    logger.logError('Simple error message');

    const logPath = path.join(testLogDir, testLogFile);
    const content = fs.readFileSync(logPath, 'utf8');
    expect(content).toContain('Simple error message');
  });

  test('should include context in log', () => {
    logger.logError('Error with context', { userId: 123, action: 'save' });

    const logPath = path.join(testLogDir, testLogFile);
    const content = fs.readFileSync(logPath, 'utf8');
    expect(content).toContain('Context:');
    expect(content).toContain('userId');
    expect(content).toContain('123');
  });

  test('should rotate log file when exceeding max size', () => {
    // Write enough data to exceed 1KB
    for (let i = 0; i < 50; i++) {
      logger.logError(`Error ${i} with some padding text to increase size`);
    }

    const logPath = path.join(testLogDir, testLogFile);
    const backupPath = `${logPath}.1`;

    // Should have rotated
    expect(fs.existsSync(backupPath)).toBe(true);

    // Current log should be smaller than max
    expect(logger.getLogSizeKB()).toBeLessThan(1);
  });

  test('should read recent errors', () => {
    logger.logError('Error 1');
    logger.logError('Error 2');
    logger.logError('Error 3');

    const recent = logger.readRecentErrors(2);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent.join('\n')).toContain('Error 3');
  });

  test('should clear all logs', () => {
    logger.logError('Error 1');
    logger.logError('Error 2');

    logger.clearLogs();

    const logPath = path.join(testLogDir, testLogFile);
    expect(fs.existsSync(logPath)).toBe(false);
  });

  test('should maintain max number of backups', () => {
    // Write enough to trigger multiple rotations
    for (let i = 0; i < 150; i++) {
      logger.logError(`Error ${i} with padding text to increase file size quickly`);
    }

    const logPath = path.join(testLogDir, testLogFile);

    // Should have backup .1 and .2 (max 2 backups)
    expect(fs.existsSync(`${logPath}.1`)).toBe(true);
    expect(fs.existsSync(`${logPath}.2`)).toBe(true);

    // Should NOT have .3 (exceeds max backups)
    expect(fs.existsSync(`${logPath}.3`)).toBe(false);
  });
});
