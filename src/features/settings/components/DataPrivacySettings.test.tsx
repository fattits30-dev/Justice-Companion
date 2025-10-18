/**
 * DataPrivacySettings Component Tests
 *
 * Tests for the extracted DataPrivacySettings component including:
 * - Loading and displaying privacy settings
 * - Toggling encryption setting
 * - Changing export location and backup frequency
 * - Clear all data functionality with confirmation
 * - GDPR data export functionality
 * - localStorage persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataPrivacySettings } from './DataPrivacySettings';

// Mock justiceAPI
const mockJusticeAPI = {
  getAllCases: vi.fn(),
  deleteCase: vi.fn(),
  getAllConversations: vi.fn(),
  deleteConversation: vi.fn(),
  exportUserData: vi.fn(),
};

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

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

describe('DataPrivacySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (window as any).justiceAPI = mockJusticeAPI;

    // Mock browser APIs for data export
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Set up default successful responses
    mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });
    mockJusticeAPI.getAllConversations.mockResolvedValue({ success: true, data: [] });
    mockJusticeAPI.exportUserData.mockResolvedValue({ success: true, data: {} });
  });

  describe('Initial Load', () => {
    it('should load default privacy settings when localStorage is empty', () => {
      render(<DataPrivacySettings toast={mockToast} />);

      // Encryption should default to enabled (true)
      const encryptToggle = screen.getByLabelText(/toggle encrypt sensitive data/i);
      expect(encryptToggle).toHaveAttribute('aria-pressed', 'true');

      // Should display information items
      expect(screen.getByText(/local data storage/i)).toBeInTheDocument();
      expect(screen.getByText(/database location/i)).toBeInTheDocument();
    });

    it('should load saved privacy settings from localStorage', () => {
      localStorage.setItem('encryptData', JSON.stringify(false));
      localStorage.setItem('exportLocation', JSON.stringify('Custom/Path'));
      localStorage.setItem('autoBackupFrequency', JSON.stringify('weekly'));

      render(<DataPrivacySettings toast={mockToast} />);

      const encryptToggle = screen.getByLabelText(/toggle encrypt sensitive data/i);
      expect(encryptToggle).toHaveAttribute('aria-pressed', 'false');

      expect(screen.getByText('Custom/Path')).toBeInTheDocument();
      // The select dropdown should have 'weekly' selected (check via select element value)
    });

    it('should display all privacy sections', () => {
      render(<DataPrivacySettings toast={mockToast} />);

      expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
      expect(screen.getByText('Data Management')).toBeInTheDocument();
      expect(screen.getByText('Export & Backup')).toBeInTheDocument();
    });
  });

  describe('Encryption Toggle', () => {
    it('should toggle encryption setting on and off', async () => {
      const user = userEvent.setup();
      render(<DataPrivacySettings toast={mockToast} />);

      const encryptToggle = screen.getByLabelText(/toggle encrypt sensitive data/i);

      // Initially enabled (true)
      expect(encryptToggle).toHaveAttribute('aria-pressed', 'true');

      // Click to disable
      await user.click(encryptToggle);
      expect(encryptToggle).toHaveAttribute('aria-pressed', 'false');

      // Click to enable again
      await user.click(encryptToggle);
      expect(encryptToggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('should persist encryption setting to localStorage', async () => {
      const user = userEvent.setup();
      render(<DataPrivacySettings toast={mockToast} />);

      const encryptToggle = screen.getByLabelText(/toggle encrypt sensitive data/i);

      // Toggle off
      await user.click(encryptToggle);
      expect(localStorage.getItem('encryptData')).toBe(JSON.stringify(false));

      // Toggle back on
      await user.click(encryptToggle);
      expect(localStorage.getItem('encryptData')).toBe(JSON.stringify(true));
    });
  });

  describe('Export & Backup Settings', () => {
    it('should change export location', async () => {
      const user = userEvent.setup();
      render(<DataPrivacySettings toast={mockToast} />);

      const changeButton = screen.getByRole('button', { name: /change/i });
      await user.click(changeButton);

      // After clicking, it should update the export location
      await waitFor(() => {
        expect(screen.getByText('Custom/Path')).toBeInTheDocument();
      });
    });

    it('should change auto-backup frequency', async () => {
      const user = userEvent.setup();
      render(<DataPrivacySettings toast={mockToast} />);

      const backupSelect = screen.getByLabelText(/auto-backup/i);

      // Change to weekly
      await user.selectOptions(backupSelect, 'weekly');
      expect(backupSelect).toHaveValue('weekly');

      // Verify localStorage persistence
      expect(localStorage.getItem('autoBackupFrequency')).toBe(JSON.stringify('weekly'));
    });

    it('should persist backup frequency to localStorage', async () => {
      const user = userEvent.setup();
      render(<DataPrivacySettings toast={mockToast} />);

      const backupSelect = screen.getByLabelText(/auto-backup/i);

      // Change to never
      await user.selectOptions(backupSelect, 'never');
      expect(localStorage.getItem('autoBackupFrequency')).toBe(JSON.stringify('never'));

      // Change to daily
      await user.selectOptions(backupSelect, 'daily');
      expect(localStorage.getItem('autoBackupFrequency')).toBe(JSON.stringify('daily'));
    });
  });

  describe('Clear All Data', () => {
    it('should show confirmation dialog when Clear All Data is clicked', async () => {
      const user = userEvent.setup();
      render(<DataPrivacySettings toast={mockToast} />);

      const clearButton = screen.getByRole('button', { name: /clear all data/i });
      await user.click(clearButton);

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to clear all data/i)).toBeInTheDocument();
      });
    });

    it('should close confirmation dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<DataPrivacySettings toast={mockToast} />);

      const clearButton = screen.getByRole('button', { name: /clear all data/i });
      await user.click(clearButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to clear all data/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to clear all data/i)).not.toBeInTheDocument();
      });
    });

    it('should clear all data when confirmed', async () => {
      const user = userEvent.setup();

      // Mock some data to delete
      mockJusticeAPI.getAllCases.mockResolvedValue({
        success: true,
        data: [{ id: 1, title: 'Case 1' }, { id: 2, title: 'Case 2' }],
      });
      mockJusticeAPI.getAllConversations.mockResolvedValue({
        success: true,
        data: [{ id: 1, title: 'Chat 1' }],
      });
      mockJusticeAPI.deleteCase.mockResolvedValue({ success: true });
      mockJusticeAPI.deleteConversation.mockResolvedValue({ success: true });

      render(<DataPrivacySettings toast={mockToast} />);

      // Get all "Clear All Data" buttons - first one is in the settings
      const clearButtons = screen.getAllByRole('button', { name: /clear all data/i });
      await user.click(clearButtons[0]); // Click the settings button

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to clear all data/i)).toBeInTheDocument();
      });

      // Now there are 2 "Clear All Data" buttons - get the second one (in dialog)
      const allButtons = screen.getAllByRole('button', { name: /clear all data/i });
      const confirmButton = allButtons[1]; // The dialog confirmation button
      await user.click(confirmButton);

      // Should call delete APIs
      await waitFor(() => {
        expect(mockJusticeAPI.getAllCases).toHaveBeenCalled();
        expect(mockJusticeAPI.getAllConversations).toHaveBeenCalled();
        expect(mockJusticeAPI.deleteCase).toHaveBeenCalledTimes(2);
        expect(mockJusticeAPI.deleteConversation).toHaveBeenCalledTimes(1);
      });

      // Should show success toast
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('cleared successfully')
      );
    });

    it('should handle clear data errors gracefully', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.getAllCases.mockRejectedValue(new Error('Database error'));

      render(<DataPrivacySettings toast={mockToast} />);

      const clearButtons = screen.getAllByRole('button', { name: /clear all data/i });
      await user.click(clearButtons[0]); // Click the settings button

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to clear all data/i)).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button', { name: /clear all data/i });
      const confirmButton = allButtons[1]; // The dialog confirmation button
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to clear')
        );
      });
    });
  });

  describe('GDPR Data Export', () => {
    it('should show Export Data button', () => {
      render(<DataPrivacySettings toast={mockToast} />);

      expect(screen.getByRole('button', { name: /export my data/i })).toBeInTheDocument();
    });

    it('should export user data when Export button is clicked', async () => {
      const user = userEvent.setup();
      const mockData = {
        profile: { name: 'John Doe', email: 'john@example.com' },
        cases: [{ id: 1, title: 'Case 1' }],
        conversations: [{ id: 1, title: 'Chat 1' }],
      };

      mockJusticeAPI.exportUserData.mockResolvedValue({
        success: true,
        data: mockData,
      });

      render(<DataPrivacySettings toast={mockToast} />);

      const exportButton = screen.getByRole('button', { name: /export my data/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockJusticeAPI.exportUserData).toHaveBeenCalled();
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.stringContaining('exported')
        );
      });
    });

    it('should handle export errors gracefully', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.exportUserData.mockRejectedValue(new Error('Export failed'));

      render(<DataPrivacySettings toast={mockToast} />);

      const exportButton = screen.getByRole('button', { name: /export my data/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to export')
        );
      });
    });
  });

  describe('GDPR Compliance', () => {
    it('should display GDPR information notice', () => {
      render(<DataPrivacySettings toast={mockToast} />);

      // Should mention data portability and right to erasure
      expect(screen.getByText(/your rights/i) || screen.getByText(/gdpr/i)).toBeInTheDocument();
    });
  });
});
