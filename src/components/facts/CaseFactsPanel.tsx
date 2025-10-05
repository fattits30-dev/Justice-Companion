import { useState } from 'react';
import { PostItNote } from '../PostItNote';
import { useCaseFacts } from '../../hooks/useCaseFacts';
import type { CaseFact } from '../../models/CaseFact';

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
      <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
        Loading case facts...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: '#d32f2f',
          background: '#ffebee',
          borderRadius: '4px',
        }}
      >
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>
          Case Facts ({filteredFacts.length})
        </h2>

        <button
          onClick={() => setIsCreating(true)}
          style={{
            padding: '10px 20px',
            background: '#388e3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2e7d32';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#388e3c';
          }}
        >
          + Add Case Fact
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ marginBottom: '24px' }}>
        {/* Category Filters */}
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#333',
              fontSize: '14px',
            }}
          >
            Category:
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterCategory('all')}
              style={{
                padding: '8px 16px',
                background: filterCategory === 'all' ? '#388e3c' : '#e0e0e0',
                color: filterCategory === 'all' ? 'white' : '#666',
                border: 'none',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              All ({caseFacts.length})
            </button>

            {Object.entries(categoryLabels).map(([category, label]) => {
              const count = caseFacts.filter((f: CaseFact) => f.factCategory === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category)}
                  style={{
                    padding: '8px 16px',
                    background:
                      filterCategory === category ? '#388e3c' : '#e0e0e0',
                    color: filterCategory === category ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Importance Filters */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#333',
              fontSize: '14px',
            }}
          >
            Importance:
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterImportance('all')}
              style={{
                padding: '8px 16px',
                background: filterImportance === 'all' ? '#388e3c' : '#e0e0e0',
                color: filterImportance === 'all' ? 'white' : '#666',
                border: 'none',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              All
            </button>

            {Object.entries(importanceLabels).map(([importance, label]) => {
              const count = caseFacts.filter(
                (f: CaseFact) => f.importance === importance
              ).length;
              return (
                <button
                  key={importance}
                  onClick={() => setFilterImportance(importance)}
                  style={{
                    padding: '8px 16px',
                    background:
                      filterImportance === importance ? '#388e3c' : '#e0e0e0',
                    color: filterImportance === importance ? 'white' : '#666',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
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
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#333',
                }}
              >
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
                      | 'other'
                  )
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                {Object.entries(categoryLabels).map(([category, label]) => (
                  <option key={category} value={category}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#333',
                }}
              >
                Importance:
              </label>
              <select
                value={newFactImportance}
                onChange={(e) =>
                  setNewFactImportance(
                    e.target.value as 'low' | 'medium' | 'high' | 'critical'
                  )
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
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
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: '#999',
            background: '#f5f5f5',
            borderRadius: '8px',
          }}
        >
          No case facts match the current filters.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredFacts.map((fact: CaseFact) => (
            <div key={fact.id} style={{ position: 'relative' }}>
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
                style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '-8px',
                  padding: '4px 8px',
                  background:
                    fact.importance === 'critical'
                      ? '#d32f2f'
                      : fact.importance === 'high'
                      ? '#f57c00'
                      : fact.importance === 'medium'
                      ? '#fbc02d'
                      : '#9e9e9e',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  boxShadow: '2px 2px 6px rgba(0,0,0,0.2)',
                }}
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
