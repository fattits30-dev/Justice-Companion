import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { CasesView } from './CasesView.tsx';
import type { Case } from '../models/Case.ts';

const baseCases: Case[] = [
  {
    id: 1,
    title: 'Employment Dispute',
    description: 'Employer reduced hours without consultation',
    caseType: 'employment',
    status: 'active',
    userId: 1,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 2,
    title: 'Housing Disrepair',
    description: 'Mould issues persisting for months',
    caseType: 'housing',
    status: 'pending',
    userId: 1,
    createdAt: '2025-01-14T09:00:00Z',
    updatedAt: '2025-01-14T09:00:00Z',
  },
];

describe('CasesView', () => {
  beforeEach(() => {
    localStorage.setItem('sessionId', 'test-session-123');
    vi.clearAllMocks();
  });

  it('shows loading state while cases are fetched', () => {
    window.justiceAPI.getAllCases = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<CasesView />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading cases...')).toBeInTheDocument();
  });

  it('renders an error state and allows retry', async () => {
    const getAllCases = vi
      .fn()
      .mockResolvedValueOnce({ success: false, error: 'Request failed' })
      .mockResolvedValueOnce({ success: true, data: baseCases });
    window.justiceAPI.getAllCases = getAllCases;

    render(<CasesView />);

    await screen.findByText('Error Loading Cases');
    expect(screen.getByText('Request failed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() =>
      expect(screen.getByText('Employment Dispute')).toBeInTheDocument()
    );
  });

  it('shows empty state when there are no cases', async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: [] });

    render(<CasesView />);

    await screen.findByText('No cases yet');
    expect(
      screen.getByText('Create your first case to keep everything organised.')
    ).toBeInTheDocument();
  });

  it('shows filtered empty state when filters remove all cases', async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });

    render(<CasesView />);

    await screen.findByText('Employment Dispute');

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'closed' },
    });

    await screen.findByText('No cases match your filters');
  });

  it('allows creating a new case', async () => {
    const createdCase: Case = {
      id: 3,
      title: 'Consumer Rights Claim',
      description: 'Faulty product dispute',
      caseType: 'consumer',
      status: 'active',
      userId: 1,
      createdAt: '2025-01-16T09:00:00Z',
      updatedAt: '2025-01-16T09:00:00Z',
    };

    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });
    const createCase = vi
      .fn()
      .mockResolvedValue({ success: true, data: createdCase });
    window.justiceAPI.createCase = createCase;

    render(<CasesView />);

    await screen.findByText('Employment Dispute');

    fireEvent.click(screen.getByRole('button', { name: 'New Case' }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Case Title *'), {
      target: { value: 'Consumer Rights Claim' },
    });
    fireEvent.change(within(dialog).getByLabelText('Case Type *'), {
      target: { value: 'consumer' },
    });
    fireEvent.change(within(dialog).getByLabelText('Description'), {
      target: { value: 'Faulty product dispute' },
    });

    fireEvent.submit(within(dialog).getByRole('button', { name: 'Create Case' }));

    await waitFor(() =>
      expect(createCase).toHaveBeenCalledWith(
        {
          title: 'Consumer Rights Claim',
          description: 'Faulty product dispute',
          caseType: 'consumer',
        },
        'test-session-123'
      )
    );

    await screen.findByText('Consumer Rights Claim');
  });

  it('confirms before deleting a case', async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });
    const deleteCase = vi.fn().mockResolvedValue({ success: true });
    window.justiceAPI.deleteCase = deleteCase;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CasesView />);

    await screen.findByText('Employment Dispute');

    fireEvent.click(screen.getAllByTitle('Delete case')[0]);

    await waitFor(() =>
      expect(deleteCase).toHaveBeenCalledWith('1', 'test-session-123')
    );

    confirmSpy.mockRestore();
  });

  it('does not delete when confirmation is cancelled', async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });
    const deleteCase = vi.fn();
    window.justiceAPI.deleteCase = deleteCase;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<CasesView />);

    await screen.findByText('Employment Dispute');

    fireEvent.click(screen.getAllByTitle('Delete case')[0]);

    expect(deleteCase).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('surfaces API errors from delete operations', async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });
    window.justiceAPI.deleteCase = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Case not found' });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<CasesView />);

    await screen.findByText('Employment Dispute');

    fireEvent.click(screen.getAllByTitle('Delete case')[0]);

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Error: Case not found')
    );

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
