/**
 * CaseFactsPanel Component Tests
 *
 * Tests for the CaseFactsPanel component focusing on:
 * - Rendering loading, error, and success states
 * - Case facts list display with dual filtering (category + importance)
 * - Create new case fact workflow
 * - Update case fact functionality
 * - Delete case fact with confirmation
 * - Category filters (timeline, evidence, witness, location, communication, other)
 * - Importance filters (low, medium, high, critical)
 * - Importance badges display
 * - Empty state display
 * - Accessibility (ARIA labels, keyboard navigation)
 *
 * These tests use mocked hooks and IPC calls to isolate component behavior.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseFactsPanel } from './CaseFactsPanel';
import { useCaseFacts } from '../hooks/useCaseFacts';
import type { CaseFact } from '../../../models/CaseFact';

// Mock the useCaseFacts hook
vi.mock('../hooks/useCaseFacts');

// Mock PostItNote component to simplify testing
vi.mock('../../../components/PostItNote', () => ({
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

describe('CaseFactsPanel', () => {
  const mockCreateCaseFact = vi.fn();
  const mockUpdateCaseFact = vi.fn();
  const mockDeleteCaseFact = vi.fn();
  const mockRefresh = vi.fn();

  const mockCaseFacts: CaseFact[] = [
    {
      id: 1,
      caseId: 1,
      factContent: 'Incident occurred on Jan 15, 2024',
      factCategory: 'timeline',
      importance: 'critical',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      caseId: 1,
      factContent: 'Security camera footage from 2pm-4pm',
      factCategory: 'evidence',
      importance: 'high',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 3,
      caseId: 1,
      factContent: 'Jane Smith witnessed the event',
      factCategory: 'witness',
      importance: 'medium',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    },
    {
      id: 4,
      caseId: 1,
      factContent: 'Meeting at 123 Main St, Suite 400',
      factCategory: 'location',
      importance: 'low',
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    },
    {
      id: 5,
      caseId: 1,
      factContent: 'Email thread from May 2023',
      factCategory: 'communication',
      importance: 'high',
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (useCaseFacts as Mock).mockReturnValue({
      caseFacts: mockCaseFacts,
      loading: false,
      error: null,
      createCaseFact: mockCreateCaseFact,
      updateCaseFact: mockUpdateCaseFact,
      deleteCaseFact: mockDeleteCaseFact,
      refresh: mockRefresh,
    });
  });

  describe('Rendering States', () => {
    it('should render loading state', () => {
      (useCaseFacts as Mock).mockReturnValue({
        caseFacts: [],
        loading: true,
        error: null,
        createCaseFact: mockCreateCaseFact,
        updateCaseFact: mockUpdateCaseFact,
        deleteCaseFact: mockDeleteCaseFact,
        refresh: mockRefresh,
      });

      render(<CaseFactsPanel caseId={1} />);

      expect(screen.getByText('Loading case facts...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      (useCaseFacts as Mock).mockReturnValue({
        caseFacts: [],
        loading: false,
        error: 'Failed to load case facts',
        createCaseFact: mockCreateCaseFact,
        updateCaseFact: mockUpdateCaseFact,
        deleteCaseFact: mockDeleteCaseFact,
        refresh: mockRefresh,
      });

      render(<CaseFactsPanel caseId={1} />);

      expect(screen.getByText(/Error: Failed to load case facts/i)).toBeInTheDocument();
    });

    it('should render empty state when no facts match filters', () => {
      (useCaseFacts as Mock).mockReturnValue({
        caseFacts: [],
        loading: false,
        error: null,
        createCaseFact: mockCreateCaseFact,
        updateCaseFact: mockUpdateCaseFact,
        deleteCaseFact: mockDeleteCaseFact,
        refresh: mockRefresh,
      });

      render(<CaseFactsPanel caseId={1} />);

      expect(
        screen.getByText(/No case facts match the current filters./i),
      ).toBeInTheDocument();
    });

    it('should render facts list when data is loaded', () => {
      render(<CaseFactsPanel caseId={1} />);

      expect(screen.getByText(/Incident occurred on Jan 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Security camera footage from 2pm-4pm/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith witnessed the event/i)).toBeInTheDocument();
      expect(screen.getByText(/Meeting at 123 Main St/i)).toBeInTheDocument();
      expect(screen.getByText(/Email thread from May 2023/i)).toBeInTheDocument();
    });

    it('should display correct count in header', () => {
      render(<CaseFactsPanel caseId={1} />);

      expect(screen.getByRole('heading', { name: /Case Facts \(5\)/i })).toBeInTheDocument();
    });

    it('should render Add Case Fact button', () => {
      render(<CaseFactsPanel caseId={1} />);

      expect(screen.getByRole('button', { name: /\+ Add Case Fact/i })).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('should display all category filter buttons with counts', () => {
      render(<CaseFactsPanel caseId={1} />);

      expect(screen.getByRole('button', { name: /All \(5\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Timeline \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Evidence \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Witness \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Location \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Communication \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Other \(0\)/i })).toBeInTheDocument();
    });

    it('should filter facts by timeline category', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const timelineButton = screen.getByRole('button', { name: /Timeline \(1\)/i });
      await user.click(timelineButton);

      // Should show only timeline fact
      expect(screen.getByText(/Incident occurred on Jan 15, 2024/i)).toBeInTheDocument();
      // Should NOT show other categories
      expect(screen.queryByText(/Security camera footage/i)).not.toBeInTheDocument();
    });

    it('should filter facts by evidence category', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const evidenceButton = screen.getByRole('button', { name: /Evidence \(1\)/i });
      await user.click(evidenceButton);

      expect(screen.getByText(/Security camera footage/i)).toBeInTheDocument();
      expect(screen.queryByText(/Incident occurred/i)).not.toBeInTheDocument();
    });

    it('should show all facts when "All" category filter is selected', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      // First filter to timeline
      const timelineButton = screen.getByRole('button', { name: /Timeline \(1\)/i });
      await user.click(timelineButton);

      // Then click "All"
      const allButton = screen.getByRole('button', { name: /All \(5\)/i });
      await user.click(allButton);

      // Should show all facts
      expect(screen.getByText(/Incident occurred/i)).toBeInTheDocument();
      expect(screen.getByText(/Security camera footage/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith witnessed/i)).toBeInTheDocument();
    });
  });

  describe('Importance Filtering', () => {
    it('should display all importance filter buttons with counts', () => {
      render(<CaseFactsPanel caseId={1} />);

      // Find all "All" buttons and select the second one (importance filter)
      const allButtons = screen.getAllByRole('button', { name: /All/i });
      expect(allButtons.length).toBeGreaterThanOrEqual(2);

      expect(screen.getByRole('button', { name: /Low \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Medium \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /High \(2\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Critical \(1\)/i })).toBeInTheDocument();
    });

    it('should filter facts by critical importance', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const criticalButton = screen.getByRole('button', { name: /Critical \(1\)/i });
      await user.click(criticalButton);

      // Should show only critical fact
      expect(screen.getByText(/Incident occurred on Jan 15, 2024/i)).toBeInTheDocument();
      // Should NOT show other importance levels
      expect(screen.queryByText(/Security camera footage/i)).not.toBeInTheDocument();
    });

    it('should filter facts by high importance', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const highButton = screen.getByRole('button', { name: /High \(2\)/i });
      await user.click(highButton);

      // Should show 2 high importance facts
      expect(screen.getByText(/Security camera footage/i)).toBeInTheDocument();
      expect(screen.getByText(/Email thread from May 2023/i)).toBeInTheDocument();
      // Should NOT show critical fact
      expect(screen.queryByText(/Incident occurred/i)).not.toBeInTheDocument();
    });

    it('should combine category and importance filters', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      // Filter by evidence category
      const evidenceButton = screen.getByRole('button', { name: /Evidence \(1\)/i });
      await user.click(evidenceButton);

      // Then filter by high importance
      const highButton = screen.getByRole('button', { name: /High \(2\)/i });
      await user.click(highButton);

      // Should show only evidence + high importance fact
      expect(screen.getByText(/Security camera footage/i)).toBeInTheDocument();
      // Should NOT show other facts
      expect(screen.queryByText(/Email thread/i)).not.toBeInTheDocument();
    });

    it('should show empty state when combined filters match nothing', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      // Filter by timeline category (has 1 critical fact)
      const timelineButton = screen.getByRole('button', { name: /Timeline \(1\)/i });
      await user.click(timelineButton);

      // Then filter by low importance (timeline fact is critical)
      const lowButton = screen.getByRole('button', { name: /Low \(1\)/i });
      await user.click(lowButton);

      expect(
        screen.getByText(/No case facts match the current filters./i),
      ).toBeInTheDocument();
    });
  });

  describe('Create Case Fact Workflow', () => {
    it('should show fact creator when Add button is clicked', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      // Creator should not be visible initially
      expect(screen.queryByTestId('post-it--1')).not.toBeInTheDocument();

      const addButton = screen.getByRole('button', { name: /\+ Add Case Fact/i });
      await user.click(addButton);

      // Creator should now be visible
      expect(screen.getByTestId('post-it--1')).toBeInTheDocument();
      // Check that selects are present
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('should default to "timeline" category and "medium" importance', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Case Fact/i });
      await user.click(addButton);

      const selects = screen.getAllByRole('combobox');
      const categorySelect = selects[0] as HTMLSelectElement;
      const importanceSelect = selects[1] as HTMLSelectElement;

      expect(categorySelect.value).toBe('timeline');
      expect(importanceSelect.value).toBe('medium');
    });

    it('should allow changing category before creating', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Case Fact/i });
      await user.click(addButton);

      const categorySelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(categorySelect, 'evidence');

      expect((categorySelect as HTMLSelectElement).value).toBe('evidence');
    });

    it('should allow changing importance before creating', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Case Fact/i });
      await user.click(addButton);

      const importanceSelect = screen.getAllByRole('combobox')[1];
      await user.selectOptions(importanceSelect, 'critical');

      expect((importanceSelect as HTMLSelectElement).value).toBe('critical');
    });

    it('should render new fact creator UI elements', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Case Fact/i });
      await user.click(addButton);

      // Verify creator elements are shown
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2); // Category and importance selectors
      expect(screen.getByTestId('post-it--1')).toBeInTheDocument(); // Post-it for new fact
    });
  });

  describe('Update Case Fact', () => {
    it('should call updateCaseFact when fact is updated', async () => {
      const user = userEvent.setup();
      mockUpdateCaseFact.mockResolvedValue({
        id: 1,
        caseId: 1,
        factContent: 'Updated content',
        factCategory: 'timeline',
        importance: 'critical',
      });

      render(<CaseFactsPanel caseId={1} />);

      const updateButtons = screen.getAllByRole('button', { name: /Update/i });
      await user.click(updateButtons[0]);

      await waitFor(() => {
        expect(mockUpdateCaseFact).toHaveBeenCalledWith(1, {
          factContent: 'Updated content',
        });
      });
    });
  });

  describe('Delete Case Fact', () => {
    it('should call deleteCaseFact when delete button is clicked', async () => {
      const user = userEvent.setup();
      mockDeleteCaseFact.mockResolvedValue(undefined);

      render(<CaseFactsPanel caseId={1} />);

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteCaseFact).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Importance Badges', () => {
    it('should display importance badge for each fact', () => {
      render(<CaseFactsPanel caseId={1} />);

      // Check for badge text (Critical, High, Medium, Low)
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getAllByText('High').length).toBe(2); // 2 high importance facts
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('Color Assignment', () => {
    it('should assign correct colors to different fact categories', () => {
      render(<CaseFactsPanel caseId={1} />);

      const timelineNote = screen.getByTestId('post-it-1');
      const evidenceNote = screen.getByTestId('post-it-2');
      const witnessNote = screen.getByTestId('post-it-3');
      const locationNote = screen.getByTestId('post-it-4');
      const communicationNote = screen.getByTestId('post-it-5');

      expect(timelineNote).toHaveAttribute('data-color', 'blue');
      expect(evidenceNote).toHaveAttribute('data-color', 'green');
      expect(witnessNote).toHaveAttribute('data-color', 'yellow');
      expect(locationNote).toHaveAttribute('data-color', 'pink');
      expect(communicationNote).toHaveAttribute('data-color', 'purple');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long fact content', () => {
      const longFact: CaseFact = {
        id: 100,
        caseId: 1,
        factContent: 'A'.repeat(1000),
        factCategory: 'timeline',
        importance: 'medium',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (useCaseFacts as Mock).mockReturnValue({
        caseFacts: [longFact],
        loading: false,
        error: null,
        createCaseFact: mockCreateCaseFact,
        updateCaseFact: mockUpdateCaseFact,
        deleteCaseFact: mockDeleteCaseFact,
        refresh: mockRefresh,
      });

      render(<CaseFactsPanel caseId={1} />);

      expect(screen.getByTestId('post-it-100')).toBeInTheDocument();
    });

    it('should handle special characters in fact content', () => {
      const specialFact: CaseFact = {
        id: 101,
        caseId: 1,
        factContent: '<script>alert("XSS")</script> & "quotes"',
        factCategory: 'evidence',
        importance: 'high',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (useCaseFacts as Mock).mockReturnValue({
        caseFacts: [specialFact],
        loading: false,
        error: null,
        createCaseFact: mockCreateCaseFact,
        updateCaseFact: mockUpdateCaseFact,
        deleteCaseFact: mockDeleteCaseFact,
        refresh: mockRefresh,
      });

      render(<CaseFactsPanel caseId={1} />);

      expect(screen.getByTestId('post-it-101')).toBeInTheDocument();
    });

    it('should handle caseId prop changes', () => {
      const { rerender } = render(<CaseFactsPanel caseId={1} />);

      expect(useCaseFacts).toHaveBeenCalledWith(1);

      rerender(<CaseFactsPanel caseId={2} />);

      expect(useCaseFacts).toHaveBeenCalledWith(2);
    });

    it('should update count when filtering', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const criticalButton = screen.getByRole('button', { name: /Critical \(1\)/i });
      await user.click(criticalButton);

      expect(screen.getByRole('heading', { name: /Case Facts \(1\)/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<CaseFactsPanel caseId={1} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/Case Facts/i);
    });

    it('should have accessible labels for selects', async () => {
      const user = userEvent.setup();
      render(<CaseFactsPanel caseId={1} />);

      const addButton = screen.getByRole('button', { name: /\+ Add Case Fact/i });
      await user.click(addButton);

      // Check that labels exist (use getAllByText since they appear in filters too)
      const categoryLabels = screen.getAllByText(/Category:/i);
      const importanceLabels = screen.getAllByText(/Importance:/i);
      expect(categoryLabels.length).toBeGreaterThan(0);
      expect(importanceLabels.length).toBeGreaterThan(0);
    });

    it('should have descriptive filter labels', () => {
      render(<CaseFactsPanel caseId={1} />);

      const categoryLabel = screen.getAllByText(/Category:/i)[0];
      const importanceLabel = screen.getAllByText(/Importance:/i)[0];

      expect(categoryLabel).toBeInTheDocument();
      expect(importanceLabel).toBeInTheDocument();
    });
  });
});
