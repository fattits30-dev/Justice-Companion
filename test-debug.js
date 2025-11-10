import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Debug localStorage', () => {
  beforeEach(() => {
    console.log('[DEBUG] Before setting sessionId, localStorage:', window.localStorage);
    localStorage.setItem('sessionId', 'test-session-123');
    console.log('[DEBUG] After setting sessionId:', localStorage.getItem('sessionId'));
    vi.clearAllMocks();
  });

  it('should have sessionId in localStorage', () => {
    const sessionId = localStorage.getItem('sessionId');
    console.log('[DEBUG] In test, sessionId:', sessionId);
    expect(sessionId).toBe('test-session-123');
  });
});
