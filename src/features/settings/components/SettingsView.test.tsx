/**
 * SettingsView Integration Tests
 *
 * Tests for the Settings page tab structure and integration with extracted components.
 * Detailed component tests are in individual component test files:
 * - ProfileSettings.test.tsx
 * - ConsentSettings.test.tsx
 * - DataPrivacySettings.test.tsx
 * - AppearanceSettings.test.tsx
 * - NotificationSettings.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsView } from './SettingsView';

// Custom render with providers
function render(ui: React.ReactElement) {
  return rtlRender(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
}

// Mock window.justiceAPI
const mockJusticeAPI = {
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserConsents: vi.fn(),
  grantConsent: vi.fn(),
  revokeConsent: vi.fn(),
  changePassword: vi.fn(),
  getAllCases: vi.fn(),
  getAllConversations: vi.fn(),
  deleteCase: vi.fn(),
  deleteConversation: vi.fn(),
  exportUserData: vi.fn(),
};

describe('SettingsView Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    (window as any).justiceAPI = mockJusticeAPI;

    // Auth mocks
    mockJusticeAPI.getCurrentUser.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        username: 'testuser',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    });

    // Profile mocks
    mockJusticeAPI.getUserProfile.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    });

    // Consent mocks
    mockJusticeAPI.getUserConsents.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  describe('Tab Structure', () => {
    it('should render main heading and description', () => {
      render(<SettingsView />);

      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByText('Manage your preferences')).toBeInTheDocument();
    });

    it('should render all tab buttons', () => {
      render(<SettingsView />);

      // Check all tabs are rendered
      expect(screen.getByRole('tab', { name: /account/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /ai configuration/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /preferences/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /data & privacy/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /case management/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /about/i })).toBeInTheDocument();
    });

    it('should display Account tab by default', async () => {
      render(<SettingsView />);

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      // Should show ProfileSettings and ConsentSettings components
      expect(screen.getByText('Account Security')).toBeInTheDocument();
      expect(screen.getByText('Consent Management')).toBeInTheDocument();
    });

    it('should switch to AI Configuration tab', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      const aiTab = screen.getByRole('tab', { name: /ai configuration/i });
      await user.click(aiTab);

      await waitFor(() => {
        expect(screen.getByText('AI & Legal Data')).toBeInTheDocument();
        expect(screen.getByText('Advanced AI')).toBeInTheDocument();
      });
    });

    it('should switch to Preferences tab', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      const preferencesTab = screen.getByRole('tab', { name: /preferences/i });
      await user.click(preferencesTab);

      await waitFor(() => {
        // Should show NotificationSettings and AppearanceSettings
        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('Appearance')).toBeInTheDocument();
      });
    });

    it('should switch to Data & Privacy tab', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      const privacyTab = screen.getByRole('tab', { name: /data & privacy/i });
      await user.click(privacyTab);

      await waitFor(() => {
        // Should show DataPrivacySettings component
        expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
        expect(screen.getByText('Data Management')).toBeInTheDocument();
      });
    });

    it('should switch to Case Management tab', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      const casesTab = screen.getByRole('tab', { name: /case management/i });
      await user.click(casesTab);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /case management/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/default case type/i)).toBeInTheDocument();
      });
    });

    it('should switch to About tab', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      const aboutTab = screen.getByRole('tab', { name: /about/i });
      await user.click(aboutTab);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /about/i })).toBeInTheDocument();
        expect(screen.getByText('Version')).toBeInTheDocument();
        expect(screen.getByText('1.0.0')).toBeInTheDocument();
      });
    });
  });

  describe('AI Configuration Settings', () => {
    it('should toggle RAG enabled setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Navigate to AI Configuration tab
      const aiTab = screen.getByRole('tab', { name: /ai configuration/i });
      await user.click(aiTab);

      await waitFor(() => {
        expect(screen.getByText('AI & Legal Data')).toBeInTheDocument();
      });

      let ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);

      // Initially enabled (default: true)
      expect(ragToggle).toHaveAttribute('aria-pressed', 'true');

      // Click to disable
      await user.click(ragToggle);
      await waitFor(() => {
        ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);
        expect(ragToggle).toHaveAttribute('aria-pressed', 'false');
        expect(localStorage.getItem('ragEnabled')).toBe('false');
      });

      // Click to enable again
      await user.click(ragToggle);
      await waitFor(() => {
        ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);
        expect(ragToggle).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('ragEnabled')).toBe('true');
      });
    });

    it('should change response length setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Navigate to AI Configuration tab
      const aiTab = screen.getByRole('tab', { name: /ai configuration/i });
      await user.click(aiTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/response length/i)).toBeInTheDocument();
      });

      let responseLengthSelect = screen.getByLabelText(/response length/i);

      // Default: 'balanced'
      expect(responseLengthSelect).toHaveValue('balanced');

      // Change to 'detailed'
      await user.selectOptions(responseLengthSelect, 'detailed');
      await waitFor(() => {
        responseLengthSelect = screen.getByLabelText(/response length/i);
        expect(responseLengthSelect).toHaveValue('detailed');
        expect(localStorage.getItem('responseLength')).toBe('detailed');
      });

      // Change to 'concise'
      await user.selectOptions(responseLengthSelect, 'concise');
      await waitFor(() => {
        responseLengthSelect = screen.getByLabelText(/response length/i);
        expect(responseLengthSelect).toHaveValue('concise');
        expect(localStorage.getItem('responseLength')).toBe('concise');
      });
    });

    it('should change jurisdiction setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Navigate to AI Configuration tab
      const aiTab = screen.getByRole('tab', { name: /ai configuration/i });
      await user.click(aiTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/jurisdiction/i)).toBeInTheDocument();
      });

      let jurisdictionSelect = screen.getByLabelText(/jurisdiction/i);

      // Default: 'uk-england-wales'
      expect(jurisdictionSelect).toHaveValue('uk-england-wales');

      // Change to 'uk-scotland'
      await user.selectOptions(jurisdictionSelect, 'uk-scotland');
      await waitFor(() => {
        jurisdictionSelect = screen.getByLabelText(/jurisdiction/i);
        expect(jurisdictionSelect).toHaveValue('uk-scotland');
        expect(localStorage.getItem('jurisdiction')).toBe('uk-scotland');
      });
    });
  });

  describe('Case Management Settings', () => {
    it('should change default case type', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Navigate to Case Management tab
      const casesTab = screen.getByRole('tab', { name: /case management/i });
      await user.click(casesTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/default case type/i)).toBeInTheDocument();
      });

      let caseTypeSelect = screen.getByLabelText(/default case type/i);

      // Default: 'general'
      expect(caseTypeSelect).toHaveValue('general');

      // Change to 'employment'
      await user.selectOptions(caseTypeSelect, 'employment');
      await waitFor(() => {
        caseTypeSelect = screen.getByLabelText(/default case type/i);
        expect(caseTypeSelect).toHaveValue('employment');
        expect(localStorage.getItem('defaultCaseType')).toBe('employment');
      });
    });

    it('should change auto-archive setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Navigate to Case Management tab
      const casesTab = screen.getByRole('tab', { name: /case management/i });
      await user.click(casesTab);

      await waitFor(() => {
        expect(screen.getByLabelText(/auto-archive after/i)).toBeInTheDocument();
      });

      let autoArchiveSelect = screen.getByLabelText(/auto-archive after/i);

      // Default: '90'
      expect(autoArchiveSelect).toHaveValue('90');

      // Change to '180'
      await user.selectOptions(autoArchiveSelect, '180');
      await waitFor(() => {
        autoArchiveSelect = screen.getByLabelText(/auto-archive after/i);
        expect(autoArchiveSelect).toHaveValue('180');
        expect(localStorage.getItem('autoArchiveDays')).toBe('180');
      });
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should load AI settings from localStorage on mount', () => {
      // Set localStorage values
      localStorage.setItem('ragEnabled', 'false');
      localStorage.setItem('responseLength', 'detailed');
      localStorage.setItem('jurisdiction', 'uk-scotland');

      render(<SettingsView />);

      // Navigate to AI Configuration tab
      const aiTab = screen.getByRole('tab', { name: /ai configuration/i });
      aiTab.click();

      waitFor(() => {
        const ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);
        expect(ragToggle).toHaveAttribute('aria-pressed', 'false');

        const responseLengthSelect = screen.getByLabelText(/response length/i);
        expect(responseLengthSelect).toHaveValue('detailed');

        const jurisdictionSelect = screen.getByLabelText(/jurisdiction/i);
        expect(jurisdictionSelect).toHaveValue('uk-scotland');
      });
    });
  });
});
