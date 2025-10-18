/**
 * CasesView Component Tests
 *
 * Tests for the Cases tree visualization page including:
 * - Case to tree data transformation
 * - Evidence grouping by type
 * - Timeline creation (created, updated, closed)
 * - Case selection dropdown
 * - Loading/error/empty states
 * - Navigation to case detail
 *
 * NOTE: SVG tree rendering is complex and tested via visual/E2E tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test-utils/test-utils';
import userEvent from '@testing-library/user-event';
import { CasesView } from './CasesView';
import type { Case } from '../../../models/Case';
import type { Evidence } from '../../../models/Evidence';

// Mock hooks
const mockUseCases = vi.fn();
const mockUseEvidence = vi.fn();

vi.mock('../hooks/useCases', () => ({
  useCases: () => mockUseCases(),
}));

vi.mock('@/features/documents', () => ({
  useEvidence: () => mockUseEvidence(),
}));

describe('CasesView', () => {
  const mockOnCaseSelect = vi.fn();

  const mockCases: Case[] = [
    {
      id: 1,
      userId: 1,
      title: 'Employment Case',
      caseType: 'employment',
      description: 'Test case 1',
      status: 'active',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-15T00:00:00.000Z',
    },
    {
      id: 2,
      userId: 1,
      title: 'Housing Case',
      caseType: 'housing',
      description: 'Test case 2',
      status: 'closed',
      createdAt: '2025-01-05T00:00:00.000Z',
      updatedAt: '2025-01-20T00:00:00.000Z',
    },
  ];

  const mockEvidence: Evidence[] = [
    {
      id: 1,
      caseId: 1,
      title: 'Employment Contract',
      evidenceType: 'document',
      content: null,
      filePath: 'C:\\docs\\contract.pdf',
      obtainedDate: '2025-01-10',
      createdAt: '2025-01-10T00:00:00.000Z',
      updatedAt: '2025-01-10T00:00:00.000Z',
    },
    {
      id: 2,
      caseId: 1,
      title: 'Photo Evidence',
      evidenceType: 'photo',
      content: null,
      filePath: 'C:\\photos\\evidence.jpg',
      obtainedDate: '2025-01-12',
      createdAt: '2025-01-12T00:00:00.000Z',
      updatedAt: '2025-01-12T00:00:00.000Z',
    },
    {
      id: 3,
      caseId: 1,
      title: 'Email Thread',
      evidenceType: 'email',
      content: 'Email content',
      filePath: null,
      obtainedDate: null,
      createdAt: '2025-01-14T00:00:00.000Z',
      updatedAt: '2025-01-14T00:00:00.000Z',
    },
    {
      id: 4,
      caseId: 2,
      title: 'Lease Agreement',
      evidenceType: 'document',
      content: null,
      filePath: 'C:\\docs\\lease.pdf',
      obtainedDate: '2025-01-08',
      createdAt: '2025-01-08T00:00:00.000Z',
      updatedAt: '2025-01-08T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: cases and evidence loaded successfully
    mockUseCases.mockReturnValue({
      cases: mockCases,
      loading: false,
      error: null,
    });

    mockUseEvidence.mockReturnValue({
      evidence: mockEvidence,
      loading: false,
      error: null,
    });
  });

  describe('Loading State', () => {
    it('should show skeleton when cases are loading', () => {
      mockUseCases.mockReturnValue({
        cases: [],
        loading: true,
        error: null,
      });

      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      expect(screen.getByRole('status', { busy: true })).toBeInTheDocument();
      expect(screen.getByText('Loading case tree...')).toBeInTheDocument();
    });

    it('should show skeleton when evidence is loading', () => {
      mockUseCases.mockReturnValue({
        cases: mockCases,
        loading: false,
        error: null,
      });
      mockUseEvidence.mockReturnValue({
        evidence: [],
        loading: true,
        error: null,
      });

      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      expect(screen.getByRole('status', { busy: true })).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when cases fail to load', () => {
      mockUseCases.mockReturnValue({
        cases: [],
        loading: false,
        error: 'Failed to load cases from database',
      });

      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      expect(screen.getByText('Error Loading Cases')).toBeInTheDocument();
      expect(screen.getByText('Failed to load cases from database')).toBeInTheDocument();
    });

    it('should display error message when evidence fails to load', () => {
      mockUseCases.mockReturnValue({
        cases: mockCases,
        loading: false,
        error: null,
      });
      mockUseEvidence.mockReturnValue({
        evidence: [],
        loading: false,
        error: 'Failed to load evidence',
      });

      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      expect(screen.getByText('Error Loading Cases')).toBeInTheDocument();
      expect(screen.getByText('Failed to load evidence')).toBeInTheDocument();
    });

    it('should show retry button in error state', () => {
      mockUseCases.mockReturnValue({
        cases: [],
        loading: false,
        error: 'Database error',
      });

      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no cases exist', () => {
      mockUseCases.mockReturnValue({
        cases: [],
        loading: false,
        error: null,
      });

      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      expect(screen.getByText('No Cases Yet')).toBeInTheDocument();
      expect(screen.getByText(/Create your first case to start organizing/i)).toBeInTheDocument();
    });
  });

  describe('Case Selection', () => {
    it('should render case selector dropdown', () => {
      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      const selector = screen.getByDisplayValue('Employment Case');
      expect(selector).toBeInTheDocument();
      expect(selector.tagName).toBe('SELECT');
    });

    it('should list all cases in dropdown', () => {
      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      expect(screen.getByRole('option', { name: 'Employment Case' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Housing Case' })).toBeInTheDocument();
    });

    it('should default to first case when no selection', () => {
      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      const selector = screen.getByDisplayValue('Employment Case');
      expect(selector).toHaveValue('1');
    });

    it('should change selected case when dropdown changes', async () => {
      const user = userEvent.setup();
      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      const selector = screen.getByDisplayValue('Employment Case');
      await user.selectOptions(selector, '2');

      expect(selector).toHaveValue('2');
    });
  });

  describe('Timeline Rendering', () => {
    it('should render timeline events for active case', () => {
      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      // Text may appear multiple times, check at least one exists
      expect(screen.getAllByText('Case Created').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Last Updated').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Expected Resolution').length).toBeGreaterThan(0);
    });

    it('should show case closed event for closed cases', async () => {
      const user = userEvent.setup();
      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      // Switch to closed case
      const selector = screen.getByDisplayValue('Employment Case');
      await user.selectOptions(selector, '2');

      expect(screen.getAllByText('Case Closed').length).toBeGreaterThan(0);
      expect(screen.queryByText('Expected Resolution')).not.toBeInTheDocument();
    });

    it('should display timeline dates', () => {
      const { container } = render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      // Dates are in the timeline section
      const dates = container.querySelectorAll('.text-\\[10px\\]');
      const dateTexts = Array.from(dates).map(d => d.textContent);

      expect(dateTexts).toContain('2025-01-01'); // Created
      expect(dateTexts).toContain('2025-01-15'); // Updated
    });
  });

  describe('Tree Structure', () => {
    it('should render tree visualization (SVG)', () => {
      const { container } = render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      // Find the main tree SVG (not icon SVGs)
      const svgs = container.querySelectorAll('svg');
      const treeSvg = Array.from(svgs).find(svg =>
        svg.getAttribute('viewBox') === '0 0 2000 1200',
      );

      expect(treeSvg).toBeInTheDocument();
    });

    it('should display case title in tree', () => {
      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      // The tree renders case title in SVG <text> elements
      const { container } = render(<CasesView onCaseSelect={mockOnCaseSelect} />);
      const texts = container.querySelectorAll('text');
      const hasCaseTitle = Array.from(texts).some(text => text.textContent?.includes('Employment Case'));
      expect(hasCaseTitle).toBe(true);
    });
  });

  describe('Evidence Grouping', () => {
    it('should group evidence by type', () => {
      const { container } = render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      // Check that evidence categories are created
      const texts = container.querySelectorAll('text');
      const textContents = Array.from(texts).map(t => t.textContent);

      // Should have "Documents (1)", "Photos (1)", "Emails (1)" for case 1
      expect(textContents.some(t => t?.includes('Documents'))).toBe(true);
      expect(textContents.some(t => t?.includes('Photos'))).toBe(true);
      expect(textContents.some(t => t?.includes('Emails'))).toBe(true);
    });

    it('should show individual evidence items', () => {
      const { container } = render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      const texts = container.querySelectorAll('text');
      const textContents = Array.from(texts).map(t => t?.textContent);

      expect(textContents.some(t => t?.includes('Employment Contract'))).toBe(true);
      expect(textContents.some(t => t?.includes('Photo Evidence'))).toBe(true);
      expect(textContents.some(t => t?.includes('Email Thread'))).toBe(true);
    });

    it('should show correct evidence count for each case', () => {
      const { container } = render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      // Case 1 has 3 evidence items
      const texts = container.querySelectorAll('text');
      const evidenceLabel = Array.from(texts).find(t => t?.textContent?.includes('Evidence ('));
      expect(evidenceLabel?.textContent).toContain('3 items');
    });

    it('should show placeholder when no evidence exists', () => {
      // Override the evidence mock with empty array
      mockUseEvidence.mockReturnValue({
        evidence: [],
        loading: false,
        error: null,
      });

      const { container } = render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      const texts = container.querySelectorAll('text');
      const textContents = Array.from(texts).map(t => t?.textContent);

      expect(textContents.some(t => t?.includes('No evidence yet'))).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible loading state', () => {
      mockUseCases.mockReturnValue({
        cases: [],
        loading: true,
        error: null,
      });

      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      const loadingState = screen.getByRole('status', { busy: true });
      expect(loadingState).toHaveAttribute('aria-live', 'polite');
      expect(loadingState).toHaveAttribute('aria-busy', 'true');
    });

    it('should have keyboard-accessible case selector', () => {
      render(<CasesView onCaseSelect={mockOnCaseSelect} />);

      const selector = screen.getByDisplayValue('Employment Case');
      expect(selector).toHaveClass('cursor-pointer');
    });
  });
});
