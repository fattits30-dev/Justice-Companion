/**
 * Template Library Component
 * Main UI for browsing and selecting case templates
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  X,
  TrendingUp,
  Grid,
  List,
} from 'lucide-react';
import { TemplateCard } from './TemplateCard.tsx';
import type {
  CaseTemplate,
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
  }, [sessionId]);

  // Filter templates when search or filters change
  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, showSystemOnly]);

  const loadTemplates = async () => {
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
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // System/custom filter
    if (showSystemOnly) {
      filtered = filtered.filter((t) => t.isSystemTemplate);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query)),
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleUseTemplate = (templateId: number) => {
    onUseTemplate(templateId);
  };

  const handlePreview = (templateId: number) => {
    onPreviewTemplate(templateId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-background border border-white/10 rounded-xl shadow-2xl
                   w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Template Library</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a template to quickly create a new case with pre-configured settings
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-card rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-white/10 rounded-lg
                           text-foreground placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'all')}
              className="px-4 py-2 bg-card border border-white/10 rounded-lg
                         text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 p-1 bg-card border border-white/10 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-card/80'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-card/80'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSystemOnly}
                onChange={(e) => setShowSystemOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-card border-white/10 text-primary
                           focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-sm text-foreground">Official templates only</span>
            </label>
            <span className="text-sm text-muted-foreground">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              <p className="font-medium">Error loading templates</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium">No templates found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}

          {!loading && !error && filteredTemplates.length > 0 && (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                  : 'flex flex-col gap-3'
              }
            >
              <AnimatePresence mode="popLayout">
                {filteredTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TemplateCard
                      template={template}
                      onUseTemplate={handleUseTemplate}
                      onPreview={handlePreview}
                      showStats={true}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 bg-card/30">
          <div className="flex items-center justify-between">
            <button
              onClick={onCreateCustomTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80
                         text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Custom Template
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-card border border-white/10 hover:bg-card/80
                         text-foreground rounded-lg font-medium text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
