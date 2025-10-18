import { useState, memo, useMemo, useCallback } from 'react';
import { PostItNote } from '../../../components/PostItNote';
import { useUserFacts } from '../hooks/useUserFacts';
import type { UserFact } from '../../../models/UserFact';

export interface UserFactsPanelProps {
  caseId: number;
}

const factTypeColors: Record<string, 'yellow' | 'blue' | 'green' | 'pink' | 'purple'> = {
  personal: 'yellow',
  employment: 'blue',
  financial: 'green',
  contact: 'pink',
  medical: 'purple',
  other: 'yellow',
};

const factTypeLabels: Record<string, string> = {
  personal: 'Personal',
  employment: 'Employment',
  financial: 'Financial',
  contact: 'Contact',
  medical: 'Medical',
  other: 'Other',
};

/**
 * User facts panel with CRUD operations
 *
 * @performance Memoized to prevent unnecessary re-renders when props haven't changed
 */
const UserFactsPanelComponent = ({ caseId }: UserFactsPanelProps) => {
  const { userFacts, loading, error, createUserFact, updateUserFact, deleteUserFact } =
    useUserFacts(caseId);

  const [selectedType, setSelectedType] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newFactType, setNewFactType] = useState<
    'personal' | 'employment' | 'financial' | 'contact' | 'medical' | 'other'
  >('personal');

  // Memoize filtered facts computation
  const filteredFacts = useMemo(() =>
    selectedType === 'all'
      ? userFacts
      : userFacts.filter((fact: UserFact) => fact.factType === selectedType),
    [userFacts, selectedType]
  );

  // Memoize event handlers to prevent child re-renders
  const handleCreate = useCallback(async (content: string) => {
    if (content.trim()) {
      await createUserFact({
        caseId,
        factContent: content,
        factType: newFactType,
      });
      setIsCreating(false);
    }
  }, [caseId, newFactType, createUserFact]);

  const handleStartCreating = useCallback(() => {
    setIsCreating(true);
  }, []);

  const handleCancelCreating = useCallback(() => {
    setIsCreating(false);
  }, []);

  const handleFilterAll = useCallback(() => {
    setSelectedType('all');
  }, []);

  const handleFactTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewFactType(e.target.value as 'personal' | 'employment' | 'financial' | 'contact' | 'medical' | 'other');
  }, []);

  const handleCreateNoteUpdate = useCallback((_id: number, content: string) => {
    handleCreate(content);
  }, [handleCreate]);

  const handleUpdateFact = useCallback((id: number, content: string) => {
    updateUserFact(id, { factContent: content });
  }, [updateUserFact]);

  if (loading) {
    return <div className="p-6 text-center text-blue-300">Loading user facts...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-300 bg-red-900/30 rounded-lg">Error: {error}</div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">User Facts ({filteredFacts.length})</h2>

        <button
          onClick={handleStartCreating}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all duration-200"
        >
          + Add User Fact
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={handleFilterAll}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
            selectedType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700/50 text-blue-300 hover:bg-slate-600/50'
          }`}
        >
          All ({userFacts.length})
        </button>

        {Object.entries(factTypeLabels).map(([type, label]) => {
          const count = userFacts.filter((f: UserFact) => f.factType === type).length;
          const handleTypeClick = () => setSelectedType(type);
          return (
            <button
              key={type}
              onClick={handleTypeClick}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700/50 text-blue-300 hover:bg-slate-600/50'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* New Fact Creator */}
      {isCreating && (
        <div className="mb-6">
          <div className="mb-3">
            <label className="block mb-2 font-bold text-white text-sm">Fact Type:</label>
            <select
              value={newFactType}
              onChange={handleFactTypeChange}
              className="px-3 py-2 border border-blue-700/30 bg-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:ring-3 focus:ring-blue-500"
            >
              {Object.entries(factTypeLabels).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <PostItNote
            id={-1}
            content=""
            color={factTypeColors[newFactType]}
            onUpdate={handleCreateNoteUpdate}
            onDelete={handleCancelCreating}
          />
        </div>
      )}

      {/* Facts Grid */}
      {filteredFacts.length === 0 ? (
        <div className="p-12 text-center text-blue-400 bg-slate-800/30 rounded-lg">
          No user facts yet. Click "Add User Fact" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFacts.map((fact: UserFact) => (
            <PostItNote
              key={fact.id}
              id={fact.id}
              content={fact.factContent}
              color={factTypeColors[fact.factType]}
              onUpdate={handleUpdateFact}
              onDelete={deleteUserFact}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const UserFactsPanel = memo(UserFactsPanelComponent);
