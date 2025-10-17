import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Calendar, User, Scale, StickyNote, Briefcase } from 'lucide-react';
import { useCases } from '../hooks/useCases';
import { TimelineView } from '@/features/timeline';
import { UserFactsPanel, CaseFactsPanel } from '../../facts';
import { NotesPanel } from '@/features/notes';
import { LegalIssuesPanel } from '@/features/legal';
import { useEvidence } from '@/features/documents';
import type { Case } from '../../../models/Case';

interface CaseDetailViewProps {
  caseId: number;
  onBack: () => void;
}

type TabType = 'overview' | 'timeline' | 'evidence' | 'facts' | 'notes' | 'legal' | 'documents';

const tabs = [
  { id: 'overview' as const, label: 'Overview', icon: Briefcase },
  { id: 'timeline' as const, label: 'Timeline', icon: Calendar },
  { id: 'evidence' as const, label: 'Evidence', icon: FileText },
  { id: 'facts' as const, label: 'Facts', icon: User },
  { id: 'notes' as const, label: 'Notes', icon: StickyNote },
  { id: 'legal' as const, label: 'Legal Issues', icon: Scale },
];

export function CaseDetailView({ caseId, onBack }: CaseDetailViewProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { cases, loading } = useCases();
  const { evidence } = useEvidence();
  const [caseData, setCaseData] = useState<Case | null>(null);

  useEffect(() => {
    const foundCase = cases.find(c => c.id === caseId);
    if (foundCase) {
      setCaseData(foundCase);
    }
  }, [cases, caseId]);

  if (loading || !caseData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="text-blue-200">Loading case details...</div>
      </div>
    );
  }

  const caseEvidence = evidence.filter(ev => ev.caseId === caseId);
  const statusColor = caseData.status === 'active' ? 'text-green-400' : caseData.status === 'closed' ? 'text-gray-400' : 'text-amber-400';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-8 space-y-6">
            {/* Case Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Evidence</h3>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{caseEvidence.length}</div>
                <div className="text-sm text-blue-300">Files attached</div>
              </div>

              <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-600/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Timeline</h3>
                </div>
                <div className="text-3xl font-bold text-white mb-1">-</div>
                <div className="text-sm text-green-300">Events tracked</div>
              </div>

              <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <StickyNote className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Notes</h3>
                </div>
                <div className="text-3xl font-bold text-white mb-1">-</div>
                <div className="text-sm text-purple-300">Notes created</div>
              </div>
            </div>

            {/* Case Description */}
            <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Case Description</h3>
              <p className="text-blue-200 leading-relaxed">
                {caseData.description || 'No description available'}
              </p>
            </div>

            {/* Case Metadata */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl p-6">
                <h3 className="text-sm font-medium text-blue-300 mb-2">Created</h3>
                <p className="text-white">{new Date(caseData.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl p-6">
                <h3 className="text-sm font-medium text-blue-300 mb-2">Last Updated</h3>
                <p className="text-white">{new Date(caseData.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div className="flex-1 overflow-y-auto">
            <TimelineView caseId={caseId} />
          </div>
        );

      case 'evidence':
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Evidence Files</h2>
            {caseEvidence.length === 0 ? (
              <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl p-12 text-center">
                <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Evidence Yet</h3>
                <p className="text-blue-300">Upload evidence files to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {caseEvidence.map(ev => (
                  <div key={ev.id} className="bg-slate-900/50 border border-blue-800/30 rounded-lg p-4 hover:border-blue-600/50 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <h3 className="font-semibold text-white truncate">{ev.title}</h3>
                    </div>
                    <p className="text-sm text-blue-300 truncate">{ev.evidenceType}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(ev.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'facts':
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
              <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl">
                <UserFactsPanel caseId={caseId} />
              </div>
              <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl">
                <CaseFactsPanel caseId={caseId} />
              </div>
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl m-6">
              <NotesPanel caseId={caseId} />
            </div>
          </div>
        );

      case 'legal':
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="bg-slate-900/50 border border-blue-800/30 rounded-xl m-6">
              <LegalIssuesPanel caseId={caseId} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-blue-800/30 p-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-blue-600/20 rounded-lg transition-all text-blue-300"
            title="Back to Cases"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{caseData.title}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className={`text-sm font-medium ${statusColor}`}>
                {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
              </span>
              <span className="text-sm text-blue-300">
                {caseData.caseType.charAt(0).toUpperCase() + caseData.caseType.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/50 text-blue-300 hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        {renderTabContent()}
      </div>
    </div>
  );
}
