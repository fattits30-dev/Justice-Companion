import { FileText, FolderOpen, MessageSquare } from 'lucide-react';
import { ViewContainer } from '../layouts/ViewContainer';

interface DashboardEmptyStateProps {
  onCreateCase: () => void;
  onStartChat?: () => void;
  onUploadDocument?: () => void;
}

export function DashboardEmptyState({ onCreateCase }: DashboardEmptyStateProps): JSX.Element {
  return (
    <ViewContainer>
      {/* Hero Section */}
      <div className="text-center mb-12 mt-8">
        {/* Large Centered Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl">
              {/* You can place another icon here if needed */}
            </div>
          </div>
        </div>

        {/* Simple, Clear Headline */}
        <h1 className="text-5xl font-bold text-white mb-4">Justice Companion</h1>
        <p className="text-2xl text-blue-200 mb-8">Your legal matters, organized and simple</p>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          Track your cases, manage documents, and stay on top of important deadlines—all in one
          place.
        </p>
      </div>

      {/* Main Action Card */}
      <div className="max-w-3xl mx-auto mb-12">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 shadow-2xl border border-blue-400/20">
          <h2 className="text-2xl font-bold text-white mb-3 text-center">Ready to get started?</h2>
          <p className="text-blue-100 text-center mb-6">
            Create your first case and we'll guide you through the rest
          </p>
          <div className="flex justify-center">
            <button
              onClick={onCreateCase}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Create Your First Case
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards - Simple 3-column */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center hover:border-blue-500/50 transition-all">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Organize Cases</h3>
          <p className="text-slate-300">Keep all your legal matters in one secure place</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center hover:border-blue-500/50 transition-all">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Store Documents</h3>
          <p className="text-slate-300">Upload and manage all your important files</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center hover:border-blue-500/50 transition-all">
          <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Get Help</h3>
          <p className="text-slate-300">Chat with our AI assistant for guidance</p>
        </div>
      </div>

      {/* Legal Disclaimer - Simplified */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-yellow-900/20 border-2 border-yellow-600/50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-yellow-200 mb-2">Important Note</h3>
              <p className="text-yellow-100 leading-relaxed">
                This app helps you organize information—it doesn't provide legal advice. For legal
                advice specific to your situation, please consult a qualified attorney.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ViewContainer>
  );
}
