import { useState, useEffect } from 'react';
import type { Case, CaseType, CaseStatus, CreateCaseInput } from '../models/Case.ts';

/**
 * CasesView - Full case management UI
 *
 * Features:
 * - List all cases with filtering
 * - Create new cases
 * - Edit existing cases
 * - Delete cases
 * - Status badges and type icons
 */
export function CasesView() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CaseStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<CaseType | 'all'>('all');

  // Load cases on mount
  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) throw new Error('No session');

      const response = await window.justiceAPI.getAllCases(sessionId);
      if (response.success && response.data) {
        setCases(response.data);
      } else {
        setError(response.error || 'Failed to load cases');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (input: CreateCaseInput) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) throw new Error('No session');

      const response = await window.justiceAPI.createCase(input, sessionId);
      if (response.success && response.data) {
        setCases(prev => [response.data, ...prev]);
        setShowCreateDialog(false);
      } else {
        alert('Failed to create case: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteCase = async (caseId: number) => {
    if (!confirm('Are you sure you want to delete this case? This cannot be undone.')) {
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) throw new Error('No session');

      const response = await window.justiceAPI.deleteCase(caseId.toString(), sessionId);
      if (response.success) {
        setCases(prev => prev.filter(c => c.id !== caseId));
      } else {
        alert('Failed to delete case: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Filter cases
  const filteredCases = cases.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterType !== 'all' && c.caseType !== filterType) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading cases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Cases</h2>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={loadCases}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cases</h1>
          <p className="text-gray-400">Manage your legal cases</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Case
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as CaseStatus | 'all')}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as CaseType | 'all')}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="all">All Types</option>
            <option value="employment">Employment</option>
            <option value="housing">Housing</option>
            <option value="consumer">Consumer</option>
            <option value="family">Family</option>
            <option value="debt">Debt</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      {filteredCases.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No cases found</h3>
          <p className="text-gray-400 mb-6">
            {cases.length === 0
              ? "Create your first case to get started"
              : "No cases match your filters"}
          </p>
          {cases.length === 0 && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Create Your First Case
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCases.map((caseItem) => (
            <CaseCard
              key={caseItem.id}
              case={caseItem}
              onDelete={handleDeleteCase}
            />
          ))}
        </div>
      )}

      {/* Create Case Dialog */}
      {showCreateDialog && (
        <CreateCaseDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreateCase}
        />
      )}
    </div>
  );
}

// Case Card Component
function CaseCard({ case: caseItem, onDelete }: { case: Case; onDelete: (id: number) => void }) {
  const statusColors = {
    active: 'bg-green-500/20 text-green-400 border-green-500/50',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  };

  const typeIcons: Record<CaseType, string> = {
    employment: '💼',
    housing: '🏠',
    consumer: '🛒',
    family: '👨‍👩‍👧',
    debt: '💳',
    other: '📋',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{typeIcons[caseItem.caseType]}</span>
          <div>
            <h3 className="text-lg font-semibold">{caseItem.title}</h3>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${statusColors[caseItem.status]} mt-1`}>
              {caseItem.status}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(caseItem.id)}
          className="text-gray-500 hover:text-red-400 transition-colors"
          title="Delete case"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {caseItem.description && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-3">{caseItem.description}</p>
      )}

      <div className="text-xs text-gray-500">
        Created {new Date(caseItem.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// Create Case Dialog
function CreateCaseDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (input: CreateCaseInput) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [caseType, setCaseType] = useState<CaseType>('employment');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a case title');
      return;
    }
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      caseType,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-lg w-full border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Create New Case</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Case Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Unfair Dismissal - Smith v. Acme Corp"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Case Type *</label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CaseType)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="employment">💼 Employment</option>
              <option value="housing">🏠 Housing</option>
              <option value="consumer">🛒 Consumer</option>
              <option value="family">👨‍👩‍👧 Family</option>
              <option value="debt">💳 Debt</option>
              <option value="other">📋 Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the case..."
              rows={4}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
