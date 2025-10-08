import { useState } from 'react';
import { PostItNote } from '../../../components/PostItNote';
import { useCaseFacts } from '../hooks/useCaseFacts';
import type { CaseFact } from '../../../models/CaseFact';

export interface CaseFactsPanelProps {
  caseId: number;
}

const categoryColors: Record<string, 'yellow' | 'blue' | 'green' | 'pink' | 'purple'> = {
  timeline: 'blue',
  evidence: 'green',
  witness: 'yellow',
  location: 'pink',
  communication: 'purple',
  other: 'yellow',
};

const categoryLabels: Record<string, string> = {
  timeline: 'Timeline',
  evidence: 'Evidence',
  witness: 'Witness',
  location: 'Location',
  communication: 'Communication',
  other: 'Other',
};

const importanceLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function CaseFactsPanel({ caseId }: CaseFactsPanelProps) {
  const {
    caseFacts,
    loading,
    error,
    createCaseFact,
    updateCaseFact,
    deleteCaseFact,
  } = useCaseFacts(caseId);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterImportance, setFilterImportance] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newFactCategory, setNewFactCategory] = useState<
    'timeline' | 'evidence' | 'witness' | 'location' | 'communication' | 'other'
  >('timeline');
  const [newFactImportance, setNewFactImportance] = useState<
    'low' | 'medium' | 'high' | 'critical'
  >('medium');

  const filteredFacts = caseFacts.filter((fact: CaseFact) => {
    const categoryMatch =
      filterCategory === 'all' || fact.factCategory === filterCategory;
    const importanceMatch =
      filterImportance === 'all' || fact.importance === filterImportance;
    return categoryMatch && importanceMatch;
  });

  const handleCreate = async (content: string) => {
    if (content.trim()) {
      await createCaseFact({
        caseId,
        factContent: content,
        factCategory: newFactCategory,
        importance: newFactImportance,
      });
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-blue-300">
        Loading case facts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-300 bg-red-900/30 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          Case Facts ({filteredFacts.length})
        </h2>

        <button
          onClick={() => setIsCreating(true)}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-all duration-200"
        >
          + Add Case Fact
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Category Filters */}
        <div>
          <label className="block mb-2 font-bold text-white text-sm">
            Category:
          </label>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                filterCategory === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700/50 text-blue-300 hover:bg-slate-600/50'
              }`}
            >
              All ({caseFacts.length})
            </button>

            {Object.entries(categoryLabels).map(([category, label]) => {
              const count = caseFacts.filter((f: CaseFact) => f.factCategory === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    filterCategory === category
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700/50 text-blue-300 hover:bg-slate-600/50'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Importance Filters */}
        <div>
          <label className="block mb-2 font-bold text-white text-sm">
            Importance:
          </label>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setFilterImportance('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                filterImportance === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700/50 text-blue-300 hover:bg-slate-600/50'
              }`}
            >
              All
            </button>

            {Object.entries(importanceLabels).map(([importance, label]) => {
              const count = caseFacts.filter(
                (f: CaseFact) => f.importance === importance,
              ).length;
              return (
                <button
                  key={importance}
                  onClick={() => setFilterImportance(importance)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                    filterImportance === importance
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700/50 text-blue-300 hover:bg-slate-600/50'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Fact Creator */}
      {isCreating && (
        <div className="mb-6">
          <div className="flex gap-4 mb-3">
            <div className="flex-1">
              <label className="block mb-2 font-bold text-white text-sm">
                Category:
              </label>
              <select
                value={newFactCategory}
                onChange={(e) =>
                  setNewFactCategory(
                    e.target.value as
                      | 'timeline'
                      | 'evidence'
                      | 'witness'
                      | 'location'
                      | 'communication'
                      | 'other',
                  )
                }
                className="w-full px-3 py-2 border border-blue-700/30 bg-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {Object.entries(categoryLabels).map(([category, label]) => (
                  <option key={category} value={category}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block mb-2 font-bold text-white text-sm">
                Importance:
              </label>
              <select
                value={newFactImportance}
                onChange={(e) =>
                  setNewFactImportance(
                    e.target.value as 'low' | 'medium' | 'high' | 'critical',
                  )
                }
                className="w-full px-3 py-2 border border-blue-700/30 bg-slate-800/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {Object.entries(importanceLabels).map(([importance, label]) => (
                  <option key={importance} value={importance}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <PostItNote
            id={-1}
            content=""
            color={categoryColors[newFactCategory]}
            onUpdate={(_, content) => handleCreate(content)}
            onDelete={() => setIsCreating(false)}
          />
        </div>
      )}

      {/* Facts Grid */}
      {filteredFacts.length === 0 ? (
        <div className="p-12 text-center text-blue-400 bg-slate-800/30 rounded-lg">
          No case facts match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFacts.map((fact: CaseFact) => (
            <div key={fact.id} className="relative">
              <PostItNote
                id={fact.id}
                content={fact.factContent}
                color={categoryColors[fact.factCategory]}
                onUpdate={(id, content) =>
                  updateCaseFact(id, { factContent: content })
                }
                onDelete={(id) => deleteCaseFact(id)}
              />
              {/* Importance badge */}
              <div
                className={`absolute -top-2 -left-2 px-2 py-1 text-white rounded-xl text-xs font-bold shadow-lg ${
                  fact.importance === 'critical'
                    ? 'bg-red-600'
                    : fact.importance === 'high'
                      ? 'bg-orange-600'
                      : fact.importance === 'medium'
                        ? 'bg-yellow-600'
                        : 'bg-gray-500'
                }`}
              >
                {importanceLabels[fact.importance]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
