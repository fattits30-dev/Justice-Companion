import React from 'react';
import { FolderOpen, MessageSquare, Scale, FileText, BookOpen } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface DashboardEmptyStateProps {
  onCreateCase: () => void;
  onStartChat: () => void;
  onUploadDocument: () => void;
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
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-blue-950/50 to-indigo-950/50 border border-blue-800/30 rounded-xl p-8 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <Scale className="w-8 h-8 text-blue-300" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to Justice Companion</h1>
              <p className="text-lg text-blue-200">Your personal legal information assistant</p>
            </div>
          </div>

          <div className="space-y-4 text-blue-100 leading-relaxed">
            <p>
              Justice Companion helps you organize legal information, track case details, and understand your legal matters better.
              Use this tool to keep notes, manage documents, and stay informed about your situation.
            </p>

            <div className="bg-yellow-900/20 border-2 border-yellow-600/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-200 mb-2">Important Legal Disclaimer</h3>
                  <p className="text-sm text-yellow-100/90 leading-relaxed">
                    <strong>This app provides information only, not legal advice.</strong> Justice Companion is designed to help you
                    organize and understand legal information, but it cannot replace professional legal counsel. For legal advice
                    tailored to your specific situation, please consult a qualified attorney. Nothing in this application creates
                    an attorney-client relationship.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="text-green-400 mt-1">✓</div>
                <div>
                  <h4 className="font-semibold text-white">Track Your Cases</h4>
                  <p className="text-sm text-blue-300">Organize facts, documents, and timelines</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-green-400 mt-1">✓</div>
                <div>
                  <h4 className="font-semibold text-white">Stay Informed</h4>
                  <p className="text-sm text-blue-300">Access legal information resources</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-green-400 mt-1">✓</div>
                <div>
                  <h4 className="font-semibold text-white">Manage Documents</h4>
                  <p className="text-sm text-blue-300">Keep important files organized</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started Section */}
        <EmptyState
          icon={FolderOpen}
          title="Get Started"
          description="Create your first case to begin organizing your legal information"
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
      </div>
    </div>
  );
}
