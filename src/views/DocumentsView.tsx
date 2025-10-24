import { useState, useEffect } from 'react';
import type { Evidence, EvidenceType } from '../models/Evidence.ts';

/**
 * DocumentsView - Full evidence/document management UI
 *
 * Features:
 * - List all evidence items with filtering
 * - Upload new evidence with file selection
 * - Delete evidence
 * - Type filtering (document/photo/email/recording/note/witness)
 * - Case selection
 */
export function DocumentsView() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [cases, setCases] = useState<{ id: number; title: string }[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filterType, setFilterType] = useState<EvidenceType | 'all'>('all');

  // Load cases on mount
  useEffect(() => {
    loadCases();
  }, []);

  // Load evidence when case selected
  useEffect(() => {
    if (selectedCaseId) {
      loadEvidence(selectedCaseId);
    } else {
      setEvidence([]);
      setLoading(false);
    }
  }, [selectedCaseId]);

  const loadCases = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) throw new Error('No session');

      const response = await window.justiceAPI.getAllCases(sessionId);
      if (response.success && response.data) {
        setCases(response.data.map((c: any) => ({ id: c.id, title: c.title })));
        // Auto-select first case if available
        if (response.data.length > 0) {
          setSelectedCaseId(response.data[0].id);
        }
      } else {
        setError(response.error || 'Failed to load cases');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const loadEvidence = async (caseId: number) => {
    try {
      setLoading(true);
      setError(null);
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) throw new Error('No session');

      const response = await window.justiceAPI.getAllEvidence(caseId.toString(), sessionId);
      if (response.success && response.data) {
        setEvidence(response.data);
      } else {
        setError(response.error || 'Failed to load evidence');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadEvidence = async (input: UploadEvidenceInput) => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) throw new Error('No session');
      if (!selectedCaseId) throw new Error('No case selected');

      const response = await window.justiceAPI.uploadFile(
        selectedCaseId.toString(),
        input.file,
        sessionId
      );

      if (response.success && response.data) {
        setEvidence((prev) => [response.data, ...prev]);
        setShowUploadDialog(false);
      } else {
        alert('Failed to upload evidence: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteEvidence = async (evidenceId: number) => {
    if (!confirm('Are you sure you want to delete this evidence? This cannot be undone.')) {
      return;
    }

    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) throw new Error('No session');

      const response = await window.justiceAPI.deleteEvidence(evidenceId.toString(), sessionId);
      if (response.success) {
        setEvidence((prev) => prev.filter((e) => e.id !== evidenceId));
      } else {
        alert('Failed to delete evidence: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Filter evidence
  const filteredEvidence = evidence.filter((e) => {
    if (filterType !== 'all' && e.evidenceType !== filterType) return false;
    return true;
  });

  if (!selectedCaseId && cases.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No cases available. Create a case first to add evidence.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading evidence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Evidence</h2>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={() => selectedCaseId && loadEvidence(selectedCaseId)}
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
          <h1 className="text-3xl font-bold mb-2">Evidence & Documents</h1>
          <p className="text-gray-400">Manage case evidence and documents</p>
        </div>
        <button
          onClick={() => setShowUploadDialog(true)}
          disabled={!selectedCaseId}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Upload Evidence
        </button>
      </div>

      {/* Case & Type Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Case</label>
          <select
            value={selectedCaseId || ''}
            onChange={(e) => setSelectedCaseId(Number(e.target.value))}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white min-w-[300px]"
          >
            {cases.length === 0 ? (
              <option value="">No cases available</option>
            ) : (
              cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as EvidenceType | 'all')}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="all">All Types</option>
            <option value="document">📄 Document</option>
            <option value="photo">📸 Photo</option>
            <option value="email">📧 Email</option>
            <option value="recording">🎤 Recording</option>
            <option value="note">📝 Note</option>
            <option value="witness">👤 Witness Statement</option>
          </select>
        </div>
      </div>

      {/* Evidence List */}
      {filteredEvidence.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No evidence found</h3>
          <p className="text-gray-400 mb-6">
            {evidence.length === 0 ? 'Upload your first piece of evidence' : 'No evidence matches your filters'}
          </p>
          {evidence.length === 0 && (
            <button
              onClick={() => setShowUploadDialog(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Upload Evidence
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvidence.map((evidenceItem) => (
            <EvidenceCard
              key={evidenceItem.id}
              evidence={evidenceItem}
              onDelete={handleDeleteEvidence}
            />
          ))}
        </div>
      )}

      {/* Upload Evidence Dialog */}
      {showUploadDialog && (
        <UploadEvidenceDialog
          onClose={() => setShowUploadDialog(false)}
          onUpload={handleUploadEvidence}
        />
      )}
    </div>
  );
}

// Evidence Card Component
function EvidenceCard({
  evidence,
  onDelete,
}: {
  evidence: Evidence;
  onDelete: (id: number) => void;
}) {
  const typeIcons: Record<EvidenceType, string> = {
    document: '📄',
    photo: '📸',
    email: '📧',
    recording: '🎤',
    note: '📝',
    witness: '👤',
  };

  const typeColors: Record<EvidenceType, string> = {
    document: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    photo: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    email: 'bg-green-500/20 text-green-400 border-green-500/50',
    recording: 'bg-red-500/20 text-red-400 border-red-500/50',
    note: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    witness: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{typeIcons[evidence.evidenceType]}</span>
          <div>
            <h3 className="text-lg font-semibold">{evidence.title}</h3>
            <span
              className={`inline-block px-2 py-1 rounded text-xs font-medium border ${
                typeColors[evidence.evidenceType]
              } mt-1`}
            >
              {evidence.evidenceType}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(evidence.id)}
          className="text-gray-500 hover:text-red-400 transition-colors"
          title="Delete evidence"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {evidence.content && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-3">{evidence.content}</p>
      )}

      {evidence.filePath && (
        <div className="text-xs text-gray-500 mb-2 truncate">📎 {evidence.filePath}</div>
      )}

      {evidence.obtainedDate && (
        <div className="text-xs text-gray-500">
          Obtained {new Date(evidence.obtainedDate).toLocaleDateString()}
        </div>
      )}

      <div className="text-xs text-gray-600 mt-2">
        Added {new Date(evidence.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// Upload Evidence Dialog
interface UploadEvidenceInput {
  file: File;
  title: string;
  evidenceType: EvidenceType;
  obtainedDate?: string;
}

function UploadEvidenceDialog({
  onClose,
  onUpload,
}: {
  onClose: () => void;
  onUpload: (input: UploadEvidenceInput) => void;
}) {
  const [title, setTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('document');
  const [obtainedDate, setObtainedDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!file) {
      alert('Please select a file');
      return;
    }
    onUpload({
      file,
      title: title.trim(),
      evidenceType,
      obtainedDate: obtainedDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-lg w-full border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Upload Evidence</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">File *</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Employment Contract 2024"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Evidence Type *</label>
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="document">📄 Document</option>
              <option value="photo">📸 Photo</option>
              <option value="email">📧 Email</option>
              <option value="recording">🎤 Recording</option>
              <option value="note">📝 Note</option>
              <option value="witness">👤 Witness Statement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date Obtained</label>
            <input
              type="date"
              value={obtainedDate}
              onChange={(e) => setObtainedDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
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
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
