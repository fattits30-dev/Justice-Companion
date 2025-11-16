/**
 * TagSelector Component
 * Multi-select dropdown for adding/removing tags from cases
 */

import React, { useState, useEffect, useRef } from "react";
import { Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TagBadge } from "../ui/TagBadge.tsx";
import { TagColorPicker } from "./TagColorPicker.tsx";
import { apiClient } from "../../lib/apiClient.ts";
import type { Tag } from "../../models/Tag.ts";

export interface TagSelectorProps {
  caseId: number;
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  className?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  caseId,
  selectedTags,
  onTagsChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all available tags
  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const loadTags = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.tags.list();

      if (response.success && response.data) {
        setAllTags(response.data);
      } else {
        setError("Failed to load tags");
      }
    } catch (err) {
      console.error("Error loading tags:", err);
      setError("Failed to load tags");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = async (tag: Tag) => {
    try {
      const response = await apiClient.tags.attachToCase(tag.id, caseId);

      if (response.success) {
        const updatedTags = [...selectedTags, tag];
        onTagsChange(updatedTags);
      } else {
        setError("Failed to add tag");
      }
    } catch (err) {
      console.error("Error adding tag:", err);
      setError("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tag: Tag) => {
    try {
      const response = await apiClient.tags.removeFromCase(tag.id, caseId);

      if (response.success) {
        const updatedTags = selectedTags.filter((t) => t.id !== tag.id);
        onTagsChange(updatedTags);
      } else {
        setError("Failed to remove tag");
      }
    } catch (err) {
      console.error("Error removing tag:", err);
      setError("Failed to remove tag");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      setError("Tag name is required");
      return;
    }

    try {
      const response = await apiClient.tags.create({
        name: newTagName.trim(),
        color: newTagColor,
      });

      if (response.success && response.data) {
        // Add newly created tag to case immediately
        await handleAddTag(response.data);

        // Reset form
        setNewTagName("");
        setNewTagColor("#3B82F6");
        setShowCreateForm(false);

        // Reload tags
        await loadTags();
      } else {
        setError("Failed to create tag");
      }
    } catch (err) {
      console.error("Error creating tag:", err);
      setError("Failed to create tag");
    }
  };

  const filteredTags = allTags.filter((tag) => {
    const matchesSearch = tag.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const notAlreadySelected = !selectedTags.some((t) => t.id === tag.id);
    return matchesSearch && notAlreadySelected;
  });

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.length === 0 ? (
          <div className="text-sm text-gray-400 italic">No tags</div>
        ) : (
          selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              color={tag.color}
              onRemove={() => handleRemoveTag(tag)}
              size="sm"
            />
          ))
        )}
      </div>

      {/* Add Tag Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
      >
        <Plus size={16} />
        Add Tag
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-2 w-80 bg-gray-800 border border-white/10 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full pl-10 pr-3 py-2 bg-gray-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border-b border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Tags List */}
            {!showCreateForm && (
              <div className="max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                    <p className="mt-2 text-sm text-gray-400">
                      Loading tags...
                    </p>
                  </div>
                ) : filteredTags.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-400">
                    {searchQuery ? "No tags found" : "All tags are assigned"}
                  </div>
                ) : (
                  <div className="p-2">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                      >
                        <TagBadge name={tag.name} color={tag.color} size="sm" />
                        {tag.usageCount !== undefined && tag.usageCount > 0 && (
                          <span className="ml-auto text-xs text-gray-500">
                            {tag.usageCount} uses
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Tag Form */}
            {showCreateForm && (
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., Important, Urgent"
                    className="w-full px-3 py-2 bg-gray-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    maxLength={50}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Color
                  </label>
                  <TagColorPicker
                    selectedColor={newTagColor}
                    onColorSelect={setNewTagColor}
                    size="sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Create & Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewTagName("");
                      setNewTagColor("#3B82F6");
                      setError(null);
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            {!showCreateForm && (
              <div className="p-3 border-t border-white/10 bg-gray-900/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(true);
                    setError(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Create New Tag
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
