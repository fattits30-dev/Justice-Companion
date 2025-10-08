/**
 * UserFactsPanel Component Tests
 *
 * Tests for the UserFactsPanel component focusing on:
 * - Rendering loading, error, and success states
 * - User facts list display with type filtering
 * - Create new user fact workflow
 * - Update user fact functionality
 * - Delete user fact with confirmation
 * - Type filters (personal, employment, financial, contact, medical, other)
 * - Empty state display
 * - Accessibility (ARIA labels, keyboard navigation)
 *
 * These tests use mocked hooks and IPC calls to isolate component behavior.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserFactsPanel } from './UserFactsPanel';
import { useUserFacts } from '../../hooks/useUserFacts';
import type { UserFact } from '../../models/UserFact';

// Mock the useUserFacts hook
vi.mock('../../hooks/useUserFacts');

// Mock PostItNote component to simplify testing
vi.mock('../PostItNote', () => ({
  PostItNote: ({ id, content, color, onUpdate, onDelete }: any) => (
    <div data-testid={`post-it-${id}`} data-color={color}>
      <div>{content || 'Empty'}</div>
      {onUpdate && (
        <button onClick={() => onUpdate(id, 'Updated content')}>Update</button>
      )}
      {onDelete && <button onClick={() => onDelete(id)}>Delete</button>}
    </div>
  ),
}));

describe('UserFactsPanel', () => {
  const mockCreateUserFact = vi.fn();
  const mockUpdateUserFact = vi.fn();
  const mockDeleteUserFact = vi.fn();
  const mockRefresh = vi.fn();

  const mockUserFacts: UserFact[] = [
    {
      id: 1,
      caseId: 1,
      factContent: 'John Doe, age 35',
      factType: 'personal',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      caseId: 1,
      factContent: 'Software Engineer at TechCorp',
      factType: 'employment',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 3,
      caseId: 1,
      factContent: 'Annual income: $120,000',
      factType: 'financial',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    },
    {
      id: 4,
      caseId: 1,
      factContent: 'Phone: 555-1234, Email: john@example.com',
      factType: 'contact',
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (useUserFacts as Mock).mockReturnValue({
      userFacts: mockUserFacts,
      loading: false,
      error: null,
      createUserFact: mockCreateUserFact,
      updateUserFact: mockUpdateUserFact,
      deleteUserFact: mockDeleteUserFact,
      refresh: mockRefresh,
    });
  });

  describe('Rendering States', () => {
    it('should render loading state', () => {
      (useUserFacts as Mock).mockReturnValue({
        userFacts: [],
        loading: true,
        error: null,
        createUserFact: mockCreateUserFact,
        updateUserFact: mockUpdateUserFact,
        deleteUserFact: mockDeleteUserFact,
        refresh: mockRefresh,
      });

      render(<UserFactsPanel caseId={1} />);

      expect(screen.getByText('Loading user facts...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      (useUserFacts as Mock).mockReturnValue({
        userFacts: [],
        loading: false,
        error: 'Failed to load user facts',
        createUserFact: mockCreateUserFact,
        updateUserFact: mockUpdateUserFact,
        deleteUserFact: mockDeleteUserFact,
        refresh: mockRefresh,
      });

      render(<UserFactsPanel caseId={1} />);

      expect(screen.getByText(/Error: Failed to load user facts/i)).toBeInTheDocument();
    });

    it('should render empty state when no facts exist', () => {
      (useUserFacts as Mock).mockReturnValue({
        userFacts: [],
        loading: false,
        error: null,
        createUserFact: mockCreateUserFact,
        updateUserFact: mockUpdateUserFact,
        deleteUserFact: mockDeleteUserFact,
        refresh: mockRefresh,
      });

      render(<UserFactsPanel caseId={1} />);

      expect(
        screen.getByText(/No user facts yet. Click "Add User Fact" to create one./i),
      ).toBeInTheDocument();
    });

    it('should render facts list when data is loaded', () => {
      render(<UserFactsPanel caseId={1} />);

      expect(screen.getByText(/John Doe, age 35/i)).toBeInTheDocument();
      expect(screen.getByText(/Software Engineer at TechCorp/i)).toBeInTheDocument();
      expect(screen.getByText(/Annual income: \$120,000/i)).toBeInTheDocument();
      expect(screen.getByText(/Phone: 555-1234/i)).toBeInTheDocument();
    });

    it('should display correct count in header', () => {
      render(<UserFactsPanel caseId={1} />);

      expect(screen.getByRole('heading', { name: /User Facts \(4\)/i })).toBeInTheDocument();
    });

    it('should render Add User Fact button', () => {
      render(<UserFactsPanel caseId={1} />);

      expect(screen.getByRole('button', { name: /\+ Add User Fact/i })).toBeInTheDocument();
    });
  });

  describe('Type Filtering', () => {
    it('should display all filter buttons with counts', () => {
      render(<UserFactsPanel caseId={1} />);

      expect(screen.getByRole('button', { name: /All \(4\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Personal \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Employment \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Financial \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Contact \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Medical \(0\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Other \(0\)/i })).toBeInTheDocument();
    });

    it('should filter facts by personal type when clicked', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      const personalButton = screen.getByRole('button', { name: /Personal \(1\)/i });
      await user.click(personalButton);

      // Should show only personal fact
      expect(screen.getByText(/John Doe, age 35/i)).toBeInTheDocument();
      // Should NOT show other types
      expect(screen.queryByText(/Software Engineer at TechCorp/i)).not.toBeInTheDocument();
    });

    it('should filter facts by employment type', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      const employmentButton = screen.getByRole('button', { name: /Employment \(1\)/i });
      await user.click(employmentButton);

      expect(screen.getByText(/Software Engineer at TechCorp/i)).toBeInTheDocument();
      expect(screen.queryByText(/John Doe, age 35/i)).not.toBeInTheDocument();
    });

    it('should show all facts when "All" filter is selected', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      // First filter to employment
      const employmentButton = screen.getByRole('button', { name: /Employment \(1\)/i });
      await user.click(employmentButton);

      // Then click "All"
      const allButton = screen.getByRole('button', { name: /All \(4\)/i });
      await user.click(allButton);

      // Should show all facts
      expect(screen.getByText(/John Doe, age 35/i)).toBeInTheDocument();
      expect(screen.getByText(/Software Engineer at TechCorp/i)).toBeInTheDocument();
      expect(screen.getByText(/Annual income: \$120,000/i)).toBeInTheDocument();
      expect(screen.getByText(/Phone: 555-1234/i)).toBeInTheDocument();
    });

    it('should update count in header when filtering', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      const personalButton = screen.getByRole('button', { name: /Personal \(1\)/i });
      await user.click(personalButton);

      expect(screen.getByRole('heading', { name: /User Facts \(1\)/i })).toBeInTheDocument();
    });

    it('should show empty state when filtered category has no facts', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      const medicalButton = screen.getByRole('button', { name: /Medical \(0\)/i });
      await user.click(medicalButton);

      expect(
        screen.getByText(/No user facts yet. Click "Add User Fact" to create one./i),
      ).toBeInTheDocument();
    });
  });

  describe('Create User Fact Workflow', () => {
    it('should show fact creator when Add button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add User Fact/i });
      await user.click(addButton);

      expect(screen.getByText(/Fact Type:/i)).toBeInTheDocument();
      expect(screen.getByTestId('post-it--1')).toBeInTheDocument();
    });

    it('should default to "personal" type when creating new fact', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add User Fact/i });
      await user.click(addButton);

      const typeSelect = screen.getByRole('combobox');
      expect(typeSelect.value).toBe('personal');
    });

    it('should allow changing fact type before creating', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add User Fact/i });
      await user.click(addButton);

      const typeSelect = screen.getByRole('combobox');
      await user.selectOptions(typeSelect, 'employment');

      expect((typeSelect as HTMLSelectElement).value).toBe('employment');
    });

    it('should render new fact creator UI elements', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add User Fact/i });
      await user.click(addButton);

      // Verify creator elements are shown
      expect(screen.getByRole('combobox')).toBeInTheDocument(); // Type selector
      expect(screen.getByTestId('post-it--1')).toBeInTheDocument(); // Post-it for new fact
    });
  });

  describe('Update User Fact', () => {
    it('should call updateUserFact when fact is updated', async () => {
      const user = userEvent.setup();
      mockUpdateUserFact.mockResolvedValue({
        id: 1,
        caseId: 1,
        factContent: 'Updated content',
        factType: 'personal',
      });

      render(<UserFactsPanel caseId={1} />);

      const updateButtons = screen.getAllByRole('button', { name: /Update/i });
      await user.click(updateButtons[0]);

      await waitFor(() => {
        expect(mockUpdateUserFact).toHaveBeenCalledWith(1, {
          factContent: 'Updated content',
        });
      });
    });
  });

  describe('Delete User Fact', () => {
    it('should call deleteUserFact when delete button is clicked', async () => {
      const user = userEvent.setup();
      mockDeleteUserFact.mockResolvedValue(undefined);

      render(<UserFactsPanel caseId={1} />);

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteUserFact).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Color Assignment', () => {
    it('should assign correct colors to different fact types', () => {
      render(<UserFactsPanel caseId={1} />);

      const personalNote = screen.getByTestId('post-it-1');
      const employmentNote = screen.getByTestId('post-it-2');
      const financialNote = screen.getByTestId('post-it-3');
      const contactNote = screen.getByTestId('post-it-4');

      expect(personalNote).toHaveAttribute('data-color', 'yellow');
      expect(employmentNote).toHaveAttribute('data-color', 'blue');
      expect(financialNote).toHaveAttribute('data-color', 'green');
      expect(contactNote).toHaveAttribute('data-color', 'pink');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long fact content', () => {
      const longFact: UserFact = {
        id: 100,
        caseId: 1,
        factContent: 'A'.repeat(1000),
        factType: 'personal',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (useUserFacts as Mock).mockReturnValue({
        userFacts: [longFact],
        loading: false,
        error: null,
        createUserFact: mockCreateUserFact,
        updateUserFact: mockUpdateUserFact,
        deleteUserFact: mockDeleteUserFact,
        refresh: mockRefresh,
      });

      render(<UserFactsPanel caseId={1} />);

      expect(screen.getByTestId('post-it-100')).toBeInTheDocument();
    });

    it('should handle special characters in fact content', () => {
      const specialFact: UserFact = {
        id: 101,
        caseId: 1,
        factContent: '<script>alert("XSS")</script> & "quotes"',
        factType: 'personal',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (useUserFacts as Mock).mockReturnValue({
        userFacts: [specialFact],
        loading: false,
        error: null,
        createUserFact: mockCreateUserFact,
        updateUserFact: mockUpdateUserFact,
        deleteUserFact: mockDeleteUserFact,
        refresh: mockRefresh,
      });

      render(<UserFactsPanel caseId={1} />);

      expect(screen.getByTestId('post-it-101')).toBeInTheDocument();
    });

    it('should handle caseId prop changes', () => {
      const { rerender } = render(<UserFactsPanel caseId={1} />);

      expect(useUserFacts).toHaveBeenCalledWith(1);

      rerender(<UserFactsPanel caseId={2} />);

      expect(useUserFacts).toHaveBeenCalledWith(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<UserFactsPanel caseId={1} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/User Facts/i);
    });

    it('should have accessible label for type select', async () => {
      const user = userEvent.setup();
      render(<UserFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add User Fact/i });
      await user.click(addButton);

      const label = screen.getByText(/Fact Type:/i);
      expect(label).toBeInTheDocument();
    });
  });
});
