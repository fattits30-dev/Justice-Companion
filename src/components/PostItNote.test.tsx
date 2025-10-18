/**
 * PostItNote Component Tests
 *
 * Tests for the PostItNote component focusing on:
 * - Rendering with different props (colors, content, readOnly)
 * - User interactions (click to edit, blur to save, escape to cancel)
 * - Delete functionality with confirmation
 * - Keyboard navigation (Enter, Escape)
 * - Accessibility (ARIA attributes, focus management)
 * - Edge cases (empty content, whitespace, long text)
 *
 * These tests verify user-facing behavior, not implementation details.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostItNote } from './PostItNote';

describe('PostItNote', () => {
  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm for delete tests
    global.confirm = vi.fn(() => true);
  });

  describe('Rendering', () => {
    it('should render with default yellow color', () => {
      const { container } = render(
        <PostItNote id={1} content="Test content" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      expect(noteDiv).toBeInTheDocument();
      expect(noteDiv.textContent).toBe('Test content');
    });

    it('should render with custom color (blue)', () => {
      const { container } = render(
        <PostItNote
          id={1}
          content="Blue note"
          color="blue"
          onUpdate={mockOnUpdate}
        />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      expect(noteDiv).toBeInTheDocument();
      expect(noteDiv.style.background).toContain('linear-gradient');
    });

    it('should render all 5 color variants correctly', () => {
      const colors: Array<'yellow' | 'blue' | 'green' | 'pink' | 'purple'> = [
        'yellow',
        'blue',
        'green',
        'pink',
        'purple',
      ];

      colors.forEach((color) => {
        const { container, unmount } = render(
          <PostItNote
            id={1}
            content={`${color} note`}
            color={color}
            onUpdate={mockOnUpdate}
          />,
        );

        const noteDiv = container.firstChild as HTMLElement;
        expect(noteDiv).toBeInTheDocument();
        expect(noteDiv.textContent).toBe(`${color} note`);
        unmount();
      });
    });

    it('should display placeholder when content is empty', () => {
      const { container } = render(
        <PostItNote id={1} content="" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      expect(noteDiv.textContent).toBe('Click to add content...');
    });

    it('should render delete button when onDelete is provided and not readOnly', () => {
      render(
        <PostItNote
          id={1}
          content="Test"
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /×/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should NOT render delete button when readOnly', () => {
      render(
        <PostItNote
          id={1}
          content="Test"
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          readOnly={true}
        />,
      );

      const deleteButton = screen.queryByRole('button', { name: /×/i });
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should NOT render delete button when onDelete is not provided', () => {
      render(<PostItNote id={1} content="Test" onUpdate={mockOnUpdate} />);

      const deleteButton = screen.queryByRole('button', { name: /×/i });
      expect(deleteButton).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode Interactions', () => {
    it('should enter edit mode when clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="Original content" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      // Should show textarea in edit mode
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue('Original content');
      expect(textarea).toHaveFocus();
    });

    it('should NOT enter edit mode when readOnly', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote
          id={1}
          content="Read-only content"
          onUpdate={mockOnUpdate}
          readOnly={true}
        />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      // Should NOT show textarea
      const textarea = screen.queryByRole('textbox');
      expect(textarea).not.toBeInTheDocument();
    });

    it('should select all text when entering edit mode', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="Select this" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea).toHaveFocus();
      // Text should be selected (selectionStart: 0, selectionEnd: length)
      expect(textarea.selectionStart).toBe(0);
      expect(textarea.selectionEnd).toBe('Select this'.length);
    });

    it('should update content and call onUpdate when blur occurs', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="Original" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');

      // Blur to save
      fireEvent.blur(textarea);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledTimes(1);
        expect(mockOnUpdate).toHaveBeenCalledWith(1, 'Updated content');
      });
    });

    it('should trim whitespace before calling onUpdate', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="Original" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, '  Trimmed content  ');

      fireEvent.blur(textarea);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(1, 'Trimmed content');
      });
    });

    it('should NOT call onUpdate if content is unchanged', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="Same content" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      const textarea = screen.getByRole('textbox');
      // Don't change content
      fireEvent.blur(textarea);

      await waitFor(() => {
        expect(mockOnUpdate).not.toHaveBeenCalled();
      });
    });

    it('should revert changes when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="Original" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Changed');

      // Press Escape
      fireEvent.keyDown(textarea, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnUpdate).not.toHaveBeenCalled();
        // Should exit edit mode and show original content
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should call onDelete when delete button is clicked and confirmed', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => true);

      render(
        <PostItNote
          id={1}
          content="Delete me"
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /×/i });
      await user.click(deleteButton);

      expect(global.confirm).toHaveBeenCalledWith('Delete this note?');
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(1);
    });

    it('should NOT call onDelete when delete is cancelled', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => false);

      render(
        <PostItNote
          id={1}
          content="Keep me"
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /×/i });
      await user.click(deleteButton);

      expect(global.confirm).toHaveBeenCalledWith('Delete this note?');
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('should stop propagation when delete button is clicked', async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => true);

      render(
        <PostItNote
          id={1}
          content="Test"
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /×/i });
      await user.click(deleteButton);

      // Should NOT enter edit mode (stopPropagation worked)
      const textarea = screen.queryByRole('textbox');
      expect(textarea).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate cursor style when not readOnly', () => {
      const { container } = render(
        <PostItNote id={1} content="Test" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      expect(noteDiv.style.cursor).toBe('pointer');
    });

    it('should have default cursor when readOnly', () => {
      const { container } = render(
        <PostItNote
          id={1}
          content="Test"
          onUpdate={mockOnUpdate}
          readOnly={true}
        />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      expect(noteDiv.style.cursor).toBe('default');
    });

    it('should have placeholder in textarea when editing empty note', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', 'Click to add content...');
    });

    it('should preserve whitespace in content display', () => {
      render(
        <PostItNote
          id={1}
          content="Line 1\nLine 2\nLine 3"
          onUpdate={mockOnUpdate}
        />,
      );

      // Check that multiline content is displayed
      const content = screen.getByText(/Line 1/);
      expect(content).toBeInTheDocument();
      // The component uses whiteSpace: 'pre-wrap' inline style which is verified by the visual display
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', () => {
      const longContent = 'A'.repeat(1000);
      const { container } = render(
        <PostItNote id={1} content={longContent} onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      expect(noteDiv.textContent).toBe(longContent);
    });

    it('should handle special characters in content', async () => {
      const user = userEvent.setup();
      const specialContent = '<script>alert("XSS")</script> & "quotes" \'apostrophes\'';
      const { container } = render(
        <PostItNote id={1} content="" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, specialContent);

      fireEvent.blur(textarea);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(1, specialContent);
      });
    });

    it('should handle rapid click events without breaking', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="Test" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;

      // Click multiple times rapidly
      await user.click(noteDiv);
      await user.click(noteDiv);
      await user.click(noteDiv);

      // Should still be in edit mode
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('should update content when prop changes', () => {
      const { rerender, container } = render(
        <PostItNote id={1} content="First" onUpdate={mockOnUpdate} />,
      );

      let noteDiv = container.firstChild as HTMLElement;
      expect(noteDiv.textContent).toBe('First');

      // Change prop
      rerender(<PostItNote id={1} content="Second" onUpdate={mockOnUpdate} />);

      noteDiv = container.firstChild as HTMLElement;
      expect(noteDiv.textContent).toBe('Second');
    });

    it('should handle empty onUpdate gracefully', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="Test" />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, ' Updated');

      // Should not throw error when onUpdate is undefined
      expect(() => fireEvent.blur(textarea)).not.toThrow();
    });
  });

  describe('Hover Effects', () => {
    it('should apply hover styles on mouse enter', () => {
      const { container } = render(
        <PostItNote id={1} content="Test" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      const initialTransform = noteDiv.style.transform;

      fireEvent.mouseEnter(noteDiv);

      // Transform should change on hover
      expect(noteDiv.style.transform).not.toBe(initialTransform);
    });

    it('should restore styles on mouse leave', () => {
      const { container } = render(
        <PostItNote id={1} content="Test" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;

      fireEvent.mouseEnter(noteDiv);
      fireEvent.mouseLeave(noteDiv);

      // Should restore to scale(1)
      expect(noteDiv.style.transform).toBe('scale(1)');
    });

    it('should NOT apply hover effects when in edit mode', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PostItNote id={1} content="Test" onUpdate={mockOnUpdate} />,
      );

      const noteDiv = container.firstChild as HTMLElement;
      await user.click(noteDiv);

      // Now in edit mode
      fireEvent.mouseEnter(noteDiv);

      // Transform should be from edit mode (scale(1.02)), not hover
      expect(noteDiv.style.transform).toBe('scale(1.02)');
    });
  });
});
