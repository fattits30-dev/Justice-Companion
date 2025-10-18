/**
 * AIConfigurationSettings Component Tests
 *
 * Tests for the extracted AIConfigurationSettings component including:
 * - Loading AI settings from localStorage
 * - Toggling RAG (Enhanced legal responses)
 * - Changing response length, citation detail, and jurisdiction
 * - Persisting changes to localStorage
 * - Default values when localStorage is empty
 * - Integration with OpenAISettings component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIConfigurationSettings } from './AIConfigurationSettings';

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

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

describe('AIConfigurationSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial Load', () => {
    it('should load default AI settings when localStorage is empty', () => {
      render(<AIConfigurationSettings toast={mockToast} />);

      // RAG should default to enabled (true)
      const ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);
      expect(ragToggle).toHaveAttribute('aria-pressed', 'true');

      // Response length should default to 'balanced'
      const responseLengthSelect = screen.getByLabelText(/response length/i);
      expect(responseLengthSelect).toHaveValue('balanced');

      // Citation detail should default to 'detailed'
      const citationDetailSelect = screen.getByLabelText(/citation detail/i);
      expect(citationDetailSelect).toHaveValue('detailed');

      // Jurisdiction should default to 'uk-england-wales'
      const jurisdictionSelect = screen.getByLabelText(/jurisdiction/i);
      expect(jurisdictionSelect).toHaveValue('uk-england-wales');
    });

    it('should load saved AI settings from localStorage', () => {
      // Set up localStorage with saved settings (JSON format)
      localStorage.setItem('ragEnabled', 'false');
      localStorage.setItem('responseLength', JSON.stringify('detailed'));
      localStorage.setItem('citationDetail', JSON.stringify('comprehensive'));
      localStorage.setItem('jurisdiction', JSON.stringify('uk-scotland'));

      render(<AIConfigurationSettings toast={mockToast} />);

      const ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);
      expect(ragToggle).toHaveAttribute('aria-pressed', 'false');

      const responseLengthSelect = screen.getByLabelText(/response length/i);
      expect(responseLengthSelect).toHaveValue('detailed');

      const citationDetailSelect = screen.getByLabelText(/citation detail/i);
      expect(citationDetailSelect).toHaveValue('comprehensive');

      const jurisdictionSelect = screen.getByLabelText(/jurisdiction/i);
      expect(jurisdictionSelect).toHaveValue('uk-scotland');
    });

    it('should display all AI configuration sections', () => {
      render(<AIConfigurationSettings toast={mockToast} />);

      expect(screen.getByText('AI & Legal Data')).toBeInTheDocument();
      expect(screen.getByText('AI Provider Configuration')).toBeInTheDocument();
      expect(screen.getByText('Advanced AI')).toBeInTheDocument();
    });

    it('should display read-only legal data information', () => {
      render(<AIConfigurationSettings toast={mockToast} />);

      expect(screen.getByText('Data sources')).toBeInTheDocument();
      expect(
        screen.getByText('legislation.gov.uk, caselaw.nationalarchives.gov.uk')
      ).toBeInTheDocument();
      expect(screen.getByText('Response mode')).toBeInTheDocument();
      expect(screen.getByText('Information only - never legal advice')).toBeInTheDocument();
    });
  });

  describe('RAG Toggle', () => {
    it('should toggle RAG on and off', async () => {
      const user = userEvent.setup();
      render(<AIConfigurationSettings toast={mockToast} />);

      let ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);

      // Initially enabled (true)
      expect(ragToggle).toHaveAttribute('aria-pressed', 'true');

      // Click to disable
      await user.click(ragToggle);
      await waitFor(() => {
        ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);
        expect(ragToggle).toHaveAttribute('aria-pressed', 'false');
      });

      // Click to enable again
      await user.click(ragToggle);
      await waitFor(() => {
        ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);
        expect(ragToggle).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should persist RAG setting to localStorage', async () => {
      const user = userEvent.setup();
      render(<AIConfigurationSettings toast={mockToast} />);

      const ragToggle = screen.getByLabelText(/toggle enhanced legal responses/i);

      // Toggle off
      await user.click(ragToggle);
      await waitFor(() => {
        expect(localStorage.getItem('ragEnabled')).toBe('false');
      });

      // Toggle back on
      await user.click(ragToggle);
      await waitFor(() => {
        expect(localStorage.getItem('ragEnabled')).toBe('true');
      });
    });
  });

  describe('Response Length Setting', () => {
    it('should change response length', async () => {
      const user = userEvent.setup();
      render(<AIConfigurationSettings toast={mockToast} />);

      let responseLengthSelect = screen.getByLabelText(/response length/i);

      // Initially 'balanced'
      expect(responseLengthSelect).toHaveValue('balanced');

      // Change to 'detailed'
      await user.selectOptions(responseLengthSelect, 'detailed');
      await waitFor(() => {
        responseLengthSelect = screen.getByLabelText(/response length/i);
        expect(responseLengthSelect).toHaveValue('detailed');
      });

      // Change to 'concise'
      await user.selectOptions(responseLengthSelect, 'concise');
      await waitFor(() => {
        responseLengthSelect = screen.getByLabelText(/response length/i);
        expect(responseLengthSelect).toHaveValue('concise');
      });
    });

    it('should persist response length to localStorage', async () => {
      const user = userEvent.setup();
      render(<AIConfigurationSettings toast={mockToast} />);

      const responseLengthSelect = screen.getByLabelText(/response length/i);

      await user.selectOptions(responseLengthSelect, 'detailed');
      await waitFor(() => {
        expect(localStorage.getItem('responseLength')).toBe(JSON.stringify('detailed'));
      });

      await user.selectOptions(responseLengthSelect, 'concise');
      await waitFor(() => {
        expect(localStorage.getItem('responseLength')).toBe(JSON.stringify('concise'));
      });
    });
  });

  describe('Citation Detail Setting', () => {
    it('should change citation detail', async () => {
      const user = userEvent.setup();
      render(<AIConfigurationSettings toast={mockToast} />);

      let citationDetailSelect = screen.getByLabelText(/citation detail/i);

      // Initially 'detailed'
      expect(citationDetailSelect).toHaveValue('detailed');

      // Change to 'comprehensive'
      await user.selectOptions(citationDetailSelect, 'comprehensive');
      await waitFor(() => {
        citationDetailSelect = screen.getByLabelText(/citation detail/i);
        expect(citationDetailSelect).toHaveValue('comprehensive');
      });

      // Change to 'minimal'
      await user.selectOptions(citationDetailSelect, 'minimal');
      await waitFor(() => {
        citationDetailSelect = screen.getByLabelText(/citation detail/i);
        expect(citationDetailSelect).toHaveValue('minimal');
      });
    });

    it('should persist citation detail to localStorage', async () => {
      const user = userEvent.setup();
      render(<AIConfigurationSettings toast={mockToast} />);

      const citationDetailSelect = screen.getByLabelText(/citation detail/i);

      await user.selectOptions(citationDetailSelect, 'comprehensive');
      await waitFor(() => {
        expect(localStorage.getItem('citationDetail')).toBe(JSON.stringify('comprehensive'));
      });

      await user.selectOptions(citationDetailSelect, 'minimal');
      await waitFor(() => {
        expect(localStorage.getItem('citationDetail')).toBe(JSON.stringify('minimal'));
      });
    });
  });

  describe('Jurisdiction Setting', () => {
    it('should change jurisdiction', async () => {
      const user = userEvent.setup();
      render(<AIConfigurationSettings toast={mockToast} />);

      let jurisdictionSelect = screen.getByLabelText(/jurisdiction/i);

      // Initially 'uk-england-wales'
      expect(jurisdictionSelect).toHaveValue('uk-england-wales');

      // Change to 'uk-scotland'
      await user.selectOptions(jurisdictionSelect, 'uk-scotland');
      await waitFor(() => {
        jurisdictionSelect = screen.getByLabelText(/jurisdiction/i);
        expect(jurisdictionSelect).toHaveValue('uk-scotland');
      });

      // Change to 'uk-northern-ireland'
      await user.selectOptions(jurisdictionSelect, 'uk-northern-ireland');
      await waitFor(() => {
        jurisdictionSelect = screen.getByLabelText(/jurisdiction/i);
        expect(jurisdictionSelect).toHaveValue('uk-northern-ireland');
      });
    });

    it('should persist jurisdiction to localStorage', async () => {
      const user = userEvent.setup();
      render(<AIConfigurationSettings toast={mockToast} />);

      const jurisdictionSelect = screen.getByLabelText(/jurisdiction/i);

      await user.selectOptions(jurisdictionSelect, 'uk-scotland');
      await waitFor(() => {
        expect(localStorage.getItem('jurisdiction')).toBe(JSON.stringify('uk-scotland'));
      });

      await user.selectOptions(jurisdictionSelect, 'uk-northern-ireland');
      await waitFor(() => {
        expect(localStorage.getItem('jurisdiction')).toBe(JSON.stringify('uk-northern-ireland'));
      });
    });
  });
});
