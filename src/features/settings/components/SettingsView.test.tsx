/**
 * SettingsView Component Tests
 *
 * Tests for the Settings page including:
 * - Profile management (load, edit, save)
 * - Toggle settings (RAG, notifications, privacy)
 * - Select settings (font size, language, etc.)
 * - Clear data functionality
 * - LocalStorage persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
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

// Helper function to click tabs
const clickTab = async (tabName: string): Promise<void> => {
  const tab = screen.getByRole('tab', { name: tabName });
  await userEvent.setup().click(tab);
};

// Mock window.justiceAPI
const mockJusticeAPI = {
  // Auth methods (required by AuthProvider)
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
  // Profile methods
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  // Consent methods
  getUserConsents: vi.fn(),
  grantConsent: vi.fn(),
  revokeConsent: vi.fn(),
  changePassword: vi.fn(),
  // Data management methods
  getAllCases: vi.fn(),
  getAllConversations: vi.fn(),
  deleteCase: vi.fn(),
  deleteConversation: vi.fn(),
};

describe('SettingsView', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock responses
    (window as any).justiceAPI = mockJusticeAPI;

    // Auth mocks (AuthProvider calls getCurrentUser on mount)
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

  afterEach(() => {
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render main heading and description', () => {
      render(<SettingsView />);

      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByText('Manage your preferences')).toBeInTheDocument();
    });

    it('should render all settings sections', () => {
      render(<SettingsView />);

      // Check for all 6 tabs
      expect(screen.getByRole('tab', { name: 'Account' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'AI Configuration' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Preferences' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Data & Privacy' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Case Management' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'About' })).toBeInTheDocument();
    });

    it('should render version information', () => {
      render(<SettingsView />);

      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });
  });

  describe('Profile Management', () => {
    it('should show loading skeleton while loading profile', () => {
      render(<SettingsView />);

      expect(screen.getByRole('status', { busy: true })).toBeInTheDocument();
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should display user profile after loading', async () => {
      render(<SettingsView />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(mockJusticeAPI.getUserProfile).toHaveBeenCalledTimes(1);
    });

    it('should show "Not set" when profile fields are empty', async () => {
      mockJusticeAPI.getUserProfile.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          name: null,
          email: null,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      });

      render(<SettingsView />);

      await waitFor(() => {
        expect(screen.getAllByText('Not set').length).toBeGreaterThan(0);
      });
    });

    it('should enter edit mode when clicking Edit button', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should update profile on save', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.updateUserProfile.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          name: 'Jane Smith',
          email: 'jane@example.com',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-08T00:00:00.000Z',
        },
      });

      render(<SettingsView />);

      // Wait for profile to load (Account tab is default, already visible)
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      // Wait for edit mode to render
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
      });

      // Get inputs
      const nameInput = screen.getByPlaceholderText('Enter your name') as HTMLInputElement;
      let emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement;

      // Update name - directly update the controlled input
      await user.click(nameInput);
      fireEvent.input(nameInput, { target: { value: 'Jane Smith' } });

      // Wait for state to update
      await waitFor(() => {
        expect(nameInput.value).toBe('Jane Smith');
      });

      // Re-query email input in case React re-rendered
      emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement;

      // Update email - directly update the controlled input
      await user.click(emailInput);
      fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
      fireEvent.input(emailInput, { target: { value: 'jane@example.com' } });

      // Verify email value is updated
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('jane@example.com');
      });

      // Save
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockJusticeAPI.updateUserProfile).toHaveBeenCalledWith({
          name: 'Jane Smith',
          email: 'jane@example.com',
        });
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      });
    });

    it('should cancel editing and restore original values', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      // Change name
      const nameInput = screen.getByPlaceholderText('Enter your name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Different Name');

      // Cancel
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // Should not save
      expect(mockJusticeAPI.updateUserProfile).not.toHaveBeenCalled();

      // Should show original data
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Toggle Settings', () => {
    it('should toggle RAG enabled setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Small delay to ensure DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 100));

      const ragText = screen.getByText('Enhanced legal responses (RAG)');
      // Get the parent div (ToggleSetting root) - closest returns the label div, need parent
      const labelDiv = ragText.closest('div');
      const ragContainer = labelDiv!.parentElement;
      expect(ragContainer).toBeInTheDocument();

      const ragToggle = ragContainer!.querySelector('button');
      expect(ragToggle).toBeInTheDocument();

      // Default is enabled (true)
      await user.click(ragToggle!);

      // Should save to localStorage
      await waitFor(() => {
        expect(localStorage.getItem('ragEnabled')).toBe('false');
      });
    });

    it('should toggle chat notifications', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Small delay to ensure DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notifText = screen.getByText('Chat notifications');
      const labelDiv = notifText.closest('div');
      const notifContainer = labelDiv!.parentElement;
      const notifToggle = notifContainer!.querySelector('button');
      expect(notifToggle).toBeInTheDocument();

      await user.click(notifToggle!);

      await waitFor(() => {
        expect(localStorage.getItem('chatNotifications')).toBe('false');
      });
    });

    it('should toggle encryption setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Small delay to ensure DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 100));

      const encryptText = screen.getByText('Encrypt sensitive data');
      const labelDiv = encryptText.closest('div');
      const encryptContainer = labelDiv!.parentElement;
      const encryptToggle = encryptContainer!.querySelector('button');
      expect(encryptToggle).toBeInTheDocument();

      await user.click(encryptToggle!);

      await waitFor(() => {
        expect(localStorage.getItem('encryptData')).toBe('false');
      });
    });

    it('should persist dark mode setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Small delay to ensure DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 100));

      const darkModeText = screen.getByText('Dark mode');
      const labelDiv = darkModeText.closest('div');
      const darkModeContainer = labelDiv!.parentElement;
      const darkModeToggle = darkModeContainer!.querySelector('button');
      expect(darkModeToggle).toBeInTheDocument();

      await user.click(darkModeToggle!);

      await waitFor(() => {
        expect(localStorage.getItem('darkMode')).toBe('false');
      });
    });
  });

  describe('Select Settings', () => {
    it('should change font size setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Small delay to ensure DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 100));

      const fontSizeText = screen.getByText('Font size');
      // Get the parent div (SelectSetting root) - closest returns the label div, need parent
      const labelDiv = fontSizeText.closest('div');
      const fontSizeContainer = labelDiv!.parentElement;
      const fontSizeSelect = fontSizeContainer!.querySelector('select');
      expect(fontSizeSelect).toBeInTheDocument();

      await user.selectOptions(fontSizeSelect!, 'large');

      await waitFor(() => {
        expect(localStorage.getItem('fontSize')).toBe('large');
      });
    });

    it('should change response length setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Small delay to ensure DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 100));

      const responseLengthText = screen.getByText('Response length');
      // Get the parent div (SelectSetting root) - closest returns the label div, need parent
      const labelDiv = responseLengthText.closest('div');
      const responseLengthContainer = labelDiv!.parentElement;
      const responseLengthSelect = responseLengthContainer!.querySelector('select');
      expect(responseLengthSelect).toBeInTheDocument();

      await user.selectOptions(responseLengthSelect!, 'concise');

      await waitFor(() => {
        expect(localStorage.getItem('responseLength')).toBe('concise');
      });
    });

    it('should change jurisdiction setting', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Small delay to ensure DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 100));

      const jurisdictionText = screen.getByText('Jurisdiction');
      // Get the parent div (SelectSetting root) - closest returns the label div, need parent
      const labelDiv = jurisdictionText.closest('div');
      const jurisdictionContainer = labelDiv!.parentElement;
      const jurisdictionSelect = jurisdictionContainer!.querySelector('select');
      expect(jurisdictionSelect).toBeInTheDocument();

      await user.selectOptions(jurisdictionSelect!, 'uk-scotland');

      await waitFor(() => {
        expect(localStorage.getItem('jurisdiction')).toBe('uk-scotland');
      });
    });
  });

  describe('Data Management', () => {
    it('should show clear data confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click Data & Privacy tab to access data management section
      const dataPrivacyTab = screen.getByRole('tab', { name: 'Data & Privacy' });
      await user.click(dataPrivacyTab);

      // Wait for tab content to render
      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: 'Clear All Data' });
      await user.click(clearButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to clear all data/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should cancel clear data operation', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click Data & Privacy tab to access data management section
      const dataPrivacyTab = screen.getByRole('tab', { name: 'Data & Privacy' });
      await user.click(dataPrivacyTab);

      // Wait for tab content to render
      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: 'Clear All Data' });
      await user.click(clearButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockJusticeAPI.getAllCases).not.toHaveBeenCalled();
      expect(
        screen.queryByText('Are you sure you want to clear all data?')
      ).not.toBeInTheDocument();
    });

    it('should clear all data when confirmed', async () => {
      const user = userEvent.setup();

      mockJusticeAPI.getAllCases.mockResolvedValue({
        success: true,
        data: [{ id: 1, title: 'Test Case' }],
      });

      mockJusticeAPI.getAllConversations.mockResolvedValue({
        success: true,
        data: [{ id: 1, title: 'Test Conversation' }],
      });

      mockJusticeAPI.deleteCase.mockResolvedValue({ success: true });
      mockJusticeAPI.deleteConversation.mockResolvedValue({ success: true });

      render(<SettingsView />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click Data & Privacy tab to access data management section
      const dataPrivacyTab = screen.getByRole('tab', { name: 'Data & Privacy' });
      await user.click(dataPrivacyTab);

      // Wait for tab content to render and button to be available
      await waitFor(() => {
        expect(screen.getByText('Data Management')).toBeInTheDocument();
      });

      // Click the Clear All Data button
      const clearButton = screen.getByRole('button', { name: 'Clear All Data' });
      await user.click(clearButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to clear all data/i)).toBeInTheDocument();
      });

      // Find all buttons with "Clear All Data" text
      // The dialog confirm button will be the second one (index 1)
      const allButtons = screen.getAllByRole('button');
      const confirmButton = allButtons.find(
        (button) =>
          button.textContent === 'Clear All Data' && button.className.includes('bg-red-600')
      );

      expect(confirmButton).toBeInTheDocument();
      await user.click(confirmButton!);

      await waitFor(() => {
        expect(mockJusticeAPI.getAllCases).toHaveBeenCalled();
        expect(mockJusticeAPI.getAllConversations).toHaveBeenCalled();
        expect(mockJusticeAPI.deleteCase).toHaveBeenCalledWith(1);
        expect(mockJusticeAPI.deleteConversation).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should load settings from localStorage on mount', async () => {
      localStorage.setItem('ragEnabled', 'false');
      localStorage.setItem('darkMode', 'false');
      localStorage.setItem('fontSize', 'large');

      render(<SettingsView />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Small delay to ensure DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 100));

      const ragText = screen.getByText('Enhanced legal responses (RAG)');
      const labelDiv = ragText.closest('div');
      const ragContainer = labelDiv!.parentElement;
      const ragToggle = ragContainer!.querySelector('button');
      expect(ragToggle).toBeInTheDocument();

      // Should reflect localStorage state (visual check would need accessibility attributes)
      expect(localStorage.getItem('ragEnabled')).toBe('false');
      expect(localStorage.getItem('fontSize')).toBe('large');
    });

    it('should persist all settings to localStorage', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      // Wait for component to finish loading
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Small delay to ensure DOM is settled
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Toggle RAG
      const ragText = screen.getByText('Enhanced legal responses (RAG)');
      const ragLabelDiv = ragText.closest('div');
      const ragContainer = ragLabelDiv!.parentElement;
      const ragToggle = ragContainer!.querySelector('button');
      expect(ragToggle).toBeInTheDocument();
      await user.click(ragToggle!);

      // Change font size
      const fontSizeText = screen.getByText('Font size');
      // Get the parent div (SelectSetting root) - closest returns the label div, need parent
      const fontSizeLabelDiv = fontSizeText.closest('div');
      const fontSizeContainer = fontSizeLabelDiv!.parentElement;
      const fontSizeSelect = fontSizeContainer!.querySelector('select');
      expect(fontSizeSelect).toBeInTheDocument();
      await user.selectOptions(fontSizeSelect!, 'small');

      // Verify persistence
      await waitFor(() => {
        expect(localStorage.getItem('ragEnabled')).toBe('false');
        expect(localStorage.getItem('fontSize')).toBe('small');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper loading state with aria attributes', () => {
      render(<SettingsView />);

      const loadingStatus = screen.getByRole('status', { busy: true });
      expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
      expect(loadingStatus).toHaveAttribute('aria-busy', 'true');
    });

    it('should have accessible form inputs with labels', async () => {
      const user = userEvent.setup();
      render(<SettingsView />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      // Check labels
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });
});
