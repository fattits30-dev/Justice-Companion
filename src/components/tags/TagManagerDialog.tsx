/**
 * TagManagerDialog Component
 * Comprehensive tag management interface for creating, editing, and deleting tags
 */

import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button.tsx';
import { Card } from '../ui/Card.tsx';
import { TagBadge } from '../ui/TagBadge.tsx';
import type { Tag, CreateTagInput, UpdateTagInput } from '../../models/Tag';

interface TagManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#A855F7', // Purple
];

interface FormErrors {
  name?: string;
  color?: string;
  submit?: string;
}

export function TagManagerDialog({ open, onClose }: TagManagerDialogProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: PRESET_COLORS[0],
    description: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load tags when dialog opens
  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const sessionId = window.sessionManager?.getSessionId();
      if (!sessionId) {
        console.error('No session ID');
        return;
      }

      const result = await window.api.tags.list(sessionId);
      if (result.success) {
        if (result.data) {
          setTags(result.data);
        }
      } else {
        console.error('Failed to load tags:', result.error?.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tag name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Tag name must be 50 characters or less';
    }

    if (!formData.color || !/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      newErrors.color = 'Valid color is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateOrUpdate = async () => {
    if (!validate()) {return;}

    setIsSubmitting(true);
    setErrors({});

    try {
      const sessionId = window.sessionManager?.getSessionId();
      if (!sessionId) {
        setErrors({ submit: 'No active session' });
        return;
      }

      let result;
      if (editingTag) {
        // Update existing tag
        const updateInput: UpdateTagInput = {
          name: formData.name,
          color: formData.color,
          description: formData.description || undefined,
        };
        result = await window.api.tags.update(editingTag.id, updateInput, sessionId);
      } else {
        // Create new tag
        const createInput: CreateTagInput = {
          name: formData.name,
          color: formData.color,
          description: formData.description || undefined,
        };
        result = await window.api.tags.create(createInput, sessionId);
      }

      if (result.success) {
        // Reset form
        setFormData({
          name: '',
          color: PRESET_COLORS[0],
          description: '',
        });
        setEditingTag(null);
        await loadTags();
      } else {
        setErrors({ submit: result.error?.message || 'Failed to save tag' });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) {return;}

    const confirmMessage =
      tag.usageCount && tag.usageCount > 0
        ? `Delete "${tag.name}"? It will be removed from ${tag.usageCount} evidence item${tag.usageCount !== 1 ? 's' : ''}.`
        : `Delete "${tag.name}"?`;

    if (!confirm(confirmMessage)) {return;}

    try {
      const sessionId = window.sessionManager?.getSessionId();
      if (!sessionId) {return;}

      const result = await window.api.tags.delete(tagId, sessionId);
      if (result.success) {
        await loadTags();
        // Clear form if deleting the tag being edited
        if (editingTag?.id === tagId) {
          cancelEdit();
        }
      } else {
        alert('Failed to delete tag: ' + (result.error?.message || 'Unknown error'));
      }
    } catch (error: any) {
      alert('Error deleting tag: ' + error.message);
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
    });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setFormData({
      name: '',
      color: PRESET_COLORS[0],
      description: '',
    });
    setErrors({});
  };

  if (!open) {return null;}

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden"
        >
          <Card className="bg-gray-900/95 border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Manage Tags</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close dialog"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Create/Edit Form */}
              <div className="bg-gray-800/50 rounded-lg p-5 mb-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {editingTag ? 'Edit Tag' : 'Create New Tag'}
                </h3>

                <div className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <div className="block text-sm font-medium text-gray-300 mb-1.5">
                      Name <span className="text-red-400">*</span>
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Important, Urgent, Reviewed"
                      maxLength={50}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                    )}
                  </div>

                  {/* Color Picker */}
                  <div>
                    <div className="block text-sm font-medium text-gray-300 mb-1.5">
                      Color <span className="text-red-400">*</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`
                            w-10 h-10 rounded-full transition-all
                            ${formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500 ring-offset-gray-900 scale-110' : 'hover:scale-105'}
                          `}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                    {errors.color && (
                      <p className="mt-1 text-sm text-red-400">{errors.color}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <div className="block text-sm font-medium text-gray-300 mb-1.5">
                      Description (optional)
                    </div>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="What does this tag represent?"
                      maxLength={200}
                    />
                  </div>

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400">{errors.submit}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {editingTag ? (
                      <>
                        <Button
                          onClick={handleCreateOrUpdate}
                          disabled={isSubmitting}
                          variant="primary"
                        >
                          {isSubmitting ? 'Updating...' : 'Update Tag'}
                        </Button>
                        <Button onClick={cancelEdit} variant="secondary">
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleCreateOrUpdate}
                        disabled={isSubmitting}
                        variant="primary"
                        icon={<Plus size={18} />}
                      >
                        {isSubmitting ? 'Creating...' : 'Create Tag'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tag List */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Your Tags ({tags.length})
                </h3>

                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                    <p className="mt-2 text-gray-400">Loading tags...</p>
                  </div>
                ) : tags.length === 0 ? (
                  <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-dashed border-white/10">
                    <p className="text-gray-400 mb-2">No tags yet</p>
                    <p className="text-sm text-gray-500">Create your first tag above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <motion.div
                        key={tag.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-gray-800/30 border border-white/10 rounded-lg hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <TagBadge name={tag.name} color={tag.color} />
                          <div className="flex-1 min-w-0">
                            {tag.description && (
                              <p className="text-sm text-gray-300 truncate">{tag.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-0.5">
                              Used {tag.usageCount || 0} time{tag.usageCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => startEdit(tag)}
                            variant="ghost"
                            size="sm"
                            icon={<Edit2 size={16} />}
                            aria-label={`Edit ${tag.name}`}
                          />
                          <Button
                            onClick={() => handleDeleteTag(tag.id)}
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={16} />}
                            className="text-red-400 hover:text-red-300"
                            aria-label={`Delete ${tag.name}`}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
