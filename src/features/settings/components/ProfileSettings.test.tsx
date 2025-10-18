/**
 * ProfileSettings Component Tests
 *
 * Tests for the extracted ProfileSettings component including:
 * - Profile loading and display
 * - Profile editing (name, email)
 * - Profile saving
 * - Password change functionality
 * - Validation and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSettings } from './ProfileSettings';
import type { UserProfile } from '@/models/UserProfile';

// Mock justiceAPI
const mockJusticeAPI = {
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  changePassword: vi.fn(),
};

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

describe('ProfileSettings', () => {
  const mockUserProfile: UserProfile = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrl: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).justiceAPI = mockJusticeAPI;

    mockJusticeAPI.getUserProfile.mockResolvedValue({
      success: true,
      data: mockUserProfile,
    });
  });

  describe('Profile Loading', () => {
    it('should display loading state initially', () => {
      render(<ProfileSettings toast={mockToast} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should load and display user profile', async () => {
      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(mockJusticeAPI.getUserProfile).toHaveBeenCalled();
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should handle profile loading error gracefully', async () => {
      mockJusticeAPI.getUserProfile.mockRejectedValue(new Error('Load failed'));

      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load profile')
        );
      });
    });
  });

  describe('Profile Editing', () => {
    it('should enable edit mode when edit button clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit profile/i });
      await user.click(editButtons[0]); // Click first edit button

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should allow editing name and email', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit profile/i });
      await user.click(editButtons[0]); // Click first edit button

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      await user.clear(emailInput);
      await user.type(emailInput, 'jane@example.com');

      expect(nameInput).toHaveValue('Jane Smith');
      expect(emailInput).toHaveValue('jane@example.com');
    });

    it('should save profile changes successfully', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.updateUserProfile.mockResolvedValue({
        success: true,
        data: { ...mockUserProfile, name: 'Jane Smith', email: 'jane@example.com' },
      });

      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit profile/i });
      await user.click(editButtons[0]); // Click first edit button

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockJusticeAPI.updateUserProfile).toHaveBeenCalledWith({
          name: 'Jane Smith',
          email: 'john@example.com',
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('Profile updated')
      );
    });

    it('should cancel editing and restore original values', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit profile/i });
      await user.click(editButtons[0]); // Click first edit button

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Different Name');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should restore original value (displayed as text, not in input)
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Password Change', () => {
    it('should show password change form when button clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    });

    it('should validate password requirements', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/^new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'OldPassword123');
      await user.type(newPasswordInput, 'weak');
      await user.type(confirmPasswordInput, 'weak');

      const submitButton = screen.getByRole('button', { name: /update password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must be at least 12 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate password confirmation match', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/^new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'OldPassword123');
      await user.type(newPasswordInput, 'NewPassword123!');
      await user.type(confirmPasswordInput, 'DifferentPassword123!');

      const submitButton = screen.getByRole('button', { name: /update password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should successfully change password', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.changePassword.mockResolvedValue({ success: true });

      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/^new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'OldPassword123');
      await user.type(newPasswordInput, 'NewPassword123!');
      await user.type(confirmPasswordInput, 'NewPassword123!');

      const submitButton = screen.getByRole('button', { name: /update password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockJusticeAPI.changePassword).toHaveBeenCalledWith(
          'OldPassword123',
          'NewPassword123!',
        );
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('Password changed')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle profile save error', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.updateUserProfile.mockRejectedValue(new Error('Update failed'));

      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit profile/i });
      await user.click(editButtons[0]); // Click first edit button

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to update profile')
        );
      });
    });

    it('should handle password change error', async () => {
      const user = userEvent.setup();
      mockJusticeAPI.changePassword.mockRejectedValue(new Error('Change failed'));

      render(<ProfileSettings toast={mockToast} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/^new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'OldPassword123');
      await user.type(newPasswordInput, 'NewPassword123!');
      await user.type(confirmPasswordInput, 'NewPassword123!');

      const submitButton = screen.getByRole('button', { name: /update password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to change password')
        );
      });
    });
  });
});
