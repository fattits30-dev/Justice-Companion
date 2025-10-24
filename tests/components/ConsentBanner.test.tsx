/**
 * ConsentBanner Component Tests
 *
 * TDD Cycle: RED (Write tests first - they will fail)
 *
 * Tests cover:
 * - Component rendering
 * - Accept/Decline actions
 * - IPC communication
 * - Dismissing after action
 * - Error handling
 * - Loading states
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsentBanner } from '../../src/components/auth/ConsentBanner';

describe('ConsentBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TEST 1: Component renders with consent message
   */
  test('renders consent banner with message and buttons', () => {
    render(<ConsentBanner consentType="data_processing" />);

    // Check for consent message
    expect(screen.getByText(/data processing|we collect|personal data|cookies/i)).toBeInTheDocument();

    // Check for Accept button
    expect(screen.getByRole('button', { name: /accept|agree|i consent/i })).toBeInTheDocument();

    // Check for Decline button
    expect(screen.getByRole('button', { name: /decline|reject|no thanks/i })).toBeInTheDocument();
  });

  /**
   * TEST 2: Accept button calls IPC with correct consent type
   */
  test('calls window.justiceAPI.grantConsent when Accept is clicked', async () => {
    const mockGrantConsent = vi.fn().mockResolvedValue({ success: true });
    window.justiceAPI.grantConsent = mockGrantConsent;

    render(<ConsentBanner consentType="data_processing" />);

    const acceptButton = screen.getByRole('button', { name: /accept|agree|i consent/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockGrantConsent).toHaveBeenCalledWith('data_processing', true);
    });
  });

  /**
   * TEST 3: Decline button calls IPC with consent revoked
   */
  test('calls window.justiceAPI.grantConsent with false when Decline is clicked', async () => {
    const mockGrantConsent = vi.fn().mockResolvedValue({ success: true });
    window.justiceAPI.grantConsent = mockGrantConsent;

    render(<ConsentBanner consentType="data_processing" />);

    const declineButton = screen.getByRole('button', { name: /decline|reject|no thanks/i });
    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(mockGrantConsent).toHaveBeenCalledWith('data_processing', false);
    });
  });

  /**
   * TEST 4: Banner dismisses after accepting
   */
  test('hides banner after successful accept', async () => {
    const mockGrantConsent = vi.fn().mockResolvedValue({ success: true });
    window.justiceAPI.grantConsent = mockGrantConsent;

    const { container } = render(<ConsentBanner consentType="data_processing" />);

    const acceptButton = screen.getByRole('button', { name: /accept|agree|i consent/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  /**
   * TEST 5: Banner dismisses after declining
   */
  test('hides banner after successful decline', async () => {
    const mockGrantConsent = vi.fn().mockResolvedValue({ success: true });
    window.justiceAPI.grantConsent = mockGrantConsent;

    const { container } = render(<ConsentBanner consentType="data_processing" />);

    const declineButton = screen.getByRole('button', { name: /decline|reject|no thanks/i });
    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  /**
   * TEST 6: Shows loading state while processing
   */
  test('disables buttons while consent is being saved', async () => {
    const mockGrantConsent = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );
    window.justiceAPI.grantConsent = mockGrantConsent;

    render(<ConsentBanner consentType="data_processing" />);

    const acceptButton = screen.getByRole('button', { name: /accept|agree|i consent/i });
    const declineButton = screen.getByRole('button', { name: /decline|reject|no thanks/i });

    fireEvent.click(acceptButton);

    // Buttons should be disabled while loading
    await waitFor(() => {
      expect(acceptButton).toBeDisabled();
      expect(declineButton).toBeDisabled();
    });
  });

  /**
   * TEST 7: Shows error message when consent fails
   */
  test('displays error when consent API fails', async () => {
    const mockGrantConsent = vi.fn().mockResolvedValue({
      success: false,
      error: 'Failed to save consent'
    });
    window.justiceAPI.grantConsent = mockGrantConsent;

    render(<ConsentBanner consentType="data_processing" />);

    const acceptButton = screen.getByRole('button', { name: /accept|agree|i consent/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to save consent|error/i)).toBeInTheDocument();
    });
  });

  /**
   * TEST 8: onAccept callback is called after accepting
   */
  test('calls onAccept callback after successful accept', async () => {
    const mockGrantConsent = vi.fn().mockResolvedValue({ success: true });
    window.justiceAPI.grantConsent = mockGrantConsent;

    const mockOnAccept = vi.fn();
    render(<ConsentBanner consentType="data_processing" onAccept={mockOnAccept} />);

    const acceptButton = screen.getByRole('button', { name: /accept|agree|i consent/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalled();
    });
  });

  /**
   * TEST 9: onDecline callback is called after declining
   */
  test('calls onDecline callback after successful decline', async () => {
    const mockGrantConsent = vi.fn().mockResolvedValue({ success: true });
    window.justiceAPI.grantConsent = mockGrantConsent;

    const mockOnDecline = vi.fn();
    render(<ConsentBanner consentType="data_processing" onDecline={mockOnDecline} />);

    const declineButton = screen.getByRole('button', { name: /decline|reject|no thanks/i });
    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(mockOnDecline).toHaveBeenCalled();
    });
  });

  /**
   * TEST 10: Different consent types show appropriate messages
   */
  test('displays marketing consent message for marketing type', () => {
    render(<ConsentBanner consentType="marketing" />);

    expect(screen.getByText(/marketing|promotional|newsletter/i)).toBeInTheDocument();
  });

  /**
   * TEST 11: Banner is dismissible with X button
   */
  test('can be dismissed with close button without accepting or declining', async () => {
    const mockOnDismiss = vi.fn();
    const { container } = render(<ConsentBanner consentType="data_processing" onDismiss={mockOnDismiss} />);

    // Find close/dismiss button (usually an X icon)
    const closeButton = screen.getByRole('button', { name: /close|dismiss/i });
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalled();

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  /**
   * TEST 12: Accessibility - has proper ARIA attributes
   */
  test('has proper ARIA role and label', () => {
    render(<ConsentBanner consentType="data_processing" />);

    const banner = screen.getByRole('dialog', { name: /consent|privacy/i });
    expect(banner).toBeInTheDocument();
  });
});
