import { FolderOpen, MessageSquare, Scale, FileText, BookOpen } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface DashboardEmptyStateProps {
  onCreateCase: () => void;
  onStartChat: () => void;
  onUploadDocument: () => void;
}

/**
 * Empty state for Dashboard when no cases exist
 *
 * Shows a welcoming message with:
 * - Primary action: Create first case
 * - Secondary action: Learn how it works
 * - Quick action cards for common tasks
 */
export function DashboardEmptyState({
  onCreateCase,
  onStartChat,
  onUploadDocument,
}: DashboardEmptyStateProps): JSX.Element {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No Cases Yet"
      description="Get started by creating your first legal case or importing existing data"
      action={{
        label: 'Create Your First Case',
        onClick: onCreateCase,
      }}
      secondaryAction={{
        label: 'Learn How It Works',
        onClick: () => {
          // TODO: Open tutorial/guide
          console.log('Opening tutorial...');
        },
      }}
    >
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 mb-6">
        <QuickActionCard
          icon={MessageSquare}
          title="Start a Chat"
          description="Ask legal questions"
          onClick={onStartChat}
        />
        <QuickActionCard
          icon={Scale}
          title="Create Case"
          description="Track legal matter"
          onClick={onCreateCase}
        />
        <QuickActionCard
          icon={FileText}
          title="Upload Documents"
          description="Analyze evidence"
          onClick={onUploadDocument}
        />
      </div>

      {/* Helpful Tips */}
      <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-700/30 rounded-lg p-4 text-left">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Getting Started Tips</h4>
            <ul className="text-xs text-blue-200 space-y-1">
              <li>• Create a case to organize your legal documents and information</li>
              <li>• Use the AI chat for instant legal information and guidance</li>
              <li>• Upload documents to analyze and extract key information</li>
            </ul>
          </div>
        </div>
      </div>
    </EmptyState>
  );
}

interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}

function QuickActionCard({ icon: Icon, title, description, onClick }: QuickActionCardProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-4 bg-slate-800/30 hover:bg-slate-700/40 border border-slate-700/30 rounded-lg transition-all text-center group"
    >
      <div className="p-3 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition-colors">
        <Icon className="w-6 h-6 text-blue-300" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
        <p className="text-xs text-blue-300">{description}</p>
      </div>
    </button>
  );
}
