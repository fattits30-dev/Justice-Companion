/**
 * ConsentSettings Component Tests
 *
 * Tests for the extracted ConsentSettings component including:
 * - Consent loading and display
 * - Granting consent
 * - Revoking consent
 * - Required consent protection
 * - Error handling
 * - GDPR compliance features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentSettings } from './ConsentSettings';
import type { Consent, ConsentType } from '@/models/Consent';

// Mock justiceAPI
const mockJusticeAPI = {
  getUserConsents: vi.fn(),
  grantConsent: vi.fn(),
  revokeConsent: vi.fn(),
};

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

describe('ConsentSettings', () => {
  const mockConsents: Consent[] = [
    {
      id: 1,
      userId: 1,
      consentType: 'data_processing',
      granted: true,
      grantedAt: '2025-01-01T00:00:00.000Z',
      revokedAt: null,
      version: '1.0',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      userId: 1,
      consentType: 'ai_processing',
      granted: true,
      grantedAt: '2025-01-02T00:00:00.000Z',
      revokedAt: null,
      version: '1.0',
      createdAt: '2025-01-02T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).justiceAPI = mockJusticeAPI;

    mockJusticeAPI.getUserConsents.mockResolvedValue({
      success: true,
      data: mockConsents,
    });
  });

  describe('Consent Loading', () => {
    it('should load and display consents on mount', async () => {
      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(mockJusticeAPI.getUserConsents).toHaveBeenCalled();
      });

      // Check all consent types are displayed (capitalize check to be more specific)
      expect(screen.getByText('Data Processing')).toBeInTheDocument();
      expect(screen.getByText('Encryption')).toBeInTheDocument();
      expect(screen.getByText('Ai Processing')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });

    it('should display loading skeleton while loading', async () => {
      // Make the API call take a while
      mockJusticeAPI.getUserConsents.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: [] }), 100))
      );

      render(<ConsentSettings toast={mockToast} />);

      // Loading skeleton should be visible initially (check for specific consent name)
      expect(screen.queryByText('Data Processing')).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Data Processing')).toBeInTheDocument();
      });
    });

    it('should handle loading errors', async () => {
      mockJusticeAPI.getUserConsents.mockRejectedValue(new Error('Failed to load'));

      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to load consents');
      });
    });
  });

  describe('Consent Status Display', () => {
    it('should show granted status for existing consents', async () => {
      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('Data Processing')).toBeInTheDocument();
      });

      // Should show "Granted" status (2 instances: data_processing and ai_processing)
      await waitFor(() => {
        const grantedStatuses = screen.getAllByText('Granted');
        expect(grantedStatuses).toHaveLength(2);
      });
    });

    it('should show not granted status for missing consents', async () => {
      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/encryption/i)).toBeInTheDocument();
      });

      // Should show "Not granted" status for encryption and marketing
      const notGrantedStatuses = screen.getAllByText(/not granted/i);
      expect(notGrantedStatuses).toHaveLength(2);
    });

    it('should mark data_processing as required', async () => {
      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        // Check for the "Required" badge (exact match)
        expect(screen.getByText('Required')).toBeInTheDocument();
      });
    });
  });

  describe('Granting Consent', () => {
    it('should grant consent successfully', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.grantConsent.mockResolvedValue({ success: true });

      // After granting, return updated consents
      mockJusticeAPI.getUserConsents
        .mockResolvedValueOnce({ success: true, data: mockConsents })
        .mockResolvedValueOnce({
          success: true,
          data: [...mockConsents, {
            id: 3,
            userId: 1,
            consentType: 'encryption' as ConsentType,
            granted: true,
            grantedAt: '2025-01-03T00:00:00.000Z',
            revokedAt: null,
            version: '1.0',
            createdAt: '2025-01-03T00:00:00.000Z',
          }]
        });

      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/encryption/i)).toBeInTheDocument();
      });

      // Find and click Grant button for encryption
      const grantButtons = screen.getAllByRole('button', { name: /grant/i });
      await user.click(grantButtons[0]); // First Grant button (encryption)

      await waitFor(() => {
        expect(mockJusticeAPI.grantConsent).toHaveBeenCalledWith('encryption');
        expect(mockToast.success).toHaveBeenCalledWith('Consent granted successfully');
      });

      // Should reload consents
      await waitFor(() => {
        expect(mockJusticeAPI.getUserConsents).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle grant consent error', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.grantConsent.mockResolvedValue({
        success: false,
        error: 'Grant failed'
      });

      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/encryption/i)).toBeInTheDocument();
      });

      const grantButtons = screen.getAllByRole('button', { name: /grant/i });
      await user.click(grantButtons[0]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to grant consent');
      });
    });
  });

  describe('Revoking Consent', () => {
    it('should revoke consent successfully', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.revokeConsent.mockResolvedValue({ success: true });

      // After revoking, return updated consents (remove ai_processing)
      mockJusticeAPI.getUserConsents
        .mockResolvedValueOnce({ success: true, data: mockConsents })
        .mockResolvedValueOnce({
          success: true,
          data: mockConsents.filter(c => c.consentType !== 'ai_processing')
        });

      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/ai processing/i)).toBeInTheDocument();
      });

      // Find and click Revoke button for ai_processing
      const revokeButton = screen.getByRole('button', { name: /^revoke$/i });
      await user.click(revokeButton);

      await waitFor(() => {
        expect(mockJusticeAPI.revokeConsent).toHaveBeenCalledWith('ai_processing');
        expect(mockToast.success).toHaveBeenCalledWith('Consent revoked successfully');
      });

      // Should reload consents
      await waitFor(() => {
        expect(mockJusticeAPI.getUserConsents).toHaveBeenCalledTimes(2);
      });
    });

    it('should prevent revoking required consent', async () => {
      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/data processing/i)).toBeInTheDocument();
      });

      // Required consent should have "Cannot revoke" button that is disabled
      const cannotRevokeButton = screen.getByRole('button', { name: /cannot revoke/i });
      expect(cannotRevokeButton).toBeDisabled();
    });

    it('should handle revoke consent error', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.revokeConsent.mockResolvedValue({
        success: false,
        error: 'Revoke failed'
      });

      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/ai processing/i)).toBeInTheDocument();
      });

      const revokeButton = screen.getByRole('button', { name: /^revoke$/i });
      await user.click(revokeButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to revoke consent');
      });
    });
  });

  describe('GDPR Compliance', () => {
    it('should display GDPR rights notice', async () => {
      render(<ConsentSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText(/your rights \(gdpr\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/you can withdraw consent at any time/i)).toBeInTheDocument();
    });
  });
});
