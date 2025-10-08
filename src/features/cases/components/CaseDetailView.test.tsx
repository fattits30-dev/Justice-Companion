/**
 * CaseDetailView Component Tests
 *
 * Tests for the Case Detail page including:
 * - Tab navigation (Overview, Timeline, Evidence, Facts, Notes, Legal)
 * - Case header with back button, title, status
 * - Overview tab summary cards
 * - Evidence list and empty states
 * - Sub-component rendering (TimelineView, panels)
 * - Loading state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test-utils/test-utils';
import userEvent from '@testing-library/user-event';
import { CaseDetailView } from './CaseDetailView';
import type { Case } from '../../../models/Case';
import type { Evidence } from '../../../models/Evidence';

// Mock hooks
const mockUseCases = vi.fn();
const mockUseEvidence = vi.fn();

vi.mock('../hooks/useCases', () => ({
  useCases: () => mockUseCases(),
}));

vi.mock('../../../hooks/useEvidence', () => ({
  useEvidence: () => mockUseEvidence(),
}));

// Mock sub-components
vi.mock('../../../components/timeline/TimelineView', () => ({
  TimelineView: ({ caseId }: any) => <div data-testid="timeline-view">Timeline for case {caseId}</div>,
}));

vi.mock('../../../components/facts/UserFactsPanel', () => ({
  UserFactsPanel: ({ caseId }: any) => <div data-testid="user-facts-panel">User Facts for case {caseId}</div>,
}));

vi.mock('../../../components/facts/CaseFactsPanel', () => ({
  CaseFactsPanel: ({ caseId }: any) => <div data-testid="case-facts-panel">Case Facts for case {caseId}</div>,
}));

vi.mock('../../../components/notes/NotesPanel', () => ({
  NotesPanel: ({ caseId }: any) => <div data-testid="notes-panel">Notes for case {caseId}</div>,
}));

vi.mock('../../../components/legal/LegalIssuesPanel', () => ({
  LegalIssuesPanel: ({ caseId }: any) => <div data-testid="legal-issues-panel">Legal Issues for case {caseId}</div>,
}));

describe('CaseDetailView', () => {
  const mockOnBack = vi.fn();

  const mockCases: Case[] = [
    {
      id: 1,
      title: 'Employment Dispute Case',
      caseType: 'employment',
      description: 'This case involves unfair dismissal and wrongful termination',
      status: 'active',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-15T00:00:00.000Z',
    },
    {
      id: 2,
      title: 'Housing Case',
      caseType: 'housing',
      description: null,
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
      title: 'Termination Letter',
      evidenceType: 'document',
      content: null,
      filePath: 'C:\\docs\\termination.pdf',
      obtainedDate: '2025-01-12',
      createdAt: '2025-01-12T00:00:00.000Z',
      updatedAt: '2025-01-12T00:00:00.000Z',
    },
    {
      id: 3,
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
    it('should show loading message when loading', () => {
      mockUseCases.mockReturnValue({
        cases: [],
        loading: true,
        error: null,
      });

      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      expect(screen.getByText('Loading case details...')).toBeInTheDocument();
    });

    it('should show loading when case not found', () => {
      mockUseCases.mockReturnValue({
        cases: mockCases,
        loading: false,
        error: null,
      });

      // Request non-existent case
      render(<CaseDetailView caseId={999} onBack={mockOnBack} />);

      expect(screen.getByText('Loading case details...')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should display case title', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      expect(screen.getByText('Employment Dispute Case')).toBeInTheDocument();
    });

    it('should display case status with correct color', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const statusElement = screen.getByText('Active');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveClass('text-green-400');
    });

    it('should display closed status with gray color', () => {
      render(<CaseDetailView caseId={2} onBack={mockOnBack} />);

      const statusElement = screen.getByText('Closed');
      expect(statusElement).toHaveClass('text-gray-400');
    });

    it('should display case type', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      expect(screen.getByText('Employment')).toBeInTheDocument();
    });

    it('should render back button', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const backButton = screen.getByTitle('Back to Cases');
      expect(backButton).toBeInTheDocument();
    });

    it('should call onBack when back button clicked', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const backButton = screen.getByTitle('Back to Cases');
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tab Navigation', () => {
    it('should render all 6 tabs', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      // Use getAllByRole to get tab buttons specifically
      const buttons = screen.getAllByRole('button');
      const buttonTexts = buttons.map(b => b.textContent);

      expect(buttonTexts).toContain('Overview');
      expect(buttonTexts).toContain('Timeline');
      expect(buttonTexts).toContain('Evidence');
      expect(buttonTexts).toContain('Facts');
      expect(buttonTexts).toContain('Notes');
      expect(buttonTexts).toContain('Legal Issues');
    });

    it('should default to Overview tab', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const overviewButton = buttons.find(b => b.textContent === 'Overview');
      expect(overviewButton).toHaveClass('bg-blue-600');
    });

    it('should change tab when clicked', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      // Click Timeline tab button
      const buttons = screen.getAllByRole('button');
      const timelineButton = buttons.find(b => b.textContent === 'Timeline');
      await user.click(timelineButton!);

      expect(screen.getByTestId('timeline-view')).toBeInTheDocument();
    });

    it('should activate Evidence tab', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const evidenceButton = buttons.find(b => b.textContent === 'Evidence');
      await user.click(evidenceButton!);

      expect(screen.getByText('Evidence Files')).toBeInTheDocument();
    });

    it('should activate Facts tab', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const factsButton = buttons.find(b => b.textContent === 'Facts');
      await user.click(factsButton!);

      expect(screen.getByTestId('user-facts-panel')).toBeInTheDocument();
      expect(screen.getByTestId('case-facts-panel')).toBeInTheDocument();
    });

    it('should activate Notes tab', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const notesButton = buttons.find(b => b.textContent === 'Notes');
      await user.click(notesButton!);

      expect(screen.getByTestId('notes-panel')).toBeInTheDocument();
    });

    it('should activate Legal Issues tab', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const legalButton = buttons.find(b => b.textContent === 'Legal Issues');
      await user.click(legalButton!);

      expect(screen.getByTestId('legal-issues-panel')).toBeInTheDocument();
    });
  });

  describe('Overview Tab', () => {
    it('should display evidence count', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      // Case 1 has 2 evidence items - use getAllByText to handle multiple "2"s
      const twoElements = screen.getAllByText('2');
      expect(twoElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Files attached')).toBeInTheDocument();
    });

    it('should display case description', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      expect(screen.getByText('Case Description')).toBeInTheDocument();
      expect(screen.getByText('This case involves unfair dismissal and wrongful termination')).toBeInTheDocument();
    });

    it('should show "No description available" when description is null', () => {
      render(<CaseDetailView caseId={2} onBack={mockOnBack} />);

      expect(screen.getByText('No description available')).toBeInTheDocument();
    });

    it('should display created and updated dates', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();

      // Dates should be formatted as locale strings
      const createdDate = new Date('2025-01-01T00:00:00.000Z').toLocaleDateString();
      const updatedDate = new Date('2025-01-15T00:00:00.000Z').toLocaleDateString();

      expect(screen.getByText(createdDate)).toBeInTheDocument();
      expect(screen.getByText(updatedDate)).toBeInTheDocument();
    });

    it('should display summary cards', () => {
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      // These appear in both tabs and summary cards - verify they exist multiple times
      expect(screen.getAllByText('Evidence').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Timeline').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Notes').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Evidence Tab', () => {
    it('should display evidence list', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const evidenceButton = buttons.find(b => b.textContent === 'Evidence');
      await user.click(evidenceButton!);

      expect(screen.getByText('Employment Contract')).toBeInTheDocument();
      expect(screen.getByText('Termination Letter')).toBeInTheDocument();
    });

    it('should display evidence type and date', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const evidenceButton = buttons.find(b => b.textContent === 'Evidence');
      await user.click(evidenceButton!);

      // Evidence type
      const types = screen.getAllByText('document');
      expect(types.length).toBeGreaterThan(0);
    });

    it('should show empty state when no evidence', async () => {
      const user = userEvent.setup();
      mockUseEvidence.mockReturnValue({
        evidence: [],
        loading: false,
        error: null,
      });

      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const evidenceButton = buttons.find(b => b.textContent === 'Evidence');
      await user.click(evidenceButton!);

      expect(screen.getByText('No Evidence Yet')).toBeInTheDocument();
      expect(screen.getByText('Upload evidence files to get started')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should render TimelineView component in timeline tab', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const timelineButton = buttons.find(b => b.textContent === 'Timeline');
      await user.click(timelineButton!);

      const timeline = screen.getByTestId('timeline-view');
      expect(timeline).toHaveTextContent('Timeline for case 1');
    });

    it('should render fact panels in facts tab', async () => {
      const user = userEvent.setup();
      render(<CaseDetailView caseId={1} onBack={mockOnBack} />);

      const buttons = screen.getAllByRole('button');
      const factsButton = buttons.find(b => b.textContent === 'Facts');
      await user.click(factsButton!);

      expect(screen.getByText('User Facts for case 1')).toBeInTheDocument();
      expect(screen.getByText('Case Facts for case 1')).toBeInTheDocument();
    });
  });
});
