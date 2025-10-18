/**
 * CaseManagementSettings Component Tests
 *
 * Tests for the extracted CaseManagementSettings component including:
 * - Loading case management settings from localStorage
 * - Changing default case type
 * - Changing auto-archive days
 * - Changing case numbering format
 * - Persisting changes to localStorage
 * - Default values when localStorage is empty
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseManagementSettings } from './CaseManagementSettings';

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

describe('CaseManagementSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial Load', () => {
    it('should load default case management settings when localStorage is empty', () => {
      render(<CaseManagementSettings />);

      // Default case type should be 'general'
      const caseTypeSelect = screen.getByLabelText(/default case type/i);
      expect(caseTypeSelect).toHaveValue('general');

      // Auto-archive should default to '90' days
      const autoArchiveSelect = screen.getByLabelText(/auto-archive after/i);
      expect(autoArchiveSelect).toHaveValue('90');

      // Case numbering should default to 'YYYY-NNNN'
      const caseNumberingSelect = screen.getByLabelText(/case numbering/i);
      expect(caseNumberingSelect).toHaveValue('YYYY-NNNN');
    });

    it('should load saved case management settings from localStorage', () => {
      // Set up localStorage with saved settings (JSON format)
      localStorage.setItem('defaultCaseType', JSON.stringify('employment'));
      localStorage.setItem('autoArchiveDays', JSON.stringify('180'));
      localStorage.setItem('caseNumberFormat', JSON.stringify('SEQUENTIAL'));

      render(<CaseManagementSettings />);

      const caseTypeSelect = screen.getByLabelText(/default case type/i);
      expect(caseTypeSelect).toHaveValue('employment');

      const autoArchiveSelect = screen.getByLabelText(/auto-archive after/i);
      expect(autoArchiveSelect).toHaveValue('180');

      const caseNumberingSelect = screen.getByLabelText(/case numbering/i);
      expect(caseNumberingSelect).toHaveValue('SEQUENTIAL');
    });

    it('should display case management section', () => {
      render(<CaseManagementSettings />);

      expect(screen.getByText('Case Management')).toBeInTheDocument();
      expect(screen.getByText('Configure case handling preferences')).toBeInTheDocument();
    });
  });

  describe('Default Case Type Setting', () => {
    it('should change default case type', async () => {
      const user = userEvent.setup();
      render(<CaseManagementSettings />);

      let caseTypeSelect = screen.getByLabelText(/default case type/i);

      // Initially 'general'
      expect(caseTypeSelect).toHaveValue('general');

      // Change to 'employment'
      await user.selectOptions(caseTypeSelect, 'employment');
      await waitFor(() => {
        caseTypeSelect = screen.getByLabelText(/default case type/i);
        expect(caseTypeSelect).toHaveValue('employment');
      });

      // Change to 'family'
      await user.selectOptions(caseTypeSelect, 'family');
      await waitFor(() => {
        caseTypeSelect = screen.getByLabelText(/default case type/i);
        expect(caseTypeSelect).toHaveValue('family');
      });

      // Change to 'housing'
      await user.selectOptions(caseTypeSelect, 'housing');
      await waitFor(() => {
        caseTypeSelect = screen.getByLabelText(/default case type/i);
        expect(caseTypeSelect).toHaveValue('housing');
      });

      // Change to 'immigration'
      await user.selectOptions(caseTypeSelect, 'immigration');
      await waitFor(() => {
        caseTypeSelect = screen.getByLabelText(/default case type/i);
        expect(caseTypeSelect).toHaveValue('immigration');
      });
    });

    it('should persist default case type to localStorage', async () => {
      const user = userEvent.setup();
      render(<CaseManagementSettings />);

      const caseTypeSelect = screen.getByLabelText(/default case type/i);

      await user.selectOptions(caseTypeSelect, 'employment');
      await waitFor(() => {
        expect(localStorage.getItem('defaultCaseType')).toBe(JSON.stringify('employment'));
      });

      await user.selectOptions(caseTypeSelect, 'family');
      await waitFor(() => {
        expect(localStorage.getItem('defaultCaseType')).toBe(JSON.stringify('family'));
      });
    });
  });

  describe('Auto-Archive Setting', () => {
    it('should change auto-archive days', async () => {
      const user = userEvent.setup();
      render(<CaseManagementSettings />);

      let autoArchiveSelect = screen.getByLabelText(/auto-archive after/i);

      // Initially '90'
      expect(autoArchiveSelect).toHaveValue('90');

      // Change to '30'
      await user.selectOptions(autoArchiveSelect, '30');
      await waitFor(() => {
        autoArchiveSelect = screen.getByLabelText(/auto-archive after/i);
        expect(autoArchiveSelect).toHaveValue('30');
      });

      // Change to '180'
      await user.selectOptions(autoArchiveSelect, '180');
      await waitFor(() => {
        autoArchiveSelect = screen.getByLabelText(/auto-archive after/i);
        expect(autoArchiveSelect).toHaveValue('180');
      });

      // Change to 'never'
      await user.selectOptions(autoArchiveSelect, 'never');
      await waitFor(() => {
        autoArchiveSelect = screen.getByLabelText(/auto-archive after/i);
        expect(autoArchiveSelect).toHaveValue('never');
      });
    });

    it('should persist auto-archive days to localStorage', async () => {
      const user = userEvent.setup();
      render(<CaseManagementSettings />);

      const autoArchiveSelect = screen.getByLabelText(/auto-archive after/i);

      await user.selectOptions(autoArchiveSelect, '180');
      await waitFor(() => {
        expect(localStorage.getItem('autoArchiveDays')).toBe(JSON.stringify('180'));
      });

      await user.selectOptions(autoArchiveSelect, 'never');
      await waitFor(() => {
        expect(localStorage.getItem('autoArchiveDays')).toBe(JSON.stringify('never'));
      });
    });
  });

  describe('Case Numbering Setting', () => {
    it('should change case numbering format', async () => {
      const user = userEvent.setup();
      render(<CaseManagementSettings />);

      let caseNumberingSelect = screen.getByLabelText(/case numbering/i);

      // Initially 'YYYY-NNNN'
      expect(caseNumberingSelect).toHaveValue('YYYY-NNNN');

      // Change to 'NNNN-YYYY'
      await user.selectOptions(caseNumberingSelect, 'NNNN-YYYY');
      await waitFor(() => {
        caseNumberingSelect = screen.getByLabelText(/case numbering/i);
        expect(caseNumberingSelect).toHaveValue('NNNN-YYYY');
      });

      // Change to 'SEQUENTIAL'
      await user.selectOptions(caseNumberingSelect, 'SEQUENTIAL');
      await waitFor(() => {
        caseNumberingSelect = screen.getByLabelText(/case numbering/i);
        expect(caseNumberingSelect).toHaveValue('SEQUENTIAL');
      });
    });

    it('should persist case numbering format to localStorage', async () => {
      const user = userEvent.setup();
      render(<CaseManagementSettings />);

      const caseNumberingSelect = screen.getByLabelText(/case numbering/i);

      await user.selectOptions(caseNumberingSelect, 'NNNN-YYYY');
      await waitFor(() => {
        expect(localStorage.getItem('caseNumberFormat')).toBe(JSON.stringify('NNNN-YYYY'));
      });

      await user.selectOptions(caseNumberingSelect, 'SEQUENTIAL');
      await waitFor(() => {
        expect(localStorage.getItem('caseNumberFormat')).toBe(JSON.stringify('SEQUENTIAL'));
      });
    });
  });
});
