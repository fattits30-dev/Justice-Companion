import { useState } from 'react';
import { useNotes } from '../../hooks/useNotes';
import type { Note } from '../../models/Note';

export interface NotesPanelProps {
  caseId: number;
}

export function NotesPanel({ caseId }: NotesPanelProps) {
  const { notes, loading, error, createNote, updateNote, deleteNote } =
    useNotes(caseId);

  const [isCreating, setIsCreating] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleCreate = async () => {
    if (newNoteContent.trim()) {
      await createNote(newNoteContent);
      setNewNoteContent('');
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (editContent.trim()) {
      await updateNote(id, editContent);
      setEditingId(null);
      setEditContent('');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
        Loading notes...
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
          Notes ({notes.length})
        </h2>

        <button
          onClick={() => setIsCreating(true)}
          style={{
            padding: '10px 20px',
            background: '#f9a825',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f57f17';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f9a825';
          }}
        >
          + Add Note
        </button>
      </div>

      {/* New Note Creator */}
      {isCreating && (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            background: '#fff9c4',
            border: '2px solid #f9a825',
            borderRadius: '8px',
          }}
        >
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Enter note content..."
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
            autoFocus
          />
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
                setNewNoteContent('');
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

      {/* Notes List */}
      {notes.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: '#999',
            background: '#f5f5f5',
            borderRadius: '8px',
          }}
        >
          No notes yet. Click "Add Note" to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notes.map((note: Note) => (
            <div
              key={note.id}
              style={{
                padding: '16px',
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
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
                    autoFocus
                  />
                  <div
                    style={{ display: 'flex', gap: '12px', marginTop: '12px' }}
                  >
                    <button
                      onClick={() => handleUpdate(note.id)}
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
                        setEditingId(null);
                        setEditContent('');
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
              ) : (
                <div>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: '#333',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      marginBottom: '12px',
                    }}
                  >
                    {note.content}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {new Date(note.updatedAt).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setEditingId(note.id);
                          setEditContent(note.content);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#1976d2',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this note?')) {
                            deleteNote(note.id);
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
