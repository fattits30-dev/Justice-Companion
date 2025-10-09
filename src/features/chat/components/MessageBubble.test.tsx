/**
 * MessageBubble Component Tests
 *
 * Tests for the MessageBubble component focusing on:
 * - Rendering user vs assistant messages with correct styling
 * - Timestamp display
 * - Markdown rendering for assistant messages
 * - Source citations display
 * - AI reasoning process dropdown
 * - Streaming indicator
 * - Per-message disclaimer
 *
 * These tests verify user-facing behavior and accessibility.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test-utils/test-utils';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@/types/ai';

// Mock SourceCitation component to simplify testing
vi.mock('../../../components/SourceCitation', () => ({
  SourceCitation: ({ sources }: { sources: string[] }) => (
    <div data-testid="source-citation">Sources: {sources.length}</div>
  ),
}));

describe('MessageBubble', () => {
  describe('User Messages', () => {
    const userMessage: ChatMessage = {
      role: 'user',
      content: 'What are my rights as an employee?',
      timestamp: '2025-10-05T14:30:00.000Z',
    };

    it('should render user message with correct styling', () => {
      render(<MessageBubble message={userMessage} />);

      // Find the message bubble by content
      const messageContent = screen.getByText('What are my rights as an employee?');
      const messageBubble = messageContent.parentElement;

      expect(messageBubble).toHaveClass('bg-blue-600', 'text-white');
    });

    it('should align user message to the right', () => {
      render(<MessageBubble message={userMessage} />);

      // The outer container should have justify-end
      const messageContent = screen.getByText('What are my rights as an employee?');
      const container = messageContent.closest('div.flex');
      expect(container).toHaveClass('justify-end');
    });

    it('should render user message as plain text (not markdown)', () => {
      const messageWithMarkdown: ChatMessage = {
        role: 'user',
        content: '**Bold** and *italic* text',
        timestamp: '2025-10-05T14:30:00.000Z',
      };

      render(<MessageBubble message={messageWithMarkdown} />);

      // User messages should show markdown syntax as-is (not rendered)
      expect(screen.getByText('**Bold** and *italic* text')).toBeInTheDocument();
      // Should NOT have HTML elements like <strong> or <em>
      expect(screen.queryByText('Bold')).not.toBeInTheDocument();
    });

    it('should display timestamp for user message', () => {
      render(<MessageBubble message={userMessage} />);

      // Check for timestamp presence (format may vary by locale)
      // Just verify that some timestamp text is rendered
      const timestampContainer = screen.getByText(/:/);
      expect(timestampContainer).toBeInTheDocument();
      expect(timestampContainer).toHaveClass('text-gray-500');
    });

    it('should NOT show sources for user message', () => {
      render(<MessageBubble message={userMessage} sources={['Source 1', 'Source 2']} />);

      // Source citation should not be rendered for user messages
      expect(screen.queryByTestId('source-citation')).not.toBeInTheDocument();
    });

    it('should NOT show disclaimer for user message', () => {
      render(<MessageBubble message={userMessage} />);

      // Disclaimer should not be present
      expect(screen.queryByText(/General information only/i)).not.toBeInTheDocument();
    });

    it('should show streaming indicator for user message', () => {
      render(<MessageBubble message={userMessage} isStreaming={true} />);

      // Find the message bubble
      const messageContent = screen.getByText('What are my rights as an employee?');
      const messageBubble = messageContent.parentElement!;

      // Should have a streaming indicator span with pulse animation
      const streamingIndicator = messageBubble.querySelector('.animate-pulse');
      expect(streamingIndicator).toBeInTheDocument();
    });

    it('should NOT show timestamp when streaming', () => {
      render(<MessageBubble message={userMessage} isStreaming={true} />);

      // Timestamp should not be visible during streaming
      expect(screen.queryByText('14:30')).not.toBeInTheDocument();
    });
  });

  describe('Assistant Messages', () => {
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: 'The **Employment Rights Act 1996** protects your rights.',
      timestamp: '2025-10-05T14:30:30.000Z',
    };

    it('should render assistant message with correct styling', () => {
      render(<MessageBubble message={assistantMessage} />);

      // Assistant messages have white background
      const messageContainer = screen.getByText(/Employment Rights Act 1996/i).closest('.rounded-lg');
      expect(messageContainer).toHaveClass('bg-white', 'text-gray-900', 'border');
    });

    it('should align assistant message to the left', () => {
      render(<MessageBubble message={assistantMessage} />);

      // The outer container should have justify-start
      const messageContent = screen.getByText(/Employment Rights Act 1996/i);
      const container = messageContent.closest('div.flex');
      expect(container).toHaveClass('justify-start');
    });

    it('should render assistant message as markdown', () => {
      render(<MessageBubble message={assistantMessage} />);

      // Markdown should be rendered (bold text)
      const boldText = screen.getByText('Employment Rights Act 1996');
      expect(boldText.tagName).toBe('STRONG');
    });

    it('should display timestamp for assistant message', () => {
      render(<MessageBubble message={assistantMessage} />);

      // Check for timestamp presence (format may vary by locale)
      const timestampContainer = screen.getByText(/:/);
      expect(timestampContainer).toBeInTheDocument();
      expect(timestampContainer).toHaveClass('text-gray-500');
    });

    it('should show sources when provided', () => {
      const sources = ['Employment Rights Act 1996 - https://legislation.gov.uk', 'Case Law - https://bailii.org'];
      render(<MessageBubble message={assistantMessage} sources={sources} />);

      // Source citation component should be rendered
      const sourceCitation = screen.getByTestId('source-citation');
      expect(sourceCitation).toBeInTheDocument();
      expect(sourceCitation).toHaveTextContent('Sources: 2');
    });

    it('should NOT show sources when empty array', () => {
      render(<MessageBubble message={assistantMessage} sources={[]} />);

      // Source citation should not be rendered
      expect(screen.queryByTestId('source-citation')).not.toBeInTheDocument();
    });

    it('should show disclaimer for assistant message', () => {
      render(<MessageBubble message={assistantMessage} />);

      // Disclaimer should be present
      expect(screen.getByText(/General information only - consult a solicitor for legal advice/i)).toBeInTheDocument();
    });

    it('should NOT show disclaimer when streaming', () => {
      render(<MessageBubble message={assistantMessage} isStreaming={true} />);

      // Disclaimer should not be shown during streaming
      expect(screen.queryByText(/General information only/i)).not.toBeInTheDocument();
    });

    it('should render markdown lists correctly', () => {
      const messageWithList: ChatMessage = {
        role: 'assistant',
        content: 'Your options:\n- Option 1\n- Option 2\n- Option 3',
        timestamp: '2025-10-05T14:30:30.000Z',
      };

      render(<MessageBubble message={messageWithList} />);

      // Check that list items are rendered
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('should render markdown code blocks correctly', () => {
      const messageWithCode: ChatMessage = {
        role: 'assistant',
        content: 'Here is code: `const x = 10;`',
        timestamp: '2025-10-05T14:30:30.000Z',
      };

      render(<MessageBubble message={messageWithCode} />);

      // Code should be in a <code> element with styling
      const codeElement = screen.getByText('const x = 10;');
      expect(codeElement.tagName).toBe('CODE');
    });
  });

  describe('AI Reasoning Process', () => {
    const messageWithReasoning: ChatMessage = {
      role: 'assistant',
      content: 'The Employment Rights Act 1996 protects your rights.',
      timestamp: '2025-10-05T14:30:30.000Z',
      thinkingContent: 'Let me analyze the Employment Rights Act 1996...\nSection 94 covers unfair dismissal...',
    };

    it('should show reasoning dropdown when thinkingContent is present', () => {
      render(<MessageBubble message={messageWithReasoning} />);

      // Reasoning button should be present
      const reasoningButton = screen.getByRole('button', { name: /Expand AI reasoning process/i });
      expect(reasoningButton).toBeInTheDocument();
      expect(reasoningButton).toHaveTextContent('AI Reasoning Process');
    });

    it('should NOT show reasoning dropdown when thinkingContent is null', () => {
      const messageWithoutReasoning: ChatMessage = {
        role: 'assistant',
        content: 'Simple response',
        timestamp: '2025-10-05T14:30:30.000Z',
        thinkingContent: null,
      };

      render(<MessageBubble message={messageWithoutReasoning} />);

      // Reasoning button should not be present
      expect(screen.queryByRole('button', { name: /AI reasoning/i })).not.toBeInTheDocument();
    });

    it('should NOT show reasoning dropdown when thinkingContent is empty string', () => {
      const messageWithEmptyReasoning: ChatMessage = {
        role: 'assistant',
        content: 'Simple response',
        timestamp: '2025-10-05T14:30:30.000Z',
        thinkingContent: '',
      };

      render(<MessageBubble message={messageWithEmptyReasoning} />);

      // Reasoning button should not be present
      expect(screen.queryByRole('button', { name: /AI reasoning/i })).not.toBeInTheDocument();
    });

    it('should expand and collapse reasoning content when clicked', async () => {
      const user = userEvent.setup();
      render(<MessageBubble message={messageWithReasoning} />);

      const reasoningButton = screen.getByRole('button', { name: /Expand AI reasoning process/i });

      // Initially collapsed - content should not be visible
      expect(screen.queryByText(/Let me analyze the Employment Rights Act 1996/i)).not.toBeInTheDocument();

      // Click to expand
      await user.click(reasoningButton);

      // Content should now be visible
      expect(screen.getByText(/Let me analyze the Employment Rights Act 1996/i)).toBeInTheDocument();

      // Button label should change
      expect(screen.getByRole('button', { name: /Collapse AI reasoning process/i })).toBeInTheDocument();

      // Click to collapse
      await user.click(reasoningButton);

      // Content should be hidden again
      expect(screen.queryByText(/Let me analyze the Employment Rights Act 1996/i)).not.toBeInTheDocument();
    });

    it('should have proper ARIA attributes for reasoning button', () => {
      render(<MessageBubble message={messageWithReasoning} />);

      const reasoningButton = screen.getByRole('button', { name: /Expand AI reasoning process/i });

      // Should have aria-expanded attribute
      expect(reasoningButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when reasoning is expanded', async () => {
      const user = userEvent.setup();
      render(<MessageBubble message={messageWithReasoning} />);

      const reasoningButton = screen.getByRole('button', { name: /Expand AI reasoning process/i });

      // Click to expand
      await user.click(reasoningButton);

      // aria-expanded should be true
      expect(reasoningButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should only show reasoning for assistant messages', () => {
      const userMessageWithReasoning: ChatMessage = {
        role: 'user',
        content: 'Question?',
        timestamp: '2025-10-05T14:30:00.000Z',
        thinkingContent: 'User thinking...',
      };

      render(<MessageBubble message={userMessageWithReasoning} />);

      // Reasoning should NOT be shown for user messages
      expect(screen.queryByRole('button', { name: /AI reasoning/i })).not.toBeInTheDocument();
    });
  });

  describe('Streaming State', () => {
    const streamingMessage: ChatMessage = {
      role: 'assistant',
      content: 'Streaming response in progres',
      timestamp: '2025-10-05T14:30:30.000Z',
    };

    it('should show streaming indicator for assistant message', () => {
      render(<MessageBubble message={streamingMessage} isStreaming={true} />);

      // Find the prose container
      const proseContainer = screen.getByText('Streaming response in progres').closest('.prose');
      expect(proseContainer).toBeInTheDocument();

      // Should have a streaming indicator with pulse animation
      const streamingIndicator = proseContainer!.querySelector('.animate-pulse');
      expect(streamingIndicator).toBeInTheDocument();
      expect(streamingIndicator).toHaveClass('bg-gray-400');
    });

    it('should NOT show timestamp when streaming', () => {
      render(<MessageBubble message={streamingMessage} isStreaming={true} />);

      // Timestamp should not be visible
      expect(screen.queryByText('14:30')).not.toBeInTheDocument();
    });

    it('should NOT show disclaimer when streaming', () => {
      render(<MessageBubble message={streamingMessage} isStreaming={true} />);

      // Disclaimer should not be visible
      expect(screen.queryByText(/General information only/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: 'Test response',
      timestamp: '2025-10-05T14:30:30.000Z',
      thinkingContent: 'Reasoning content',
    };

    it('should have proper ARIA label for reasoning button', () => {
      render(<MessageBubble message={assistantMessage} />);

      const reasoningButton = screen.getByRole('button', { name: 'Expand AI reasoning process' });
      expect(reasoningButton).toHaveAttribute('aria-label', 'Expand AI reasoning process');
    });

    it('should update ARIA label when reasoning is expanded', async () => {
      const user = userEvent.setup();
      render(<MessageBubble message={assistantMessage} />);

      const reasoningButton = screen.getByRole('button', { name: 'Expand AI reasoning process' });

      // Expand
      await user.click(reasoningButton);

      // Label should change
      expect(reasoningButton).toHaveAttribute('aria-label', 'Collapse AI reasoning process');
    });

    it('should have semantic HTML for message content', () => {
      render(<MessageBubble message={assistantMessage} />);

      // Markdown should render semantic HTML (div with prose class)
      const proseContainer = screen.getByText('Test response').closest('.prose');
      expect(proseContainer).toBeInTheDocument();
    });

    it('should preserve whitespace in user messages', () => {
      const messageWithWhitespace: ChatMessage = {
        role: 'user',
        content: 'Line 1\nLine 2\n  Indented',
        timestamp: '2025-10-05T14:30:00.000Z',
      };

      render(<MessageBubble message={messageWithWhitespace} />);

      // User messages have whitespace-pre-wrap class
      const messageContent = screen.getByText(/Line 1/);
      expect(messageContent).toHaveClass('whitespace-pre-wrap');
    });
  });
});
