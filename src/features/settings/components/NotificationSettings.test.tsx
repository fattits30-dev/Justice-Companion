/**
 * NotificationSettings Component Tests
 *
 * Tests for the extracted NotificationSettings component including:
 * - Loading settings from localStorage
 * - Toggling notification settings
 * - Persisting changes to localStorage
 * - Default values when localStorage is empty
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSettings } from './NotificationSettings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('NotificationSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial Load', () => {
    it('should load default notification settings when localStorage is empty', () => {
      render(<NotificationSettings />);

      // Chat notifications should default to enabled (true)
      const chatToggle = screen.getByLabelText(/toggle chat notifications/i);
      expect(chatToggle).toHaveAttribute('aria-pressed', 'true');

      // Case updates should default to enabled (true)
      const caseToggle = screen.getByLabelText(/toggle case updates/i);
      expect(caseToggle).toHaveAttribute('aria-pressed', 'true');

      // Document analysis should default to disabled (false)
      const docToggle = screen.getByLabelText(/toggle document analysis complete/i);
      expect(docToggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('should load saved notification settings from localStorage', () => {
      // Set up localStorage with saved settings
      localStorage.setItem('chatNotifications', 'false');
      localStorage.setItem('caseUpdates', 'true');
      localStorage.setItem('documentAnalysisNotif', 'true');

      render(<NotificationSettings />);

      const chatToggle = screen.getByLabelText(/toggle chat notifications/i);
      expect(chatToggle).toHaveAttribute('aria-pressed', 'false');

      const caseToggle = screen.getByLabelText(/toggle case updates/i);
      expect(caseToggle).toHaveAttribute('aria-pressed', 'true');

      const docToggle = screen.getByLabelText(/toggle document analysis complete/i);
      expect(docToggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('should display all notification options', () => {
      render(<NotificationSettings />);

      expect(screen.getByText('Chat notifications')).toBeInTheDocument();
      expect(screen.getByText('Case updates')).toBeInTheDocument();
      expect(screen.getByText('Document analysis complete')).toBeInTheDocument();
    });
  });

  describe('Toggling Notifications', () => {
    it('should toggle chat notifications on and off', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);

      const chatToggle = screen.getByLabelText(/toggle chat notifications/i);

      // Initially enabled (true)
      expect(chatToggle).toHaveAttribute('aria-pressed', 'true');

      // Click to disable
      await user.click(chatToggle);
      await waitFor(() => {
        expect(chatToggle).toHaveAttribute('aria-pressed', 'false');
      });

      // Click to enable again
      await user.click(chatToggle);
      await waitFor(() => {
        expect(chatToggle).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should toggle case updates on and off', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);

      const caseToggle = screen.getByLabelText(/toggle case updates/i);

      // Initially enabled (true)
      expect(caseToggle).toHaveAttribute('aria-pressed', 'true');

      // Click to disable
      await user.click(caseToggle);
      await waitFor(() => {
        expect(caseToggle).toHaveAttribute('aria-pressed', 'false');
      });

      // Click to enable again
      await user.click(caseToggle);
      await waitFor(() => {
        expect(caseToggle).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should toggle document analysis notifications on and off', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);

      const docToggle = screen.getByLabelText(/toggle document analysis complete/i);

      // Initially disabled (false)
      expect(docToggle).toHaveAttribute('aria-pressed', 'false');

      // Click to enable
      await user.click(docToggle);
      await waitFor(() => {
        expect(docToggle).toHaveAttribute('aria-pressed', 'true');
      });

      // Click to disable again
      await user.click(docToggle);
      await waitFor(() => {
        expect(docToggle).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist chat notifications to localStorage', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);

      const chatToggle = screen.getByLabelText(/toggle chat notifications/i);

      // Toggle off
      await user.click(chatToggle);
      await waitFor(() => {
        expect(localStorage.getItem('chatNotifications')).toBe('false');
      });

      // Toggle back on
      await user.click(chatToggle);
      await waitFor(() => {
        expect(localStorage.getItem('chatNotifications')).toBe('true');
      });
    });

    it('should persist case updates to localStorage', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);

      const caseToggle = screen.getByLabelText(/toggle case updates/i);

      // Toggle off
      await user.click(caseToggle);
      await waitFor(() => {
        expect(localStorage.getItem('caseUpdates')).toBe('false');
      });

      // Toggle back on
      await user.click(caseToggle);
      await waitFor(() => {
        expect(localStorage.getItem('caseUpdates')).toBe('true');
      });
    });

    it('should persist document analysis notifications to localStorage', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);

      const docToggle = screen.getByLabelText(/toggle document analysis complete/i);

      // Toggle on
      await user.click(docToggle);
      await waitFor(() => {
        expect(localStorage.getItem('documentAnalysisNotif')).toBe('true');
      });

      // Toggle back off
      await user.click(docToggle);
      await waitFor(() => {
        expect(localStorage.getItem('documentAnalysisNotif')).toBe('false');
      });
    });
  });
});
