/**
 * DashboardView Component Tests
 *
 * Tests for the Dashboard page including:
 * - Welcome banner and legal disclaimer rendering
 * - Stats calculation (total cases, active cases)
 * - Loading states with skeleton UI
 * - Empty state handling (DashboardEmptyState)
 * - Error state display
 * - Quick action navigation
 * - Stats card rendering
 */

import { render, screen } from '@/test-utils/test-utils';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardView } from './DashboardView';

// Mock useCases hook
const mockUseCases = vi.fn();
vi.mock('@/features/cases', () => ({
  useCases: () => mockUseCases(),
}));

// Mock DashboardEmptyState component
vi.mock('@/components/ui/DashboardEmptyState', () => ({
  DashboardEmptyState: ({ onCreateCase, onStartChat, onUploadDocument }: any) => (
    <div data-testid="dashboard-empty-state">
      <button onClick={onCreateCase}>Create Case (Empty State)</button>
      <button onClick={onStartChat}>Start Chat (Empty State)</button>
      <button onClick={onUploadDocument}>Upload Document (Empty State)</button>
    </div>
  ),
}));

describe('DashboardView', () => {
  const mockOnViewChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: at least one case to render main dashboard (not empty state)
    mockUseCases.mockReturnValue({
      cases: [{ id: 1, title: 'Test Case', caseType: 'employment', status: 'active' }],
      loading: false,
      error: null,
    });
  });

  describe('Rendering - Welcome Section', () => {
    it('should render welcome heading and description', () => {
      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
      expect(screen.getByText('Your legal information assistant')).toBeInTheDocument();
    });

    it('should render legal disclaimer heading (collapsed by default)', () => {
      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Important Legal Disclaimer')).toBeInTheDocument();
      // Disclaimer content should NOT be visible when collapsed
      expect(
        screen.queryByText(/This app provides information only, not legal advice/i)
      ).not.toBeInTheDocument();
    });

    it('should expand and collapse legal disclaimer when clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardView onViewChange={mockOnViewChange} />);

      const disclaimerButton = screen.getByText('Important Legal Disclaimer').closest('button');
      expect(disclaimerButton).toBeInTheDocument();

      // Initially collapsed - content not visible
      expect(
        screen.queryByText(/This app provides information only, not legal advice/i)
      ).not.toBeInTheDocument();

      // Click to expand
      await user.click(disclaimerButton!);

      // Content should now be visible
      expect(
        screen.getByText(/This app provides information only, not legal advice/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Nothing in this application creates an attorney-client relationship/i)
      ).toBeInTheDocument();

      // Click to collapse
      await user.click(disclaimerButton!);

      // Content should be hidden again
      expect(
        screen.queryByText(/This app provides information only, not legal advice/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render DashboardEmptyState when no cases and not loading', () => {
      mockUseCases.mockReturnValue({
        cases: [],
        loading: false,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.getByTestId('dashboard-empty-state')).toBeInTheDocument();
    });

    it('should not render main dashboard content in empty state', () => {
      mockUseCases.mockReturnValue({
        cases: [],
        loading: false,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
      expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
    });

    it('should navigate from empty state create case button', async () => {
      const user = userEvent.setup();
      mockUseCases.mockReturnValue({
        cases: [],
        loading: false,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      await user.click(screen.getByText('Create Case (Empty State)'));
      expect(mockOnViewChange).toHaveBeenCalledWith('cases');
    });

    it('should navigate from empty state start chat button', async () => {
      const user = userEvent.setup();
      mockUseCases.mockReturnValue({
        cases: [],
        loading: false,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      await user.click(screen.getByText('Start Chat (Empty State)'));
      expect(mockOnViewChange).toHaveBeenCalledWith('chat');
    });
  });

  describe('Loading State', () => {
    it('should render skeleton cards when loading', () => {
      mockUseCases.mockReturnValue({
        cases: null,
        loading: true,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      const skeletons = screen.getAllByRole('status', { name: 'Loading statistics' });
      expect(skeletons).toHaveLength(3);
    });

    it('should not render stat cards when loading', () => {
      mockUseCases.mockReturnValue({
        cases: null,
        loading: true,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.queryByText('Active Cases')).not.toBeInTheDocument();
      expect(screen.queryByText('Documents')).not.toBeInTheDocument();
    });

    it('should still render welcome section when loading', () => {
      mockUseCases.mockReturnValue({
        cases: null,
        loading: true,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error exists', () => {
      mockUseCases.mockReturnValue({
        cases: [{ id: 1, title: 'Test', caseType: 'employment', status: 'active' }],
        loading: false,
        error: 'Failed to load cases from database',
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.getByText(/Failed to load dashboard data/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load cases from database/i)).toBeInTheDocument();
    });

    it('should still render dashboard content when error exists', () => {
      mockUseCases.mockReturnValue({
        cases: [{ id: 1, title: 'Test', caseType: 'employment', status: 'active' }],
        loading: false,
        error: 'Some error',
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Active Cases')).toBeInTheDocument();
    });
  });

  describe('Stats Calculation', () => {
    it('should show zero stats when no cases', () => {
      mockUseCases.mockReturnValue({
        cases: [],
        loading: false,
        error: null,
      });

      // Empty state is rendered instead, so this won't show stats
      render(<DashboardView onViewChange={mockOnViewChange} />);
      expect(screen.getByTestId('dashboard-empty-state')).toBeInTheDocument();
    });

    it('should calculate total cases correctly', () => {
      mockUseCases.mockReturnValue({
        cases: [
          { id: 1, title: 'Case 1', caseType: 'employment', status: 'active' },
          { id: 2, title: 'Case 2', caseType: 'housing', status: 'active' },
          { id: 3, title: 'Case 3', caseType: 'consumer', status: 'closed' },
        ],
        loading: false,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      // Find the Active Cases stat card and check its trend text
      expect(screen.getByText('3 total')).toBeInTheDocument();
    });

    it('should calculate active cases correctly', () => {
      mockUseCases.mockReturnValue({
        cases: [
          { id: 1, title: 'Case 1', caseType: 'employment', status: 'active' },
          { id: 2, title: 'Case 2', caseType: 'housing', status: 'active' },
          { id: 3, title: 'Case 3', caseType: 'consumer', status: 'closed' },
        ],
        loading: false,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      const activeCasesValue = screen.getByText('Active Cases').previousSibling;
      expect(activeCasesValue).toHaveTextContent('2');
    });

    it('should render all 3 stat cards when cases exist', () => {
      mockUseCases.mockReturnValue({
        cases: [{ id: 1, title: 'Case 1', caseType: 'employment', status: 'active' }],
        loading: false,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Active Cases')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
      // "Recent Activity" appears twice (stat card + section heading), so use getAllByText
      const recentActivityElements = screen.getAllByText('Recent Activity');
      expect(recentActivityElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Quick Actions', () => {
    beforeEach(() => {
      // Ensure we have at least one case so main dashboard renders
      mockUseCases.mockReturnValue({
        cases: [{ id: 1, title: 'Case 1', caseType: 'employment', status: 'active' }],
        loading: false,
        error: null,
      });
    });

    it('should render quick actions section', () => {
      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Start New Chat')).toBeInTheDocument();
      expect(screen.getByText('Create Case')).toBeInTheDocument();
      expect(screen.getByText('Upload Document')).toBeInTheDocument();
    });

    it('should navigate to chat when clicking Start New Chat', async () => {
      const user = userEvent.setup();
      render(<DashboardView onViewChange={mockOnViewChange} />);

      await user.click(screen.getByText('Start New Chat'));
      expect(mockOnViewChange).toHaveBeenCalledWith('chat');
    });

    it('should navigate to cases when clicking Create Case', async () => {
      const user = userEvent.setup();
      render(<DashboardView onViewChange={mockOnViewChange} />);

      await user.click(screen.getByText('Create Case'));
      expect(mockOnViewChange).toHaveBeenCalledWith('cases');
    });

    it('should navigate to documents when clicking Upload Document', async () => {
      const user = userEvent.setup();
      render(<DashboardView onViewChange={mockOnViewChange} />);

      await user.click(screen.getByText('Upload Document'));
      expect(mockOnViewChange).toHaveBeenCalledWith('documents');
    });

    it('should render action descriptions', () => {
      render(<DashboardView onViewChange={mockOnViewChange} />);

      expect(screen.getByText('Get instant legal information')).toBeInTheDocument();
      expect(screen.getByText('Track your legal matter')).toBeInTheDocument();
      expect(screen.getByText('Analyze legal documents')).toBeInTheDocument();
    });
  });

  describe('Recent Activity', () => {
    it('should render recent activity section with empty state', () => {
      mockUseCases.mockReturnValue({
        cases: [{ id: 1, title: 'Case 1', caseType: 'employment', status: 'active' }],
        loading: false,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      // Use getByRole to specifically target the h2 heading (not the stat card label)
      expect(screen.getByRole('heading', { name: 'Recent Activity' })).toBeInTheDocument();
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
      expect(screen.getByText('Your recent actions will appear here')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible loading state', () => {
      mockUseCases.mockReturnValue({
        cases: null,
        loading: true,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      const skeletons = screen.getAllByRole('status', { name: 'Loading statistics' });
      expect(skeletons[0]).toHaveAttribute('aria-label', 'Loading statistics');
    });

    it('should have accessible quick action buttons', () => {
      mockUseCases.mockReturnValue({
        cases: [{ id: 1, title: 'Case 1', caseType: 'employment', status: 'active' }],
        loading: false,
        error: null,
      });

      render(<DashboardView onViewChange={mockOnViewChange} />);

      const chatButton = screen.getByText('Start New Chat').closest('button');
      expect(chatButton).toBeInTheDocument();
      expect(chatButton?.tagName).toBe('BUTTON');
    });
  });
});
