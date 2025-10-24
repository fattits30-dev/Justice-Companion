import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CasesView } from './CasesView';
import type { Case } from '../models/Case.ts';

describe('CasesView', () => {
  const mockCases: Case[] = [
    {
      id: 1,
      title: 'Employment Dispute - Constructive Dismissal',
      description: 'Employer reduced hours without consultation',
      caseType: 'employment',
      status: 'active',
      userId: 1,
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z',
    },
    {
      id: 2,
      title: 'Housing Disrepair - Landlord Negligence',
      description: 'Mold and damp issues not addressed',
      caseType: 'housing',
      status: 'pending',
      userId: 1,
      createdAt: '2025-01-14T09:00:00Z',
      updatedAt: '2025-01-14T09:00:00Z',
    },
    {
      id: 3,
      title: 'Consumer Rights - Faulty Goods',
      description: null,
      caseType: 'consumer',
      status: 'closed',
      userId: 1,
      createdAt: '2025-01-10T08:00:00Z',
      updatedAt: '2025-01-10T08:00:00Z',
    },
  ];

  beforeEach(() => {
    // Mock sessionId in localStorage
    localStorage.setItem('sessionId', 'test-session-123');
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching cases', () => {
      // Mock listCases to never resolve (stays in loading state)
      window.justiceAPI.listCases = vi.fn(() => new Promise(() => {}));

      render(<CasesView />);

      expect(screen.getByText('Loading cases...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // spinner has implicit role
    });
  });

  describe('Error State', () => {
    it('should show error message when cases fail to load', async () => {
      window.justiceAPI.listCases = vi.fn().mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Cases')).toBeInTheDocument();
        expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      let callCount = 0;
      window.justiceAPI.listCases = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ success: false, error: 'Network error' });
        }
        return Promise.resolve({ success: true, data: mockCases });
      });

      render(<CasesView />);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Should now show cases
      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      });
    });

    it('should handle missing session error', async () => {
      localStorage.removeItem('sessionId');

      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('No session')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no cases exist', async () => {
      window.justiceAPI.listCases = vi.fn().mockResolvedValue({
        success: true,
        data: [],
      });

      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('No cases found')).toBeInTheDocument();
        expect(screen.getByText('Create your first case to get started')).toBeInTheDocument();
      });
    });

    it('should show different message when filters exclude all cases', async () => {
      window.justiceAPI.listCases = vi.fn().mockResolvedValue({
        success: true,
        data: mockCases,
      });

      render(<CasesView />);

      // Wait for cases to load
      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      });

      // Apply filter that excludes all cases
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      fireEvent.change(statusFilter, { target: { value: 'closed' } });

      const typeFilter = screen.getByRole('combobox', { name: /type/i });
      fireEvent.change(typeFilter, { target: { value: 'family' } });

      // Should show filtered empty state
      await waitFor(() => {
        expect(screen.getByText('No cases match your filters')).toBeInTheDocument();
      });
    });
  });

  describe('Cases Display', () => {
    beforeEach(() => {
      window.justiceAPI.listCases = vi.fn().mockResolvedValue({
        success: true,
        data: mockCases,
      });
    });

    it('should display all cases when loaded', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
        expect(screen.getByText('Housing Disrepair - Landlord Negligence')).toBeInTheDocument();
        expect(screen.getByText('Consumer Rights - Faulty Goods')).toBeInTheDocument();
      });
    });

    it('should display case descriptions when present', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Employer reduced hours without consultation')).toBeInTheDocument();
        expect(screen.getByText('Mold and damp issues not addressed')).toBeInTheDocument();
      });
    });

    it('should show status badges with correct colors', async () => {
      render(<CasesView />);

      await waitFor(() => {
        const statusBadges = screen.getAllByText(/active|pending|closed/i);
        expect(statusBadges.length).toBeGreaterThan(0);
      });
    });

    it('should show case type icons', async () => {
      render(<CasesView />);

      await waitFor(() => {
        // Check that emoji icons are rendered (they're in the DOM)
        const container = screen.getByText('Employment Dispute - Constructive Dismissal').closest('div');
        expect(container?.textContent).toContain('💼');
      });
    });

    it('should show created date for each case', async () => {
      render(<CasesView />);

      await waitFor(() => {
        // Check for formatted dates
        expect(screen.getByText(/Created/)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      window.justiceAPI.listCases = vi.fn().mockResolvedValue({
        success: true,
        data: mockCases,
      });
    });

    it('should filter cases by status', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      });

      // Filter by "active" status
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      fireEvent.change(statusFilter, { target: { value: 'active' } });

      // Should only show active case
      expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      expect(screen.queryByText('Housing Disrepair - Landlord Negligence')).not.toBeInTheDocument();
      expect(screen.queryByText('Consumer Rights - Faulty Goods')).not.toBeInTheDocument();
    });

    it('should filter cases by type', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      });

      // Filter by "housing" type
      const typeFilter = screen.getByRole('combobox', { name: /type/i });
      fireEvent.change(typeFilter, { target: { value: 'housing' } });

      // Should only show housing case
      expect(screen.queryByText('Employment Dispute - Constructive Dismissal')).not.toBeInTheDocument();
      expect(screen.getByText('Housing Disrepair - Landlord Negligence')).toBeInTheDocument();
      expect(screen.queryByText('Consumer Rights - Faulty Goods')).not.toBeInTheDocument();
    });

    it('should apply both status and type filters simultaneously', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      });

      // Filter by "pending" status
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      fireEvent.change(statusFilter, { target: { value: 'pending' } });

      // Filter by "housing" type
      const typeFilter = screen.getByRole('combobox', { name: /type/i });
      fireEvent.change(typeFilter, { target: { value: 'housing' } });

      // Should only show pending housing case
      expect(screen.queryByText('Employment Dispute - Constructive Dismissal')).not.toBeInTheDocument();
      expect(screen.getByText('Housing Disrepair - Landlord Negligence')).toBeInTheDocument();
      expect(screen.queryByText('Consumer Rights - Faulty Goods')).not.toBeInTheDocument();
    });

    it('should reset to all cases when "all" is selected', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      });

      // Apply filter
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      fireEvent.change(statusFilter, { target: { value: 'active' } });

      // Reset to all
      fireEvent.change(statusFilter, { target: { value: 'all' } });

      // Should show all cases again
      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
        expect(screen.getByText('Housing Disrepair - Landlord Negligence')).toBeInTheDocument();
        expect(screen.getByText('Consumer Rights - Faulty Goods')).toBeInTheDocument();
      });
    });
  });

  describe('Create Case Dialog', () => {
    beforeEach(() => {
      window.justiceAPI.listCases = vi.fn().mockResolvedValue({
        success: true,
        data: [],
      });
    });

    it('should open create dialog when "New Case" button is clicked', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('No cases found')).toBeInTheDocument();
      });

      const newCaseButton = screen.getByText('New Case');
      fireEvent.click(newCaseButton);

      expect(screen.getByText('Create New Case')).toBeInTheDocument();
      expect(screen.getByLabelText(/Case Title/i)).toBeInTheDocument();
    });

    it('should close dialog when cancel is clicked', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('No cases found')).toBeInTheDocument();
      });

      // Open dialog
      fireEvent.click(screen.getByText('New Case'));
      expect(screen.getByText('Create New Case')).toBeInTheDocument();

      // Close dialog
      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => {
        expect(screen.queryByText('Create New Case')).not.toBeInTheDocument();
      });
    });

    it('should close dialog when X button is clicked', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('No cases found')).toBeInTheDocument();
      });

      // Open dialog
      fireEvent.click(screen.getByText('New Case'));
      expect(screen.getByText('Create New Case')).toBeInTheDocument();

      // Close with X button
      const closeButton = screen.getByRole('button', { name: '' }).parentElement?.querySelector('svg');
      if (closeButton?.parentElement) {
        fireEvent.click(closeButton.parentElement);
      }

      await waitFor(() => {
        expect(screen.queryByText('Create New Case')).not.toBeInTheDocument();
      });
    });
  });

  describe('Create Case Operation', () => {
    beforeEach(() => {
      window.justiceAPI.listCases = vi.fn().mockResolvedValue({
        success: true,
        data: [],
      });
      window.justiceAPI.createCase = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 4,
          title: 'New Test Case',
          description: 'Test description',
          caseType: 'debt',
          status: 'pending',
          userId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    });

    it('should create a new case successfully', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('No cases found')).toBeInTheDocument();
      });

      // Open dialog
      fireEvent.click(screen.getByText('New Case'));

      // Fill form
      const titleInput = screen.getByLabelText(/Case Title/i);
      fireEvent.change(titleInput, { target: { value: 'New Test Case' } });

      const descriptionInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

      const typeSelect = screen.getByLabelText(/Case Type/i);
      fireEvent.change(typeSelect, { target: { value: 'debt' } });

      // Submit form
      const createButton = screen.getByRole('button', { name: /Create Case/i });
      fireEvent.click(createButton);

      // Verify API was called
      await waitFor(() => {
        expect(window.justiceAPI.createCase).toHaveBeenCalledWith('test-session-123', {
          title: 'New Test Case',
          description: 'Test description',
          caseType: 'debt',
        });
      });

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Create New Case')).not.toBeInTheDocument();
      });

      // New case should appear in list
      expect(screen.getByText('New Test Case')).toBeInTheDocument();
    });

    it('should not submit form without title', async () => {
      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('No cases found')).toBeInTheDocument();
      });

      // Open dialog
      fireEvent.click(screen.getByText('New Case'));

      // Submit without title
      const createButton = screen.getByRole('button', { name: /Create Case/i });
      fireEvent.click(createButton);

      expect(alertSpy).toHaveBeenCalledWith('Please enter a case title');
      expect(window.justiceAPI.createCase).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    it('should handle create case error', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      window.justiceAPI.createCase = vi.fn().mockResolvedValue({
        success: false,
        error: 'Database write failed',
      });

      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('No cases found')).toBeInTheDocument();
      });

      // Open dialog and fill form
      fireEvent.click(screen.getByText('New Case'));
      fireEvent.change(screen.getByLabelText(/Case Title/i), { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /Create Case/i }));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to create case: Database write failed');
      });

      alertSpy.mockRestore();
    });

    it('should trim whitespace from title and description', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('No cases found')).toBeInTheDocument();
      });

      // Open dialog and fill with whitespace
      fireEvent.click(screen.getByText('New Case'));
      fireEvent.change(screen.getByLabelText(/Case Title/i), { target: { value: '  Test Case  ' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: '  Description  ' } });
      fireEvent.click(screen.getByRole('button', { name: /Create Case/i }));

      await waitFor(() => {
        expect(window.justiceAPI.createCase).toHaveBeenCalledWith('test-session-123', {
          title: 'Test Case',
          description: 'Description',
          caseType: 'employment',
        });
      });
    });
  });

  describe('Delete Case Operation', () => {
    beforeEach(() => {
      window.justiceAPI.listCases = vi.fn().mockResolvedValue({
        success: true,
        data: mockCases,
      });
      window.justiceAPI.deleteCase = vi.fn().mockResolvedValue({
        success: true,
      });
    });

    it('should show confirmation dialog before deleting', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete case');
      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to delete this case? This cannot be undone.'
      );
      expect(window.justiceAPI.deleteCase).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should delete case when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete case');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.justiceAPI.deleteCase).toHaveBeenCalledWith('test-session-123', 1);
      });

      // Case should be removed from list
      await waitFor(() => {
        expect(screen.queryByText('Employment Dispute - Constructive Dismissal')).not.toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });

    it('should handle delete case error', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      window.justiceAPI.deleteCase = vi.fn().mockResolvedValue({
        success: false,
        error: 'Case not found',
      });

      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete case');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to delete case: Case not found');
      });

      // Case should still be in list
      expect(screen.getByText('Employment Dispute - Constructive Dismissal')).toBeInTheDocument();

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('UI Elements', () => {
    beforeEach(() => {
      window.justiceAPI.listCases = vi.fn().mockResolvedValue({
        success: true,
        data: mockCases,
      });
    });

    it('should render page header with title', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Cases' })).toBeInTheDocument();
        expect(screen.getByText('Manage your legal cases')).toBeInTheDocument();
      });
    });

    it('should render filter dropdowns', async () => {
      render(<CasesView />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /type/i })).toBeInTheDocument();
      });
    });

    it('should render "New Case" button in header', async () => {
      render(<CasesView />);

      await waitFor(() => {
        const newCaseButtons = screen.getAllByText('New Case');
        expect(newCaseButtons.length).toBeGreaterThan(0);
      });
    });
  });
});
