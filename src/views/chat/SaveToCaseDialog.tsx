import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, FolderOpen } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface SaveToCaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (caseId: number, title: string) => Promise<{ success: boolean; error?: string }>;
  messageContent: string;
  sessionId: string;
}

interface Case {
  id: number;
  title: string;
  status: 'active' | 'pending' | 'closed';
}

export function SaveToCaseDialog({
  open,
  onClose,
  onSave,
  messageContent,
  sessionId,
}: SaveToCaseDialogProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [title, setTitle] = useState('AI Legal Research Note');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCases, setLoadingCases] = useState(true);

  // Load cases when dialog opens
  useEffect(() => {
    if (open) {
      loadCases();
      // Auto-generate a better title from the content
      const firstLine = messageContent.split('\n')[0].trim();
      if (firstLine.length > 0 && firstLine.length < 100) {
        setTitle(firstLine);
      }
    }
  }, [open, messageContent]);

  const loadCases = async () => {
    setLoadingCases(true);
    setError(null);

    try {
      const result = await window.justiceAPI.getAllCases(sessionId);

      if (!result.success) {
        setError(result.error || 'Failed to load cases');
        return;
      }

      if (result.data) {
        const activeCases = result.data.filter((c: Case) => c.status === 'active');
        setCases(activeCases);

        if (activeCases.length > 0) {
          setSelectedCaseId(activeCases[0].id);
        } else {
          setError('No active cases found. Please create a case first.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingCases(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCaseId || !title.trim()) {
      setError('Please select a case and enter a title');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await onSave(selectedCaseId, title.trim());

      if (result.success) {
        onClose();
        // Reset form
        setTitle('AI Legal Research Note');
        setSelectedCaseId(null);
      } else {
        setError(result.error || 'Failed to save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {return null;}

  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-primary-900/50 to-secondary-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <Save className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Save AI Response to Case</h2>
                <p className="text-sm text-white/70">Add this research to your case notes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Message Preview */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Content to Save
              </label>
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg max-h-48 overflow-y-auto">
                <p className="text-sm text-white/80 whitespace-pre-wrap line-clamp-6">
                  {messageContent}
                </p>
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-white/90 mb-2">
                Note Title <span className="text-danger-400">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AI Legal Research Note"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                disabled={isLoading}
              />
            </div>

            {/* Case Selection */}
            <div>
              <label htmlFor="case" className="block text-sm font-medium text-white/90 mb-2">
                Select Case <span className="text-danger-400">*</span>
              </label>

              {loadingCases ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : cases.length === 0 ? (
                <div className="p-4 bg-warning-500/10 border border-warning-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FolderOpen className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-warning-400 font-medium">No active cases</p>
                      <p className="text-sm text-warning-300/80 mt-1">
                        Create a case first to save AI responses.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  id="case"
                  value={selectedCaseId || ''}
                  onChange={(e) => setSelectedCaseId(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  disabled={isLoading}
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id} className="bg-gray-900">
                      {c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-lg">
                <p className="text-danger-400 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-gray-900/50">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isLoading || !selectedCaseId || !title.trim() || cases.length === 0}
              icon={<Save />}
            >
              {isLoading ? 'Saving...' : 'Save to Case'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
