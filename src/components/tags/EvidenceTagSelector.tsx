/**
 * EvidenceTagSelector Component
 * Allows users to add/remove tags from evidence items
 */

import { useState, useEffect } from 'react';
import { Plus, Tag as TagIcon } from 'lucide-react';
import { TagBadge } from '../ui/TagBadge';
import { Button } from '../ui/Button';
import type { Tag } from '../../models/Tag';

interface EvidenceTagSelectorProps {
  evidenceId: number;
  onTagsChange?: (tags: Tag[]) => void;
  className?: string;
}

export function EvidenceTagSelector({
  evidenceId,
  onTagsChange,
  className = '',
}: EvidenceTagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTags();
    loadEvidenceTags();
  }, [evidenceId]);

  const loadTags = async () => {
    try {
      const sessionId = window.sessionManager?.getSessionId();
      if (!sessionId) {return;}

      const result = await window.api.tags.list(sessionId);
      if (result.success && result.data) {
        setAllTags(result.data);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadEvidenceTags = async () => {
    setIsLoading(true);
    try {
      const sessionId = window.sessionManager?.getSessionId();
      if (!sessionId) {return;}

      const result = await window.api.tags.getForEvidence(evidenceId, sessionId);
      if (result.success && result.data) {
        setSelectedTags(result.data);
        onTagsChange?.(result.data);
      }
    } catch (error) {
      console.error('Error loading evidence tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = async (tagId: number) => {
    try {
      const sessionId = window.sessionManager?.getSessionId();
      if (!sessionId) {return;}

      const result = await window.api.tags.tagEvidence(evidenceId, tagId, sessionId);
      if (result.success) {
        await loadEvidenceTags();
        setIsSelecting(false);
      } else {
        alert('Failed to add tag: ' + result.error);
      }
    } catch (error: any) {
      alert('Error adding tag: ' + error.message);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      const sessionId = window.sessionManager?.getSessionId();
      if (!sessionId) {return;}

      const result = await window.api.tags.untagEvidence(evidenceId, tagId, sessionId);
      if (result.success) {
        await loadEvidenceTags();
      } else {
        alert('Failed to remove tag: ' + result.error);
      }
    } catch (error: any) {
      alert('Error removing tag: ' + error.message);
    }
  };

  const availableTags = allTags.filter(
    (tag) => !selectedTags.some((st) => st.id === tag.id)
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-2 items-center">
        {isLoading ? (
          <span className="text-sm text-gray-400">Loading tags...</span>
        ) : (
          <>
            {selectedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                color={tag.color}
                onRemove={() => handleRemoveTag(tag.id)}
                size="sm"
              />
            ))}

            {selectedTags.length === 0 && !isSelecting && (
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <TagIcon size={14} />
                No tags
              </span>
            )}

            {!isSelecting && (
              <Button
                onClick={() => setIsSelecting(true)}
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                className="text-blue-400 hover:text-blue-300"
              >
                Add Tag
              </Button>
            )}
          </>
        )}
      </div>

      {isSelecting && (
        <div className="p-3 bg-gray-800/30 rounded-lg border border-white/10">
          {availableTags.length > 0 ? (
            <>
              <p className="text-xs text-gray-400 mb-2">Select a tag to add:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.id)}
                    className="hover:scale-105 transition-transform cursor-pointer"
                    aria-label={`Add ${tag.name} tag`}
                  >
                    <TagBadge name={tag.name} color={tag.color} size="sm" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 mb-3">
              All tags applied. Create more tags in Tag Manager.
            </p>
          )}

          <Button
            onClick={() => setIsSelecting(false)}
            variant="secondary"
            size="sm"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
