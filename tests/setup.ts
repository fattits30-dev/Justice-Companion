/**
 * Test Setup - Global Test Configuration
 *
 * This file runs before all tests to:
 * - Configure Vitest + React Testing Library
 * - Mock window.justiceAPI (Electron IPC bridge)
 * - Setup global test utilities
 */

import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Cleanup after each test
 */
afterEach(() => {
  cleanup();
});

/**
 * Mock window.justiceAPI (Electron IPC bridge)
 * All methods return resolved promises by default
 */
beforeEach(() => {
  // @ts-expect-error - Mocking global window object
  global.window.justiceAPI = {
    // Auth
    login: vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: '1', username: 'testuser', email: 'test@example.com' },
        session: { sessionId: 'test-session-id', expiresAt: new Date(Date.now() + 86400000) }
      }
    }),
    register: vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: '1', username: 'testuser', email: 'test@example.com' }
      }
    }),
    logout: vi.fn().mockResolvedValue({ success: true }),
    getSession: vi.fn().mockResolvedValue({
      success: true,
      data: { userId: '1', username: 'testuser', email: 'test@example.com' }
    }),

    // Cases
    createCase: vi.fn().mockResolvedValue({
      success: true,
      data: { id: '1', title: 'Test Case', status: 'open' }
    }),
    getCases: vi.fn().mockResolvedValue({
      success: true,
      data: []
    }),
    getCase: vi.fn().mockResolvedValue({
      success: true,
      data: { id: '1', title: 'Test Case', status: 'open' }
    }),
    updateCase: vi.fn().mockResolvedValue({ success: true }),
    deleteCase: vi.fn().mockResolvedValue({ success: true }),

    // Chat
    chatSend: vi.fn().mockResolvedValue({
      success: true,
      data: { response: 'AI response text' }
    }),
    onAIStreamToken: vi.fn().mockReturnValue(() => {}),
    onAIStreamThinkToken: vi.fn().mockReturnValue(() => {}),
    onAIStreamSources: vi.fn().mockReturnValue(() => {}),

    // AI Configuration
    configureAI: vi.fn().mockResolvedValue({ success: true }),
    testAIConnection: vi.fn().mockResolvedValue({
      success: true,
      connected: true,
      message: 'Connected successfully'
    }),

    // Evidence/Documents
    createEvidence: vi.fn().mockResolvedValue({
      success: true,
      data: { id: '1', fileName: 'test.pdf' }
    }),
    getEvidenceById: vi.fn().mockResolvedValue({
      success: true,
      data: { id: '1', fileName: 'test.pdf' }
    }),

    // Notes
    createNote: vi.fn().mockResolvedValue({
      success: true,
      data: { id: '1', content: 'Test note' }
    }),

    // GDPR
    exportUserData: vi.fn().mockResolvedValue({
      success: true,
      data: { exportPath: '/path/to/export.json' }
    }),
    deleteUserData: vi.fn().mockResolvedValue({ success: true }),

    // Consent
    grantConsent: vi.fn().mockResolvedValue({ success: true }),
    getUserConsents: vi.fn().mockResolvedValue({
      success: true,
      data: []
    }),

    // SecureStorage
    secureStorage: {
      isEncryptionAvailable: vi.fn().mockResolvedValue(true),
      set: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue('encrypted-value'),
      delete: vi.fn().mockResolvedValue(true),
      clearAll: vi.fn().mockResolvedValue(true)
    },

    // UI
    logUIError: vi.fn().mockResolvedValue({ success: true }),

    // Database
    runMigrations: vi.fn().mockResolvedValue({ success: true }),
    backupDatabase: vi.fn().mockResolvedValue({ success: true }),
    getDatabaseStatus: vi.fn().mockResolvedValue({
      success: true,
      data: { connected: true, version: '1.0.0' }
    }),

    // Placeholder methods (return not implemented)
    changePassword: vi.fn().mockRejectedValue(new Error('Not implemented')),
    checkAIStatus: vi.fn().mockResolvedValue({
      success: true,
      connected: false,
      data: { message: 'AI service integration pending' }
    }),
    deleteConversation: vi.fn().mockRejectedValue(new Error('Not implemented')),
    downloadFile: vi.fn().mockRejectedValue(new Error('Not implemented')),
    getAllConversations: vi.fn().mockResolvedValue({
      success: true,
      data: []
    }),
    getCaseFacts: vi.fn().mockRejectedValue(new Error('Not implemented')),
    getCasesByStatusPaginated: vi.fn().mockRejectedValue(new Error('Not implemented')),
    getCasesByUserPaginated: vi.fn().mockRejectedValue(new Error('Not implemented')),
    getCaseStatistics: vi.fn().mockRejectedValue(new Error('Not implemented')),
    getFacts: vi.fn().mockRejectedValue(new Error('Not implemented')),
    getRecentConversations: vi.fn().mockRejectedValue(new Error('Not implemented')),
    getUserProfile: vi.fn().mockResolvedValue({
      success: true,
      data: null
    }),
    onAIStatusUpdate: vi.fn().mockReturnValue(() => {}),
    printFile: vi.fn().mockRejectedValue(new Error('Not implemented')),
    revokeConsent: vi.fn().mockRejectedValue(new Error('Not implemented'))
  };
});

/**
 * Global test utilities
 */
export const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com'
};

export const mockSession = {
  sessionId: 'test-session-id',
  userId: '1',
  expiresAt: new Date(Date.now() + 86400000)
};

export const mockCase = {
  id: '1',
  userId: '1',
  title: 'Test Case',
  type: 'criminal',
  status: 'open' as const,
  description: 'Test case description',
  createdAt: new Date(),
  updatedAt: new Date()
};
