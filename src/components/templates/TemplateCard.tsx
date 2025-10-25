/**
 * Template Card Component
 * Displays a case template with preview and usage options
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckSquare,
  Star,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import type { CaseTemplate, TemplateWithStats } from '../../models/CaseTemplate.ts';

interface TemplateCardProps {
  template: CaseTemplate | TemplateWithStats;
  onUseTemplate: (templateId: number) => void;
  onPreview: (templateId: number) => void;
  showStats?: boolean;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onUseTemplate,
  onPreview,
  showStats = false,
}) => {
  const stats = 'usageCount' in template ? template : null;

  const categoryColors: Record<string, string> = {
    civil: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    criminal: 'bg-red-500/20 text-red-300 border-red-500/30',
    family: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    employment: 'bg-green-500/20 text-green-300 border-green-500/30',
    housing: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    immigration: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    other: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  };

  const categoryColor = categoryColors[template.category] || categoryColors.other;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="backdrop-blur-md bg-card/50 border border-white/10 rounded-lg p-5 cursor-pointer
                 hover:shadow-lg hover:border-white/20 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded-md text-xs font-medium border ${categoryColor}`}
            >
              {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
            </span>
            {template.isSystemTemplate && (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                <Star className="inline-block w-3 h-3 mr-1" />
                Official
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {template.name}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {template.description || 'No description provided'}
      </p>

      {/* Template Features */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-4 h-4 text-primary" />
          <span>{template.timelineMilestones.length} milestones</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckSquare className="w-4 h-4 text-green-400" />
          <span>{template.checklistItems.length} checklist items</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-4 h-4 text-blue-400" />
          <span>{template.suggestedEvidenceTypes.length} evidence types</span>
        </div>
        {showStats && stats && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <span>{stats.usageCount} uses</span>
          </div>
        )}
      </div>

      {/* Stats Row (if available) */}
      {showStats && stats && stats.usageCount > 0 && (
        <div className="border-t border-white/10 pt-3 mb-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                Last used:{' '}
                {stats.lastUsed
                  ? new Date(stats.lastUsed).toLocaleDateString()
                  : 'Never'}
              </span>
            </div>
            <div className="text-green-400 font-medium">
              {stats.successRate.toFixed(0)}% success
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onUseTemplate(template.id)}
          className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-md
                     font-medium text-sm transition-colors"
        >
          Use Template
        </button>
        <button
          onClick={() => onPreview(template.id)}
          className="px-4 py-2 bg-card/80 hover:bg-card border border-white/10
                     text-foreground rounded-md font-medium text-sm transition-colors"
        >
          Preview
        </button>
      </div>
    </motion.div>
  );
};
