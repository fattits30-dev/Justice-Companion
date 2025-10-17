import type { LegalIssue } from '@/models/LegalIssue';
import { useState } from 'react';
import { useLegalIssues } from '../hooks/useLegalIssues';

export interface LegalIssuesPanelProps {
  caseId: number;
}

// Legal issues don't have status - removed

export function LegalIssuesPanel({ caseId }: LegalIssuesPanelProps) {
  const { legalIssues, loading, error, createLegalIssue, deleteLegalIssue } =
    useLegalIssues(caseId);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
  });

  const handleCreate = async () => {
    if (newIssue.title.trim()) {
      await createLegalIssue({
        caseId,
        title: newIssue.title,
        description: newIssue.description,
      });
      setNewIssue({ title: '', description: '' });
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
        Loading legal issues...
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
          Legal Issues ({legalIssues.length})
        </h2>

        <button
          onClick={() => setIsCreating(true)}
          style={{
            padding: '10px 20px',
            background: '#7b1fa2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#6a1b9a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#7b1fa2';
          }}
        >
          + Add Legal Issue
        </button>
      </div>

      {/* New Issue Creator */}
      {isCreating && (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            background: '#f3e5f5',
            border: '2px solid #7b1fa2',
            borderRadius: '8px',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#333',
              }}
            >
              Title:
            </label>
            <input
              type="text"
              value={newIssue.title}
              onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
              placeholder="Enter issue title..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: '#333',
              }}
            >
              Description:
            </label>
            <textarea
              value={newIssue.description}
              onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
              placeholder="Enter detailed description..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              onClick={handleCreate}
              style={{
                padding: '8px 16px',
                background: '#388e3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewIssue({ title: '', description: '' });
              }}
              style={{
                padding: '8px 16px',
                background: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Legal Issues Accordion */}
      {legalIssues.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: '#999',
            background: '#f5f5f5',
            borderRadius: '8px',
          }}
        >
          No legal issues yet. Click "Add Legal Issue" to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {legalIssues.map((issue: LegalIssue) => {
            const isExpanded = expandedId === issue.id;

            return (
              <div
                key={issue.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                  style={{
                    padding: '16px',
                    background: isExpanded ? '#f5f5f5' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = '#fafafa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        color: '#333',
                        fontSize: '16px',
                      }}
                    >
                      {issue.title}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      color: '#999',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    ▼
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '16px',
                      background: 'white',
                      borderTop: '1px solid #e0e0e0',
                    }}
                  >
                    {issue.description ? (
                      <div
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          color: '#555',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          marginBottom: '16px',
                        }}
                      >
                        {issue.description}
                      </div>
                    ) : (
                      <div
                        style={{
                          color: '#999',
                          fontSize: '14px',
                          fontStyle: 'italic',
                          marginBottom: '16px',
                        }}
                      >
                        No description provided.
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        Created: {new Date(issue.createdAt).toLocaleString()}
                      </div>
                      <button
                        onClick={() => {
                          // eslint-disable-next-line no-alert
                          if (window.confirm('Delete this legal issue?')) {
                            void deleteLegalIssue(issue.id);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#d32f2f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
