import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLegalIssues } from './useLegalIssues';
import type { LegalIssue, CreateLegalIssueInput, UpdateLegalIssueInput } from '../models/LegalIssue';

/**
 * Test Suite for useLegalIssues Hook
 *
 * Tests cover:
 * - Initial state and data loading
 * - CRUD operations (create, update, delete)
 * - Error handling and edge cases
 * - Loading states
 * - CaseId changes (re-fetch data)
 * - Refresh functionality
 * - Complex input objects with optional fields
 */

// Mock window.electron.legalIssues API
const mockLegalIssuesAPI = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Setup global window.electron mock
beforeEach(() => {
  (global as any).window = {
    electron: {
      legalIssues: mockLegalIssuesAPI,
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

// Test data
const mockLegalIssue1: LegalIssue = {
  id: 1,
  caseId: 100,
  title: 'Unfair Dismissal',
  description: 'Employee was dismissed without proper procedure',
  relevantLaw: 'Employment Rights Act 1996',
  guidance: 'Check if employer followed correct dismissal procedure',
  createdAt: '2025-10-05T10:00:00Z',
};

const mockLegalIssue2: LegalIssue = {
  id: 2,
  caseId: 100,
  title: 'Discrimination',
  description: null,
  relevantLaw: null,
  guidance: null,
  createdAt: '2025-10-05T11:00:00Z',
};

describe('useLegalIssues', () => {
  describe('Initial State and Data Loading', () => {
    it('should initialize with empty array and loading state', () => {
      mockLegalIssuesAPI.list.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useLegalIssues(100));

      expect(result.current.legalIssues).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should load legal issues on mount', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1, mockLegalIssue2],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.legalIssues).toEqual([mockLegalIssue1, mockLegalIssue2]);
      expect(result.current.error).toBe(null);
      expect(mockLegalIssuesAPI.list).toHaveBeenCalledWith(100);
    });

    it('should handle empty legal issues list', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.legalIssues).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should handle missing data property in response', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: null,
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.legalIssues).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should handle legal issues with null optional fields', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue2],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.legalIssues[0]).toEqual(mockLegalIssue2);
      expect(result.current.legalIssues[0].description).toBe(null);
      expect(result.current.legalIssues[0].relevantLaw).toBe(null);
      expect(result.current.legalIssues[0].guidance).toBe(null);
    });
  });

  describe('CaseId Changes', () => {
    it('should reload legal issues when caseId changes', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1],
      });

      const { result, rerender } = renderHook(({ caseId }) => useLegalIssues(caseId), {
        initialProps: { caseId: 100 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockLegalIssuesAPI.list).toHaveBeenCalledWith(100);
      expect(result.current.legalIssues).toEqual([mockLegalIssue1]);

      // Change caseId
      const mockLegalIssue3: LegalIssue = {
        id: 3,
        caseId: 200,
        title: 'Contract Breach',
        description: 'Breach of employment contract',
        relevantLaw: 'Contract Law',
        guidance: 'Review contract terms',
        createdAt: '2025-10-05T12:00:00Z',
      };

      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue3],
      });

      rerender({ caseId: 200 });

      await waitFor(() => {
        expect(mockLegalIssuesAPI.list).toHaveBeenCalledWith(200);
      });

      await waitFor(() => {
        expect(result.current.legalIssues).toEqual([mockLegalIssue3]);
      });
    });
  });

  describe('Create Operation', () => {
    it('should create a new legal issue with all fields', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const input: CreateLegalIssueInput = {
        caseId: 100,
        title: 'New Legal Issue',
        description: 'Test description',
        relevantLaw: 'Test law',
        guidance: 'Test guidance',
      };

      const newLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'New Legal Issue',
        description: 'Test description',
        relevantLaw: 'Test law',
        guidance: 'Test guidance',
        createdAt: '2025-10-05T13:00:00Z',
      };

      mockLegalIssuesAPI.create.mockResolvedValue({
        success: true,
        data: newLegalIssue,
      });

      const created = await result.current.createLegalIssue(input);

      expect(created).toEqual(newLegalIssue);
      expect(result.current.legalIssues).toEqual([newLegalIssue]);
      expect(mockLegalIssuesAPI.create).toHaveBeenCalledWith(input);
    });

    it('should create a new legal issue with only required fields', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const input: CreateLegalIssueInput = {
        caseId: 100,
        title: 'Minimal Issue',
      };

      const newLegalIssue: LegalIssue = {
        id: 1,
        caseId: 100,
        title: 'Minimal Issue',
        description: null,
        relevantLaw: null,
        guidance: null,
        createdAt: '2025-10-05T13:00:00Z',
      };

      mockLegalIssuesAPI.create.mockResolvedValue({
        success: true,
        data: newLegalIssue,
      });

      const created = await result.current.createLegalIssue(input);

      expect(created).toEqual(newLegalIssue);
      expect(result.current.legalIssues).toEqual([newLegalIssue]);
    });

    it('should handle create failure with error message', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockLegalIssuesAPI.create.mockResolvedValue({
        success: false,
        error: 'Failed to create legal issue',
      });

      const input: CreateLegalIssueInput = {
        caseId: 100,
        title: 'Test Issue',
      };

      await expect(result.current.createLegalIssue(input)).rejects.toThrow(
        'Failed to create legal issue',
      );

      expect(result.current.error).toBe('Failed to create legal issue');
      expect(result.current.legalIssues).toEqual([]);
    });

    it('should handle create exception', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockLegalIssuesAPI.create.mockRejectedValue(new Error('Network error'));

      const input: CreateLegalIssueInput = {
        caseId: 100,
        title: 'Test Issue',
      };

      await expect(result.current.createLegalIssue(input)).rejects.toThrow('Network error');

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Update Operation', () => {
    it('should update an existing legal issue with all fields', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1, mockLegalIssue2],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateInput: UpdateLegalIssueInput = {
        title: 'Updated Title',
        description: 'Updated description',
        relevantLaw: 'Updated law',
        guidance: 'Updated guidance',
      };

      const updatedLegalIssue: LegalIssue = {
        ...mockLegalIssue1,
        title: 'Updated Title',
        description: 'Updated description',
        relevantLaw: 'Updated law',
        guidance: 'Updated guidance',
      };

      mockLegalIssuesAPI.update.mockResolvedValue({
        success: true,
        data: updatedLegalIssue,
      });

      const returned = await result.current.updateLegalIssue(1, updateInput);

      expect(returned).toEqual(updatedLegalIssue);
      expect(result.current.legalIssues).toEqual([updatedLegalIssue, mockLegalIssue2]);
      expect(mockLegalIssuesAPI.update).toHaveBeenCalledWith(1, updateInput);
    });

    it('should update with partial fields', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateInput: UpdateLegalIssueInput = {
        description: 'Only description updated',
      };

      const updatedLegalIssue: LegalIssue = {
        ...mockLegalIssue1,
        description: 'Only description updated',
      };

      mockLegalIssuesAPI.update.mockResolvedValue({
        success: true,
        data: updatedLegalIssue,
      });

      await result.current.updateLegalIssue(1, updateInput);

      expect(result.current.legalIssues[0].description).toBe('Only description updated');
      expect(result.current.legalIssues[0].title).toBe(mockLegalIssue1.title); // Unchanged
    });

    it('should handle update failure with error message', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockLegalIssuesAPI.update.mockResolvedValue({
        success: false,
        error: 'Failed to update legal issue',
      });

      const updateInput: UpdateLegalIssueInput = {
        title: 'Updated Title',
      };

      await expect(result.current.updateLegalIssue(1, updateInput)).rejects.toThrow(
        'Failed to update legal issue',
      );

      expect(result.current.error).toBe('Failed to update legal issue');
      expect(result.current.legalIssues).toEqual([mockLegalIssue1]); // Unchanged
    });

    it('should handle update exception', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockLegalIssuesAPI.update.mockRejectedValue(new Error('Database error'));

      const updateInput: UpdateLegalIssueInput = {
        title: 'Updated Title',
      };

      await expect(result.current.updateLegalIssue(1, updateInput)).rejects.toThrow(
        'Database error',
      );

      expect(result.current.error).toBe('Database error');
    });
  });

  describe('Delete Operation', () => {
    it('should delete a legal issue successfully', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1, mockLegalIssue2],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockLegalIssuesAPI.delete.mockResolvedValue({
        success: true,
      });

      await result.current.deleteLegalIssue(1);

      expect(result.current.legalIssues).toEqual([mockLegalIssue2]);
      expect(mockLegalIssuesAPI.delete).toHaveBeenCalledWith(1);
    });

    it('should handle delete failure with error message', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockLegalIssuesAPI.delete.mockResolvedValue({
        success: false,
        error: 'Failed to delete legal issue',
      });

      await expect(result.current.deleteLegalIssue(1)).rejects.toThrow(
        'Failed to delete legal issue',
      );

      expect(result.current.error).toBe('Failed to delete legal issue');
      expect(result.current.legalIssues).toEqual([mockLegalIssue1]); // Unchanged
    });

    it('should handle delete exception', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockLegalIssuesAPI.delete.mockRejectedValue(new Error('Permission denied'));

      await expect(result.current.deleteLegalIssue(1)).rejects.toThrow('Permission denied');

      expect(result.current.error).toBe('Permission denied');
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh legal issues list', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.legalIssues).toEqual([mockLegalIssue1]);

      // Update mock to return different data
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1, mockLegalIssue2],
      });

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.legalIssues).toEqual([mockLegalIssue1, mockLegalIssue2]);
      });

      expect(mockLegalIssuesAPI.list).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during refresh', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1],
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockLegalIssuesAPI.list.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ success: true, data: [mockLegalIssue1, mockLegalIssue2] });
            }, 10);
          }),
      );

      const refreshPromise = result.current.refresh();

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await refreshPromise;

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle list failure with error message', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: false,
        error: 'Failed to load legal issues',
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load legal issues');
      expect(result.current.legalIssues).toEqual([]);
    });

    it('should handle list failure without error message', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: false,
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load legal issues');
    });

    it('should handle list exception', async () => {
      mockLegalIssuesAPI.list.mockRejectedValue(new Error('Connection timeout'));

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Connection timeout');
      expect(result.current.legalIssues).toEqual([]);
    });

    it('should handle non-Error exception', async () => {
      mockLegalIssuesAPI.list.mockRejectedValue('String error');

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Unknown error');
    });

    it('should clear previous error on successful operation', async () => {
      mockLegalIssuesAPI.list.mockResolvedValue({
        success: false,
        error: 'Initial error',
      });

      const { result } = renderHook(() => useLegalIssues(100));

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      mockLegalIssuesAPI.list.mockResolvedValue({
        success: true,
        data: [mockLegalIssue1],
      });

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      expect(result.current.legalIssues).toEqual([mockLegalIssue1]);
    });
  });
});
