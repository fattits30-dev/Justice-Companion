/**
 * Template Library Component
 * Main UI for browsing and selecting case templates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  X,
  Grid,
  List,
} from 'lucide-react';
import { TemplateCard } from './TemplateCard.tsx';
import type {
  TemplateWithStats,
  TemplateCategory,
} from '../../models/CaseTemplate.ts';

interface TemplateLibraryProps {
  sessionId: string;
  onUseTemplate: (templateId: number) => void;
  onPreviewTemplate: (templateId: number) => void;
  onCreateCustomTemplate: () => void;
  onClose: () => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  sessionId,
  onUseTemplate,
  onPreviewTemplate,
  onCreateCustomTemplate,
  onClose,
}) => {
  const [templates, setTemplates] = useState<TemplateWithStats[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSystemOnly, setShowSystemOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories: Array<{ value: TemplateCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All Templates' },
    { value: 'civil', label: 'Civil' },
    { value: 'criminal', label: 'Criminal' },
    { value: 'family', label: 'Family' },
    { value: 'employment', label: 'Employment' },
    { value: 'housing', label: 'Housing' },
    { value: 'immigration', label: 'Immigration' },
    { value: 'other', label: 'Other' },
  ];

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [sessionId, loadTemplates]);

  // Filter templates when search or filters change
  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, showSystemOnly, filterTemplates]);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await window.justiceAPI.templates.getAllWithStats(sessionId);

      if (response.success && response.data) {
        setTemplates(response.data);
      } else {
        setError(response.error || 'Failed to load templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const filterTemplates = useCallback(() => {
    let result = templates;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(template =>
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(template => template.category === selectedCategory);
    }

    // Apply system-only filter
    if (showSystemOnly) {
      result = result.filter(template => template.isSystemTemplate);
    }

    setFilteredTemplates(result);
  }, [templates, searchQuery, selectedCategory, showSystemOnly]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Template Library</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'all')}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {categories.map(category => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSystemOnly}
            onChange={(e) => setShowSystemOnly(e.target.checked)}
            className="rounded"
          />
          <span>System only</span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            <List size={20} />
          </button>
        </div>

        <button
          onClick={onCreateCustomTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>New Template</span>
        </button>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No templates found</div>
        ) : (
          <motion.div 
            layout
            className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}
          >
            <AnimatePresence>
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onView={onPreviewTemplate}
                  onUse={onUseTemplate}
                  viewMode={viewMode}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};