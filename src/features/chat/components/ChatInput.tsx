import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';

/**
 * Props for ChatInput component
 */
interface ChatInputProps {
  /** Callback when user sends a message */
  onSend: (message: string) => void;
  /** Whether input is disabled (e.g., during streaming) */
  disabled?: boolean;
  /** Placeholder text for the textarea */
  placeholder?: string;
}

/**
 * ChatInput - Textarea with send button and keyboard shortcuts
 *
 * Features:
 * - Enter key: Send message (prevents default new line)
 * - Shift+Enter: Insert new line (allows default behavior)
 * - Auto-resize: Grows as user types (max 5 lines)
 * - Disabled state: Gray background, cursor-not-allowed
 * - Keyboard accessible: ARIA labels, focus states
 * - Send button disabled when empty or component disabled
 *
 * @param props - ChatInputProps
 * @returns React component
 */
export function ChatInput({ onSend, disabled = false, placeholder = 'Ask a legal question...' }: ChatInputProps) {
  const [value, setValue] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content (max 5 lines ≈ 120px)
  const MAX_HEIGHT = 120;

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get accurate scrollHeight
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, MAX_HEIGHT);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  /**
   * Handle textarea value change
   */
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setValue(e.target.value);
  };

  /**
   * Handle keyboard shortcuts
   * - Enter: Send message (prevent default)
   * - Shift+Enter: Allow new line (default behavior)
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      handleSend();
    }
    // Shift+Enter naturally inserts new line (default behavior)
  };

  /**
   * Send message and clear input
   */
  const handleSend = (): void => {
    const trimmedValue = value.trim();
    if (trimmedValue && !disabled) {
      onSend(trimmedValue);
      setValue(''); // Clear input after send
    }
  };

  const isButtonDisabled = disabled || !value.trim();

  return (
    <div className="flex items-end gap-2 p-4 bg-white border-t border-gray-200">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Message input"
        aria-disabled={disabled ? 'true' : 'false'}
        className={`
          flex-1 resize-none rounded-lg border px-4 py-3
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors
          ${
    disabled
      ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
      : 'bg-white border-gray-300 text-gray-900'
    }
        `}
        rows={1}
        style={{ minHeight: '48px', maxHeight: `${MAX_HEIGHT}px` }}
      />

      {/* Send button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={isButtonDisabled}
        aria-label="Send message"
        className={`
          px-6 py-3 rounded-lg font-medium transition-all
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${
    isButtonDisabled
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
    }
        `}
      >
        Send
      </button>
    </div>
  );
}
