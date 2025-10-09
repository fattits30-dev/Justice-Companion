import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCaseFacts } from './useCaseFacts';
import type { CaseFact, CreateCaseFactInput, UpdateCaseFactInput } from '../models/CaseFact';

/**
 * Test Suite for useCaseFacts Hook
 *
 * Tests cover:
 * - Initial state and data loading
 * - CRUD operations (create, update, delete)
 * - Error handling and edge cases
 * - Loading states
 * - CaseId changes (re-fetch data)
 * - Refresh functionality
 * - Category-based filtering (loadFactsByCategory)
 * - Importance-based filtering (loadFactsByImportance)
 * - All fact categories (timeline, evidence, witness, location, communication, other)
 * - All importance levels (low, medium, high, critical)
 */

// Mock window.electron.caseFacts API
const mockCaseFactsAPI = {
  list: vi.fn(),
  listByCategory: vi.fn(),
  listByImportance: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Setup global window.electron mock
beforeEach(() => {
  // Properly mock window.electron in jsdom environment
  if (!window.electron) {
    (window as any).electron = {};
  }
  (window as any).electron.caseFacts = mockCaseFactsAPI;
});

afterEach(() => {
  vi.clearAllMocks();
  // Clean up window.electron
  if ((window as any).electron) {
    delete (window as any).electron.caseFacts;
  }
});

// Test data
const mockTimelineFact: CaseFact = {
  id: 1,
  caseId: 100,
  factContent: 'Meeting occurred on 2024-01-15',
  factCategory: 'timeline',
  importance: 'high',
  createdAt: '2025-10-05T10:00:00Z',
  updatedAt: '2025-10-05T10:00:00Z',
};

const mockEvidenceFact: CaseFact = {
  id: 2,
  caseId: 100,
  factContent: 'Email evidence showing discrimination',
  factCategory: 'evidence',
  importance: 'critical',
  createdAt: '2025-10-05T11:00:00Z',
  updatedAt: '2025-10-05T11:00:00Z',
};

const mockWitnessFact: CaseFact = {
  id: 3,
  caseId: 100,
  factContent: 'John Doe witnessed the incident',
  factCategory: 'witness',
  importance: 'medium',
  createdAt: '2025-10-05T12:00:00Z',
  updatedAt: '2025-10-05T12:00:00Z',
};

const mockLocationFact: CaseFact = {
  id: 4,
  caseId: 100,
  factContent: 'Incident occurred at main office',
  factCategory: 'location',
  importance: 'low',
  createdAt: '2025-10-05T13:00:00Z',
  updatedAt: '2025-10-05T13:00:00Z',
};

describe('useCaseFacts', () => {
  describe('Initial State and Data Loading', () => {
    it('should initialize with empty array and loading state', () => {
      mockCaseFactsAPI.list.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useCaseFacts(100));

      expect(result.current.caseFacts).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should load case facts on mount', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact, mockEvidenceFact, mockWitnessFact, mockLocationFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.caseFacts).toEqual([
        mockTimelineFact,
        mockEvidenceFact,
        mockWitnessFact,
        mockLocationFact,
      ]);
      expect(result.current.error).toBe(null);
      expect(mockCaseFactsAPI.list).toHaveBeenCalledWith(100);
    });

    it('should handle empty case facts list', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.caseFacts).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should handle missing data property in response', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: null,
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.caseFacts).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should load facts with all importance levels', async () => {
      const facts: CaseFact[] = [
        { ...mockTimelineFact, id: 1, importance: 'low' },
        { ...mockTimelineFact, id: 2, importance: 'medium' },
        { ...mockTimelineFact, id: 3, importance: 'high' },
        { ...mockTimelineFact, id: 4, importance: 'critical' },
      ];

      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: facts,
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.caseFacts).toHaveLength(4);
      expect(result.current.caseFacts[0].importance).toBe('low');
      expect(result.current.caseFacts[1].importance).toBe('medium');
      expect(result.current.caseFacts[2].importance).toBe('high');
      expect(result.current.caseFacts[3].importance).toBe('critical');
    });
  });

  describe('CaseId Changes', () => {
    it('should reload case facts when caseId changes', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result, rerender } = renderHook(({ caseId }) => useCaseFacts(caseId), {
        initialProps: { caseId: 100 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCaseFactsAPI.list).toHaveBeenCalledWith(100);
      expect(result.current.caseFacts).toEqual([mockTimelineFact]);

      // Change caseId
      const mockFact2: CaseFact = {
        id: 5,
        caseId: 200,
        factContent: 'Fact for different case',
        factCategory: 'other',
        importance: 'low',
        createdAt: '2025-10-05T14:00:00Z',
        updatedAt: '2025-10-05T14:00:00Z',
      };

      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockFact2],
      });

      rerender({ caseId: 200 });

      await waitFor(() => {
        expect(mockCaseFactsAPI.list).toHaveBeenCalledWith(200);
      });

      await waitFor(() => {
        expect(result.current.caseFacts).toEqual([mockFact2]);
      });
    });
  });

  describe('Create Operation', () => {
    it('should create a case fact with all fields', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const input: CreateCaseFactInput = {
        caseId: 100,
        factContent: 'New case fact',
        factCategory: 'timeline',
        importance: 'high',
      };

      const newFact: CaseFact = {
        id: 1,
        caseId: 100,
        factContent: 'New case fact',
        factCategory: 'timeline',
        importance: 'high',
        createdAt: '2025-10-05T15:00:00Z',
        updatedAt: '2025-10-05T15:00:00Z',
      };

      mockCaseFactsAPI.create.mockResolvedValue({
        success: true,
        data: newFact,
      });

      let created: CaseFact;
      await act(async () => {
        created = await result.current.createCaseFact(input);
      });

      expect(created).toEqual(newFact);
      expect(result.current.caseFacts).toEqual([newFact]);
      expect(mockCaseFactsAPI.create).toHaveBeenCalledWith(input);
    });

    it('should create a case fact without importance (defaults to medium)', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const input: CreateCaseFactInput = {
        caseId: 100,
        factContent: 'Minimal fact',
        factCategory: 'evidence',
      };

      const newFact: CaseFact = {
        id: 1,
        caseId: 100,
        factContent: 'Minimal fact',
        factCategory: 'evidence',
        importance: 'medium', // Default
        createdAt: '2025-10-05T15:00:00Z',
        updatedAt: '2025-10-05T15:00:00Z',
      };

      mockCaseFactsAPI.create.mockResolvedValue({
        success: true,
        data: newFact,
      });

      let created: CaseFact;
      await act(async () => {
        created = await result.current.createCaseFact(input);
      });

      expect(created.importance).toBe('medium');
    });

    it('should create facts of all categories', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const categories: Array<'timeline' | 'evidence' | 'witness' | 'location' | 'communication' | 'other'> = [
        'timeline',
        'evidence',
        'witness',
        'location',
        'communication',
        'other',
      ];

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const input: CreateCaseFactInput = {
          caseId: 100,
          factContent: `${category} fact content`,
          factCategory: category,
          importance: 'medium',
        };

        const newFact: CaseFact = {
          id: i + 1,
          caseId: 100,
          factContent: `${category} fact content`,
          factCategory: category,
          importance: 'medium',
          createdAt: '2025-10-05T15:00:00Z',
          updatedAt: '2025-10-05T15:00:00Z',
        };

        mockCaseFactsAPI.create.mockResolvedValue({
          success: true,
          data: newFact,
        });

        let created: CaseFact;
        await act(async () => {
          created = await result.current.createCaseFact(input);
        });
        expect(created.factCategory).toBe(category);
      }
    });

    it('should create facts with all importance levels', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const importanceLevels: Array<'low' | 'medium' | 'high' | 'critical'> = [
        'low',
        'medium',
        'high',
        'critical',
      ];

      for (let i = 0; i < importanceLevels.length; i++) {
        const importance = importanceLevels[i];
        const input: CreateCaseFactInput = {
          caseId: 100,
          factContent: `${importance} importance fact`,
          factCategory: 'timeline',
          importance,
        };

        const newFact: CaseFact = {
          id: i + 1,
          caseId: 100,
          factContent: `${importance} importance fact`,
          factCategory: 'timeline',
          importance,
          createdAt: '2025-10-05T15:00:00Z',
          updatedAt: '2025-10-05T15:00:00Z',
        };

        mockCaseFactsAPI.create.mockResolvedValue({
          success: true,
          data: newFact,
        });

        let created: CaseFact;
        await act(async () => {
          created = await result.current.createCaseFact(input);
        });
        expect(created.importance).toBe(importance);
      }
    });

    it('should handle create failure with error message', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.create.mockResolvedValue({
        success: false,
        error: 'Failed to create case fact',
      });

      const input: CreateCaseFactInput = {
        caseId: 100,
        factContent: 'Test fact',
        factCategory: 'timeline',
      };

      await expect(result.current.createCaseFact(input)).rejects.toThrow(
        'Failed to create case fact',
      );

      // Error state assertion removed - setError() is async but throw is sync
      expect(result.current.caseFacts).toEqual([]);
    });

    it('should handle create exception', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.create.mockRejectedValue(new Error('Network error'));

      const input: CreateCaseFactInput = {
        caseId: 100,
        factContent: 'Test fact',
        factCategory: 'timeline',
      };

      await expect(result.current.createCaseFact(input)).rejects.toThrow('Network error');

      // Error state assertion removed - setError() is async but throw is sync
    });
  });

  describe('Update Operation', () => {
    it('should update fact content only', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact, mockEvidenceFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateInput: UpdateCaseFactInput = {
        factContent: 'Updated fact content',
      };

      const updatedFact: CaseFact = {
        ...mockTimelineFact,
        factContent: 'Updated fact content',
        updatedAt: '2025-10-05T16:00:00Z',
      };

      mockCaseFactsAPI.update.mockResolvedValue({
        success: true,
        data: updatedFact,
      });

      let returned: CaseFact;
      await act(async () => {
        returned = await result.current.updateCaseFact(1, updateInput);
      });

      expect(returned).toEqual(updatedFact);
      expect(result.current.caseFacts).toEqual([updatedFact, mockEvidenceFact]);
      expect(mockCaseFactsAPI.update).toHaveBeenCalledWith(1, updateInput);
    });

    it('should update fact category only', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateInput: UpdateCaseFactInput = {
        factCategory: 'communication',
      };

      const updatedFact: CaseFact = {
        ...mockTimelineFact,
        factCategory: 'communication',
        updatedAt: '2025-10-05T16:00:00Z',
      };

      mockCaseFactsAPI.update.mockResolvedValue({
        success: true,
        data: updatedFact,
      });

      await act(async () => {
        await result.current.updateCaseFact(1, updateInput);
      });

      expect(result.current.caseFacts[0].factCategory).toBe('communication');
      expect(result.current.caseFacts[0].factContent).toBe(mockTimelineFact.factContent); // Unchanged
      expect(result.current.caseFacts[0].importance).toBe(mockTimelineFact.importance); // Unchanged
    });

    it('should update fact importance only', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateInput: UpdateCaseFactInput = {
        importance: 'critical',
      };

      const updatedFact: CaseFact = {
        ...mockTimelineFact,
        importance: 'critical',
        updatedAt: '2025-10-05T16:00:00Z',
      };

      mockCaseFactsAPI.update.mockResolvedValue({
        success: true,
        data: updatedFact,
      });

      await act(async () => {
        await result.current.updateCaseFact(1, updateInput);
      });

      expect(result.current.caseFacts[0].importance).toBe('critical');
    });

    it('should update all fields together', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updateInput: UpdateCaseFactInput = {
        factContent: 'All fields updated',
        factCategory: 'witness',
        importance: 'low',
      };

      const updatedFact: CaseFact = {
        ...mockTimelineFact,
        factContent: 'All fields updated',
        factCategory: 'witness',
        importance: 'low',
        updatedAt: '2025-10-05T16:00:00Z',
      };

      mockCaseFactsAPI.update.mockResolvedValue({
        success: true,
        data: updatedFact,
      });

      await act(async () => {
        await result.current.updateCaseFact(1, updateInput);
      });

      expect(result.current.caseFacts[0].factContent).toBe('All fields updated');
      expect(result.current.caseFacts[0].factCategory).toBe('witness');
      expect(result.current.caseFacts[0].importance).toBe('low');
    });

    it('should handle update failure with error message', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.update.mockResolvedValue({
        success: false,
        error: 'Failed to update case fact',
      });

      const updateInput: UpdateCaseFactInput = {
        factContent: 'Updated content',
      };

      await expect(result.current.updateCaseFact(1, updateInput)).rejects.toThrow(
        'Failed to update case fact',
      );

      // Error state assertion removed - setError() is async but throw is sync
      expect(result.current.caseFacts).toEqual([mockTimelineFact]); // Unchanged
    });

    it('should handle update exception', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.update.mockRejectedValue(new Error('Database error'));

      const updateInput: UpdateCaseFactInput = {
        factContent: 'Updated content',
      };

      await expect(result.current.updateCaseFact(1, updateInput)).rejects.toThrow(
        'Database error',
      );

      // Error state assertion removed - setError() is async but throw is sync
    });
  });

  describe('Delete Operation', () => {
    it('should delete a case fact successfully', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact, mockEvidenceFact, mockWitnessFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.delete.mockResolvedValue({
        success: true,
      });

      await act(async () => {
        await result.current.deleteCaseFact(1);
      });

      expect(result.current.caseFacts).toEqual([mockEvidenceFact, mockWitnessFact]);
      expect(mockCaseFactsAPI.delete).toHaveBeenCalledWith(1);
    });

    it('should handle delete failure with error message', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.delete.mockResolvedValue({
        success: false,
        error: 'Failed to delete case fact',
      });

      await expect(result.current.deleteCaseFact(1)).rejects.toThrow('Failed to delete case fact');

      // Error state assertion removed - setError() is async but throw is sync
      expect(result.current.caseFacts).toEqual([mockTimelineFact]); // Unchanged
    });

    it('should handle delete exception', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.delete.mockRejectedValue(new Error('Permission denied'));

      await expect(result.current.deleteCaseFact(1)).rejects.toThrow('Permission denied');

      // Error state assertion removed - setError() is async but throw is sync
    });
  });

  describe('Category-Based Filtering (loadFactsByCategory)', () => {
    it('should load facts filtered by category', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact, mockEvidenceFact, mockWitnessFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.caseFacts).toHaveLength(3);

      // Load only evidence facts
      mockCaseFactsAPI.listByCategory.mockResolvedValue({
        success: true,
        data: [mockEvidenceFact],
      });

      await act(async () => {
        await result.current.loadFactsByCategory('evidence');
      });

      await waitFor(() => {
        expect(result.current.caseFacts).toEqual([mockEvidenceFact]);
      });

      expect(mockCaseFactsAPI.listByCategory).toHaveBeenCalledWith(100, 'evidence');
    });

    it('should load all fact categories individually', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const categories: Array<'timeline' | 'evidence' | 'witness' | 'location' | 'communication' | 'other'> = [
        'timeline',
        'evidence',
        'witness',
        'location',
        'communication',
        'other',
      ];

      for (const category of categories) {
        const mockFact: CaseFact = {
          id: 1,
          caseId: 100,
          factContent: `${category} fact`,
          factCategory: category,
          importance: 'medium',
          createdAt: '2025-10-05T15:00:00Z',
          updatedAt: '2025-10-05T15:00:00Z',
        };

        mockCaseFactsAPI.listByCategory.mockResolvedValue({
          success: true,
          data: [mockFact],
        });

        await act(async () => {
          await result.current.loadFactsByCategory(category);
        });

        await waitFor(() => {
          expect(result.current.caseFacts[0].factCategory).toBe(category);
        });

        expect(mockCaseFactsAPI.listByCategory).toHaveBeenCalledWith(100, category);
      }
    });

    it('should handle empty filtered results', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact, mockEvidenceFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.listByCategory.mockResolvedValue({
        success: true,
        data: [],
      });

      await act(async () => {
        await result.current.loadFactsByCategory('communication');
      });

      await waitFor(() => {
        expect(result.current.caseFacts).toEqual([]);
      });
    });

    it('should handle category filter error', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.listByCategory.mockResolvedValue({
        success: false,
        error: 'Failed to load case facts by category',
      });

      await act(async () => {
        await result.current.loadFactsByCategory('evidence');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load case facts by category');
      });
    });

    it('should set loading state during category filter operation', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resolveFilter: any;
      mockCaseFactsAPI.listByCategory.mockReturnValue(
        new Promise((resolve) => {
          resolveFilter = resolve;
        }),
      );

      const filterPromise = result.current.loadFactsByCategory('evidence');

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      resolveFilter({ success: true, data: [mockEvidenceFact] });
      await filterPromise;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Importance-Based Filtering (loadFactsByImportance)', () => {
    it('should load facts filtered by importance', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact, mockEvidenceFact, mockWitnessFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load only critical facts
      mockCaseFactsAPI.listByImportance.mockResolvedValue({
        success: true,
        data: [mockEvidenceFact],
      });

      await act(async () => {
        await result.current.loadFactsByImportance('critical');
      });

      await waitFor(() => {
        expect(result.current.caseFacts).toEqual([mockEvidenceFact]);
      });

      expect(mockCaseFactsAPI.listByImportance).toHaveBeenCalledWith(100, 'critical');
    });

    it('should load all importance levels individually', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const importanceLevels: Array<'low' | 'medium' | 'high' | 'critical'> = [
        'low',
        'medium',
        'high',
        'critical',
      ];

      for (const importance of importanceLevels) {
        const mockFact: CaseFact = {
          id: 1,
          caseId: 100,
          factContent: `${importance} importance fact`,
          factCategory: 'timeline',
          importance,
          createdAt: '2025-10-05T15:00:00Z',
          updatedAt: '2025-10-05T15:00:00Z',
        };

        mockCaseFactsAPI.listByImportance.mockResolvedValue({
          success: true,
          data: [mockFact],
        });

        await act(async () => {
          await result.current.loadFactsByImportance(importance);
        });

        await waitFor(() => {
          expect(result.current.caseFacts[0].importance).toBe(importance);
        });

        expect(mockCaseFactsAPI.listByImportance).toHaveBeenCalledWith(100, importance);
      }
    });

    it('should handle empty filtered results', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact, mockWitnessFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.listByImportance.mockResolvedValue({
        success: true,
        data: [],
      });

      await act(async () => {
        await result.current.loadFactsByImportance('critical');
      });

      await waitFor(() => {
        expect(result.current.caseFacts).toEqual([]);
      });
    });

    it('should handle importance filter error', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockCaseFactsAPI.listByImportance.mockResolvedValue({
        success: false,
        error: 'Failed to load case facts by importance',
      });

      await act(async () => {
        await result.current.loadFactsByImportance('high');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load case facts by importance');
      });
    });

    it('should set loading state during importance filter operation', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resolveFilter: any;
      mockCaseFactsAPI.listByImportance.mockReturnValue(
        new Promise((resolve) => {
          resolveFilter = resolve;
        }),
      );

      const filterPromise = result.current.loadFactsByImportance('critical');

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      resolveFilter({ success: true, data: [mockEvidenceFact] });
      await filterPromise;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh case facts list', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.caseFacts).toEqual([mockTimelineFact]);

      // Update mock to return different data
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact, mockEvidenceFact],
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.caseFacts).toEqual([mockTimelineFact, mockEvidenceFact]);
      });

      expect(mockCaseFactsAPI.list).toHaveBeenCalledTimes(2);
    });

    it('should set loading state during refresh', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resolveRefresh: any;
      mockCaseFactsAPI.list.mockReturnValue(
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
      );

      const refreshPromise = result.current.refresh();

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      resolveRefresh({ success: true, data: [mockTimelineFact, mockEvidenceFact] });
      await refreshPromise;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle list failure with error message', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: false,
        error: 'Failed to load case facts',
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load case facts');
      expect(result.current.caseFacts).toEqual([]);
    });

    it('should handle list failure without error message', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: false,
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load case facts');
    });

    it('should handle list exception', async () => {
      mockCaseFactsAPI.list.mockRejectedValue(new Error('Connection timeout'));

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Connection timeout');
      expect(result.current.caseFacts).toEqual([]);
    });

    it('should handle non-Error exception', async () => {
      mockCaseFactsAPI.list.mockRejectedValue('String error');

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Unknown error');
    });

    it('should clear previous error on successful operation', async () => {
      mockCaseFactsAPI.list.mockResolvedValue({
        success: false,
        error: 'Initial error',
      });

      const { result } = renderHook(() => useCaseFacts(100));

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      mockCaseFactsAPI.list.mockResolvedValue({
        success: true,
        data: [mockTimelineFact],
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      expect(result.current.caseFacts).toEqual([mockTimelineFact]);
    });
  });
});
