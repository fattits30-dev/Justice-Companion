import React, { useEffect, useRef, useState } from 'react';

export interface PostItNoteProps {
  id: number;
  content: string;
  color?: 'yellow' | 'blue' | 'green' | 'pink' | 'purple';
  onUpdate?: (id: number, content: string) => void;
  onDelete?: (id: number) => void;
  readOnly?: boolean;
}

const colorStyles = {
  yellow: {
    background: 'linear-gradient(135deg, #fff9c4 0%, #fff59d 100%)',
    border: '#f9a825',
    shadow: 'rgba(249, 168, 37, 0.3)',
  },
  blue: {
    background: 'linear-gradient(135deg, #bbdefb 0%, #90caf9 100%)',
    border: '#1976d2',
    shadow: 'rgba(25, 118, 210, 0.3)',
  },
  green: {
    background: 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%)',
    border: '#388e3c',
    shadow: 'rgba(56, 142, 60, 0.3)',
  },
  pink: {
    background: 'linear-gradient(135deg, #f8bbd0 0%, #f48fb1 100%)',
    border: '#c2185b',
    shadow: 'rgba(194, 24, 91, 0.3)',
  },
  purple: {
    background: 'linear-gradient(135deg, #e1bee7 0%, #ce93d8 100%)',
    border: '#7b1fa2',
    shadow: 'rgba(123, 31, 162, 0.3)',
  },
};

export function PostItNote({
  id,
  content,
  color = 'yellow',
  onUpdate,
  onDelete,
  readOnly = false,
}: PostItNoteProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const style = colorStyles[color];

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = (): void => {
    setIsEditing(false);
    if (editedContent.trim() !== content && onUpdate) {
      onUpdate(id, editedContent.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      setEditedContent(content);
      setIsEditing(false);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '200px',
        minHeight: '200px',
        background: style.background,
        border: `2px solid ${style.border}`,
        borderRadius: '4px',
        boxShadow: `4px 4px 12px ${style.shadow}`,
        padding: '16px',
        fontFamily: "'Segoe Print', 'Comic Sans MS', cursive",
        fontSize: '14px',
        color: '#333',
        cursor: readOnly ? 'default' : 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: isEditing ? 'scale(1.02)' : 'scale(1)',
      }}
      onClick={() => {
        if (!readOnly && !isEditing) {
          setIsEditing(true);
        }
      }}
      onMouseEnter={(e) => {
        if (!isEditing) {
          e.currentTarget.style.transform = 'scale(1.02) rotate(-1deg)';
          e.currentTarget.style.boxShadow = `6px 6px 16px ${style.shadow}`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isEditing) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `4px 4px 12px ${style.shadow}`;
        }
      }}
    >
      {/* Delete button */}
      {!readOnly && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // eslint-disable-next-line no-alert
            if (window.confirm('Delete this note?')) {
              onDelete(id);
            }
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: `1px solid ${style.border}`,
            background: 'rgba(255, 255, 255, 0.7)',
            color: '#d32f2f',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#d32f2f';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
            e.currentTarget.style.color = '#d32f2f';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ×
        </button>
      )}

      {/* Content */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            minHeight: '168px',
            border: 'none',
            background: 'transparent',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            color: 'inherit',
            resize: 'vertical',
            outline: 'none',
          }}
          placeholder="Click to add content..."
        />
      ) : (
        <div
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: '168px',
          }}
        >
          {content || 'Click to add content...'}
        </div>
      )}
    </div>
  );
}
