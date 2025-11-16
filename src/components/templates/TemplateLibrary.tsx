/**
 * Template Library Component
 * Main UI for browsing and selecting case templates
 *
 * MIGRATED TO HTTP API - Uses apiClient instead of Electron IPC
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, Grid, List, AlertCircle } from "lucide-react";
import { TemplateCard } from "./TemplateCard.tsx";
import type { Template, TemplateCategory } from "../../lib/types/api.ts";
import { apiClient } from "../../lib/apiClient.ts";

interface TemplateLibraryProps {
  onUseTemplate: (templateId: number) => void;
  onPreviewTemplate: (templateId: number) => void;
  onCreateCustomTemplate: () => void;
  onClose: () => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onUseTemplate,
  onPreviewTemplate,
  onCreateCustomTemplate,
  onClose,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    TemplateCategory | "all"
  >("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSystemOnly, setShowSystemOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories: Array<{ value: TemplateCategory | "all"; label: string }> =
    [
      { value: "all", label: "All Templates" },
      { value: "civil", label: "Civil" },
      { value: "criminal", label: "Criminal" },
      { value: "family", label: "Family" },
      { value: "employment", label: "Employment" },
      { value: "housing", label: "Housing" },
      { value: "immigration", label: "Immigration" },
      { value: "other", label: "Other" },
    ];

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use HTTP API instead of IPC
      const categoryFilter =
        selectedCategory === "all" ? undefined : selectedCategory;
      const response = await apiClient.templates.list(categoryFilter);

      if (response.success && response.data) {
        // Backend returns array directly (not wrapped in data object)
        const templateData = Array.isArray(response.data) ? response.data : [];
        // Cast to Template[] to satisfy TypeScript (category is string from backend, needs conversion)
        setTemplates(templateData as unknown as Template[]);
      } else {
        const errorMessage = response.success
          ? "Failed to load templates"
          : (response as any).error?.message || "Failed to load templates";
        setError(errorMessage);
      }
    } catch (err) {
      console.error("[TemplateLibrary] Load error:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const filterTemplates = useCallback(() => {
    let result = templates;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          (template.description?.toLowerCase() || "").includes(query),
      );
    }

    // Category filter already applied at API level
    // Only apply client-side if showing all categories
    if (selectedCategory === "all") {
      // No additional filtering needed
    }

    // Apply system-only filter
    if (showSystemOnly) {
      result = result.filter((template) => template.isSystemTemplate);
    }

    setFilteredTemplates(result);
  }, [templates, searchQuery, selectedCategory, showSystemOnly]);

  // Load templates on mount and when category changes
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filter templates when search or filters change
  useEffect(() => {
    filterTemplates();
  }, [filterTemplates]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">
          Template Library
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-accent transition-colors"
          aria-label="Close template library"
        >
          <X size={20} />
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg
                     focus:ring-2 focus:ring-primary focus:border-transparent
                     text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) =>
            setSelectedCategory(e.target.value as TemplateCategory | "all")
          }
          className="px-4 py-2 bg-background border border-input rounded-lg
                   focus:ring-2 focus:ring-primary focus:border-transparent
                   text-foreground"
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showSystemOnly}
            onChange={(e) => setShowSystemOnly(e.target.checked)}
            className="rounded border-input"
          />
          <span>System only</span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded transition-colors ${
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground"
            }`}
            aria-label="Grid view"
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded transition-colors ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground"
            }`}
            aria-label="List view"
          >
            <List size={20} />
          </button>
        </div>

        <button
          onClick={onCreateCustomTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground
                   rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus size={20} />
          <span>New Template</span>
        </button>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-auto p-4 bg-background">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-2">
              Failed to load templates
            </p>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <button
              onClick={loadTemplates}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
                       hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground text-lg mb-2">
              No templates found
            </p>
            <p className="text-muted-foreground text-sm">
              {searchQuery || showSystemOnly || selectedCategory !== "all"
                ? "Try adjusting your filters"
                : "Create your first template to get started"}
            </p>
          </div>
        ) : (
          <motion.div
            layout
            className={`grid gap-4 ${
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            }`}
          >
            <AnimatePresence>
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={onPreviewTemplate}
                  onUseTemplate={onUseTemplate}
                  showStats={false}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Footer with template count */}
      {!loading && !error && (
        <div className="px-4 py-3 border-t border-border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Showing {filteredTemplates.length} of {templates.length} templates
          </p>
        </div>
      )}
    </div>
  );
};
