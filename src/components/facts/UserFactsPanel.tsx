import { useState } from 'react';
import { PostItNote } from '../PostItNote';
import { useUserFacts } from '../../hooks/useUserFacts';
import type { UserFact } from '../../models/UserFact';

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

export function UserFactsPanel({ caseId }: UserFactsPanelProps) {
  const {
    userFacts,
    loading,
    error,
    createUserFact,
    updateUserFact,
    deleteUserFact,
  } = useUserFacts(caseId);

  const [selectedType, setSelectedType] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newFactType, setNewFactType] = useState<
    'personal' | 'employment' | 'financial' | 'contact' | 'medical' | 'other'
  >('personal');

  const filteredFacts =
    selectedType === 'all'
      ? userFacts
      : userFacts.filter((fact: UserFact) => fact.factType === selectedType);

  const handleCreate = async (content: string) => {
    if (content.trim()) {
      await createUserFact({
        caseId,
        factContent: content,
        factType: newFactType,
      });
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
        Loading user facts...
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
          User Facts ({filteredFacts.length})
        </h2>

        <button
          onClick={() => setIsCreating(true)}
          style={{
            padding: '10px 20px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1565c0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1976d2';
          }}
        >
          + Add User Fact
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setSelectedType('all')}
          style={{
            padding: '8px 16px',
            background: selectedType === 'all' ? '#1976d2' : '#e0e0e0',
            color: selectedType === 'all' ? 'white' : '#666',
            border: 'none',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          All ({userFacts.length})
        </button>

        {Object.entries(factTypeLabels).map(([type, label]) => {
          const count = userFacts.filter((f: UserFact) => f.factType === type).length;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding: '8px 16px',
                background: selectedType === type ? '#1976d2' : '#e0e0e0',
                color: selectedType === type ? 'white' : '#666',
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

      {/* New Fact Creator */}
      {isCreating && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#333',
              }}
            >
              Fact Type:
            </label>
            <select
              value={newFactType}
              onChange={(e) =>
                setNewFactType(
                  e.target.value as
                    | 'personal'
                    | 'employment'
                    | 'financial'
                    | 'contact'
                    | 'medical'
                    | 'other'
                )
              }
              style={{
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
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
          No user facts yet. Click "Add User Fact" to create one.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredFacts.map((fact: UserFact) => (
            <PostItNote
              key={fact.id}
              id={fact.id}
              content={fact.factContent}
              color={factTypeColors[fact.factType]}
              onUpdate={(id, content) =>
                updateUserFact(id, { factContent: content })
              }
              onDelete={(id) => deleteUserFact(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
