/**
 * AppearanceSettings Component Tests
 *
 * Tests for the extracted AppearanceSettings component including:
 * - Loading settings from localStorage
 * - Toggling appearance settings (dark mode)
 * - Changing font size
 * - Voice input settings (microphone, language, auto-transcribe)
 * - Accessibility settings (high contrast, screen reader)
 * - Persisting changes to localStorage
 * - Default values when localStorage is empty
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceSettings } from './AppearanceSettings';

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

describe('AppearanceSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial Load', () => {
    it('should load default appearance settings when localStorage is empty', () => {
      render(<AppearanceSettings />);

      // Dark mode should default to enabled (true)
      const darkModeToggle = screen.getByLabelText(/toggle dark mode/i);
      expect(darkModeToggle).toHaveAttribute('aria-pressed', 'true');

      // Font size should default to 'medium'
      const fontSizeSelect = screen.getByLabelText(/font size/i);
      expect(fontSizeSelect).toHaveValue('medium');

      // Should display all sections
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Voice Input')).toBeInTheDocument();
      expect(screen.getByText('Accessibility')).toBeInTheDocument();
    });

    it('should load saved appearance settings from localStorage', () => {
      localStorage.setItem('darkMode', 'false');
      localStorage.setItem('fontSize', 'large');
      localStorage.setItem('selectedMicrophone', 'system');
      localStorage.setItem('speechLanguage', 'en-US');
      localStorage.setItem('autoTranscribe', 'false');
      localStorage.setItem('highContrast', 'true');
      localStorage.setItem('screenReaderSupport', 'false');

      render(<AppearanceSettings />);

      const darkModeToggle = screen.getByLabelText(/toggle dark mode/i);
      expect(darkModeToggle).toHaveAttribute('aria-pressed', 'false');

      const fontSizeSelect = screen.getByLabelText(/font size/i);
      expect(fontSizeSelect).toHaveValue('large');

      const microphoneSelect = screen.getByLabelText(/microphone/i);
      expect(microphoneSelect).toHaveValue('system');

      const languageSelect = screen.getByLabelText(/language/i);
      expect(languageSelect).toHaveValue('en-US');

      const autoTranscribeToggle = screen.getByLabelText(/toggle auto-transcribe/i);
      expect(autoTranscribeToggle).toHaveAttribute('aria-pressed', 'false');

      const highContrastToggle = screen.getByLabelText(/toggle high contrast mode/i);
      expect(highContrastToggle).toHaveAttribute('aria-pressed', 'true');

      const screenReaderToggle = screen.getByLabelText(/toggle screen reader support/i);
      expect(screenReaderToggle).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Appearance Settings', () => {
    it('should toggle dark mode on and off', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const darkModeToggle = screen.getByLabelText(/toggle dark mode/i);

      // Initially enabled (true)
      expect(darkModeToggle).toHaveAttribute('aria-pressed', 'true');

      // Click to disable
      await user.click(darkModeToggle);
      expect(darkModeToggle).toHaveAttribute('aria-pressed', 'false');

      // Click to enable again
      await user.click(darkModeToggle);
      expect(darkModeToggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('should change font size', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const fontSizeSelect = screen.getByLabelText(/font size/i);

      // Initially 'medium'
      expect(fontSizeSelect).toHaveValue('medium');

      // Change to 'large'
      await user.selectOptions(fontSizeSelect, 'large');
      expect(fontSizeSelect).toHaveValue('large');

      // Change to 'small'
      await user.selectOptions(fontSizeSelect, 'small');
      expect(fontSizeSelect).toHaveValue('small');
    });

    it('should persist dark mode to localStorage', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const darkModeToggle = screen.getByLabelText(/toggle dark mode/i);

      // Toggle off
      await user.click(darkModeToggle);
      expect(localStorage.getItem('darkMode')).toBe('false');

      // Toggle back on
      await user.click(darkModeToggle);
      expect(localStorage.getItem('darkMode')).toBe('true');
    });

    it('should persist font size to localStorage', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const fontSizeSelect = screen.getByLabelText(/font size/i);

      await user.selectOptions(fontSizeSelect, 'large');
      expect(localStorage.getItem('fontSize')).toBe('large');

      await user.selectOptions(fontSizeSelect, 'small');
      expect(localStorage.getItem('fontSize')).toBe('small');
    });
  });

  describe('Voice Input Settings', () => {
    it('should change microphone selection', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const microphoneSelect = screen.getByLabelText(/microphone/i);

      // Initially 'default'
      expect(microphoneSelect).toHaveValue('default');

      // Change to 'system'
      await user.selectOptions(microphoneSelect, 'system');
      expect(microphoneSelect).toHaveValue('system');
    });

    it('should change speech language', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const languageSelect = screen.getByLabelText(/language/i);

      // Initially 'en-GB'
      expect(languageSelect).toHaveValue('en-GB');

      // Change to 'en-US'
      await user.selectOptions(languageSelect, 'en-US');
      expect(languageSelect).toHaveValue('en-US');
    });

    it('should toggle auto-transcribe on and off', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const autoTranscribeToggle = screen.getByLabelText(/toggle auto-transcribe/i);

      // Initially enabled (true)
      expect(autoTranscribeToggle).toHaveAttribute('aria-pressed', 'true');

      // Click to disable
      await user.click(autoTranscribeToggle);
      expect(autoTranscribeToggle).toHaveAttribute('aria-pressed', 'false');

      // Click to enable again
      await user.click(autoTranscribeToggle);
      expect(autoTranscribeToggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('should persist voice input settings to localStorage', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const microphoneSelect = screen.getByLabelText(/microphone/i);
      const languageSelect = screen.getByLabelText(/language/i);
      const autoTranscribeToggle = screen.getByLabelText(/toggle auto-transcribe/i);

      await user.selectOptions(microphoneSelect, 'system');
      expect(localStorage.getItem('selectedMicrophone')).toBe('system');

      await user.selectOptions(languageSelect, 'en-US');
      expect(localStorage.getItem('speechLanguage')).toBe('en-US');

      await user.click(autoTranscribeToggle);
      expect(localStorage.getItem('autoTranscribe')).toBe('false');
    });
  });

  describe('Accessibility Settings', () => {
    it('should toggle high contrast mode on and off', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const highContrastToggle = screen.getByLabelText(/toggle high contrast mode/i);

      // Initially disabled (false)
      expect(highContrastToggle).toHaveAttribute('aria-pressed', 'false');

      // Click to enable
      await user.click(highContrastToggle);
      expect(highContrastToggle).toHaveAttribute('aria-pressed', 'true');

      // Click to disable again
      await user.click(highContrastToggle);
      expect(highContrastToggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('should toggle screen reader support on and off', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const screenReaderToggle = screen.getByLabelText(/toggle screen reader support/i);

      // Initially enabled (true)
      expect(screenReaderToggle).toHaveAttribute('aria-pressed', 'true');

      // Click to disable
      await user.click(screenReaderToggle);
      expect(screenReaderToggle).toHaveAttribute('aria-pressed', 'false');

      // Click to enable again
      await user.click(screenReaderToggle);
      expect(screenReaderToggle).toHaveAttribute('aria-pressed', 'true');
    });

    it('should persist accessibility settings to localStorage', async () => {
      const user = userEvent.setup();
      render(<AppearanceSettings />);

      const highContrastToggle = screen.getByLabelText(/toggle high contrast mode/i);
      const screenReaderToggle = screen.getByLabelText(/toggle screen reader support/i);

      // Toggle high contrast on
      await user.click(highContrastToggle);
      expect(localStorage.getItem('highContrast')).toBe('true');

      // Toggle screen reader off
      await user.click(screenReaderToggle);
      expect(localStorage.getItem('screenReaderSupport')).toBe('false');
    });

    it('should display keyboard shortcuts button', () => {
      render(<AppearanceSettings />);

      const keyboardShortcutsButton = screen.getByRole('button', { name: /keyboard shortcuts/i });
      expect(keyboardShortcutsButton).toBeInTheDocument();
    });
  });
});
