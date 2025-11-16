/**
 * CaseTagSelector Component
 * Simplified tag selector for cases with inline display
 *
 * MIGRATED: Uses HTTP API via apiClient
 */

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { TagBadge } from "../ui/TagBadge.tsx";
import { TagSelector } from "./TagSelector.tsx";
import { apiClient } from "../../lib/apiClient.ts";
import type { Tag } from "../../models/Tag.ts";
import { logger } from "../../utils/logger";

interface CaseTagSelectorProps {
  caseId: number;
  onTagsChange?: (tags: Tag[]) => void;
  className?: string;
  inline?: boolean;
}

export function CaseTagSelector({
  caseId,
  onTagsChange,
  className = "",
  inline = false,
}: CaseTagSelectorProps) {
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  const loadCaseTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.tags.getTagsForCase(caseId);
      if (response.success && response.data) {
        setSelectedTags(response.data);
        onTagsChange?.(response.data);
      }
    } catch (error) {
      logger.error("Error loading case tags:", {
        service: "CaseTagSelector",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    } finally {
      setIsLoading(false);
    }
  }, [caseId, onTagsChange]);

  useEffect(() => {
    loadCaseTags();
  }, [loadCaseTags]);

  const handleTagsChange = (tags: Tag[]) => {
    setSelectedTags(tags);
    onTagsChange?.(tags);
  };

  if (inline) {
    // Inline mode: show tags with inline selector
    return (
      <div className={`flex items-center flex-wrap gap-2 ${className}`}>
        {isLoading ? (
          <span className="text-sm text-gray-400">Loading tags...</span>
        ) : selectedTags.length === 0 ? (
          <span className="text-sm text-gray-400 italic">No tags</span>
        ) : (
          selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              color={tag.color}
              size="sm"
            />
          ))
        )}
        <button
          type="button"
          onClick={() => setShowSelector(!showSelector)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-md transition-colors"
        >
          <Plus size={12} />
          Tags
        </button>

        {showSelector && (
          <div className="w-full mt-2">
            <TagSelector
              caseId={caseId}
              selectedTags={selectedTags}
              onTagsChange={handleTagsChange}
            />
          </div>
        )}
      </div>
    );
  }

  // Block mode: full selector
  return (
    <div className={className}>
      <TagSelector
        caseId={caseId}
        selectedTags={selectedTags}
        onTagsChange={handleTagsChange}
      />
    </div>
  );
}
