import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Debug CasesView setup', () => {
  beforeEach(() => {
    localStorage.setItem('sessionId', 'test-session-123');
    vi.clearAllMocks();
  });

  it('should have sessionId', () => {
    console.log('localStorage.getItem("sessionId"):', localStorage.getItem('sessionId'));
    console.log('window.justiceAPI.getSession:', typeof window.justiceAPI.getSession);
    expect(localStorage.getItem('sessionId')).toBe('test-session-123');
    expect(window.justiceAPI.getSession).toBeDefined();
  });
});
