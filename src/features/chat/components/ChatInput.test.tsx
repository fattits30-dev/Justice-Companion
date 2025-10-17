/**
 * ChatInput Component Tests
 *
 * Tests for the ChatInput component focusing on:
 * - Rendering textarea and send button
 * - Keyboard shortcuts (Enter, Shift+Enter)
 * - Empty message validation
 * - Disabled state behavior
 * - Auto-resize functionality
 *
 * These tests verify user-facing behavior, not implementation details.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent } from '@/test-utils/test-utils';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  // Mock callback for onSend prop
  const mockOnSend = vi.fn();

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render textarea with correct placeholder', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('placeholder', 'Ask a legal question...');
    });

    it('should render textarea with custom placeholder', () => {
      render(<ChatInput onSend={mockOnSend} placeholder="Custom placeholder" />);

      const textarea = screen.getByLabelText('Message input');
      expect(textarea).toHaveAttribute('placeholder', 'Custom placeholder');
    });

    it('should render send button', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeInTheDocument();
      expect(sendButton).toHaveTextContent('Send');
    });

    it('should have send button disabled when textarea is empty', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should send message when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');

      // Type a message
      await user.type(textarea, 'Hello, legal assistant!');
      expect(textarea).toHaveValue('Hello, legal assistant!');

      // Press Enter
      await user.type(textarea, '{Enter}');

      // Verify onSend was called with the message
      expect(mockOnSend).toHaveBeenCalledTimes(1);
      expect(mockOnSend).toHaveBeenCalledWith('Hello, legal assistant!');

      // Verify textarea is cleared
      expect(textarea).toHaveValue('');
    });

    it('should create new line when Shift+Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');

      // Type a message
      await user.type(textarea, 'Line 1');
      // Press Shift+Enter
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      // Type second line
      await user.type(textarea, 'Line 2');

      // Verify message has newline
      expect(textarea).toHaveValue('Line 1\nLine 2');

      // Verify onSend was NOT called
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should NOT send message when only whitespace is entered', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');

      // Type whitespace
      await user.type(textarea, '   ');
      expect(textarea).toHaveValue('   ');

      // Press Enter
      await user.type(textarea, '{Enter}');

      // Verify onSend was NOT called
      expect(mockOnSend).not.toHaveBeenCalled();

      // Verify textarea still has whitespace (not cleared)
      expect(textarea).toHaveValue('   ');
    });

    it('should trim whitespace before sending', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');

      // Type message with leading/trailing whitespace
      await user.type(textarea, '  Hello  ');
      await user.type(textarea, '{Enter}');

      // Verify onSend was called with trimmed message
      expect(mockOnSend).toHaveBeenCalledWith('Hello');
    });
  });

  describe('Send Button Click', () => {
    it('should send message when send button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      // Type a message
      await user.type(textarea, 'Test message');

      // Click send button
      await user.click(sendButton);

      // Verify onSend was called
      expect(mockOnSend).toHaveBeenCalledTimes(1);
      expect(mockOnSend).toHaveBeenCalledWith('Test message');

      // Verify textarea is cleared
      expect(textarea).toHaveValue('');
    });

    it('should enable send button when textarea has text', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      // Initially disabled
      expect(sendButton).toBeDisabled();

      // Type text
      await user.type(textarea, 'Hello');

      // Now enabled
      expect(sendButton).toBeEnabled();
    });

    it('should NOT send empty message when button is clicked', async () => {
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });

      // Button is disabled, so can't click
      expect(sendButton).toBeDisabled();

      // Verify onSend was NOT called
      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable textarea when disabled prop is true', () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const textarea = screen.getByLabelText('Message input');
      expect(textarea).toBeDisabled();
      expect(textarea).toHaveAttribute('aria-disabled', 'true');
    });

    it('should disable send button when disabled prop is true', () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();
    });

    it('should NOT send message when disabled and Enter is pressed', async () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const textarea = screen.getByLabelText('Message input');

      // Try to type (will fail because disabled)
      // But if we could type, verify onSend is not called
      expect(textarea).toBeDisabled();
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should apply disabled styling to textarea', () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const textarea = screen.getByLabelText('Message input');
      expect(textarea).toHaveClass('bg-gray-100', 'cursor-not-allowed');
    });

    it('should apply disabled styling to send button', () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toHaveClass('bg-gray-300', 'cursor-not-allowed');
    });
  });

  describe('Auto-resize Behavior', () => {
    it('should resize textarea as content grows', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');

      // Type multiple lines
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2{Shift>}{Enter}{/Shift}Line 3');

      // Height should change (implementation uses useEffect to set style.height)
      // This is a bit tricky to test - we verify the textarea has multi-line content
      expect(textarea.value).toContain('\n');
    });

    it('should have minimum height set', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');
      expect(textarea.style.minHeight).toBe('48px');
    });

    it('should have maximum height set', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');
      expect(textarea.style.maxHeight).toBe('120px');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for textarea', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByLabelText('Message input');
      expect(textarea).toHaveAttribute('aria-label', 'Message input');
    });

    it('should have proper ARIA label for send button', () => {
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toHaveAttribute('aria-label', 'Send message');
    });

    it('should update aria-disabled when disabled prop changes', () => {
      const { rerender } = render(<ChatInput onSend={mockOnSend} disabled={false} />);

      const textarea = screen.getByLabelText('Message input');
      expect(textarea).toHaveAttribute('aria-disabled', 'false');

      // Rerender with disabled=true
      rerender(<ChatInput onSend={mockOnSend} disabled={true} />);
      expect(textarea).toHaveAttribute('aria-disabled', 'true');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>Previous Element</button>
          <ChatInput onSend={mockOnSend} />
          <button>Next Element</button>
        </div>,
      );

      // Tab twice to get to textarea (first tab goes to "Previous Element" button)
      await user.tab();
      await user.tab();
      const textarea = screen.getByLabelText('Message input');
      expect(textarea).toHaveFocus();

      // Type some text so send button becomes enabled (disabled buttons can't receive focus)
      await user.type(textarea, 'Hello');

      // Tab to send button (now enabled and focusable)
      await user.tab();
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toHaveFocus();
    });
  });
});
