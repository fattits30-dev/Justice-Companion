import { useState } from 'react';
import { FileText, Download, Printer, Eye, CheckCircle, AlertCircle, XCircle, Filter, Mail, Upload } from 'lucide-react';
import { useEvidence } from '../hooks/useEvidence';
import { useCases } from '@/features/cases';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { FileUploadModal } from './FileUploadModal';
import { toast } from 'sonner';
import type { Evidence } from '@/models/Evidence';

interface Document {
  id: string;
  title: string;
  type: 'evidence' | 'witness_statement' | 'contract' | 'correspondence' | 'court_form' | 'expert_report';
  status: 'complete' | 'needs_review' | 'incomplete';
  fileName: string;
  fileType: 'PDF' | 'DOCX';
  uploadDate: string;
  fileSize: string;
  associatedCase: string;
  priority: 'critical' | 'important' | 'supporting';
  checklist: {
    signed: boolean;
    dated: boolean;
    witnessed: boolean;
  };
}

/**
 * Map Evidence to Document for UI display
 */
function mapEvidenceToDocument(evidence: Evidence, caseName: string): Document {
  return {
    id: evidence.id.toString(),
    title: evidence.title,
    type: 'evidence', // Map from evidence.evidenceType if needed
    status: evidence.filePath ? 'complete' : evidence.content ? 'needs_review' : 'incomplete',
    fileName: evidence.filePath?.split('/').pop() || evidence.filePath?.split('\\').pop() || 'Unknown',
    fileType: evidence.filePath?.endsWith('.pdf') ? 'PDF' : 'DOCX',
    uploadDate: new Date(evidence.createdAt).toLocaleDateString(),
    fileSize: 'Unknown', // Evidence model doesn't track file size yet
    associatedCase: caseName,
    priority: 'supporting', // Could be enhanced based on evidence metadata
    checklist: {
      signed: false,
      dated: !!evidence.obtainedDate,
      witnessed: false,
    },
  };
}

export function DocumentsView(): JSX.Element {
  const [filterCase, setFilterCase] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Hooks for evidence and case data
  const { evidence, loading, error, fetchEvidence } = useEvidence();
  const { cases } = useCases();

  // Get the first case ID for upload modal (or default to 1)
  const defaultCaseId = cases.length > 0 ? cases[0].id : 1;

  // Map evidence to documents with case names
  const documents: Document[] = evidence.map((ev) => {
    const caseObj = cases.find((c) => c.id === ev.caseId);
    const caseName = caseObj?.title || `Case #${ev.caseId}`;
    return mapEvidenceToDocument(ev, caseName);
  });

  const filteredDocuments = documents.filter(doc => {
    const caseMatch = filterCase === 'all' || doc.associatedCase === filterCase;
    const statusMatch = filterStatus === 'all' || doc.status === filterStatus;
    return caseMatch && statusMatch;
  });

  const toggleDocSelection = (docId: string) => {
    const newSelection = new Set(selectedDocs);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocs(newSelection);
  };

  // Handler functions for file operations
  const handleViewFile = (doc: Document) => {
    const evidence = findEvidenceById(doc.id);
    if (!evidence?.filePath) {
      toast.error('File path not found for this document');
      return;
    }

    void window.justiceAPI.viewFile(evidence.filePath).then(result => {
      if (!result.success) {
        toast.error(`Failed to open file: ${result.error}`);
      }
    });
  };

  const handleDownloadFile = (doc: Document) => {
    const evidence = findEvidenceById(doc.id);
    if (!evidence?.filePath) {
      toast.error('File path not found for this document');
      return;
    }

    void window.justiceAPI.downloadFile(evidence.filePath, doc.fileName).then(result => {
      if (result.success) {
        toast.success(`File saved to: ${result.savedPath}`);
      } else {
        toast.error(`Failed to download file: ${result.error}`);
      }
    });
  };

  const handlePrintFile = (doc: Document) => {
    const evidence = findEvidenceById(doc.id);
    if (!evidence?.filePath) {
      toast.error('File path not found for this document');
      return;
    }

    void window.justiceAPI.printFile(evidence.filePath).then(result => {
      if (result.success) {
        toast.success('File opened for printing');
      } else {
        toast.error(`Failed to print file: ${result.error}`);
      }
    });
  };

  const handleEmailFile = (doc: Document) => {
    const evidence = findEvidenceById(doc.id);
    if (!evidence?.filePath) {
      toast.error('File path not found for this document');
      return;
    }

    void window.justiceAPI.emailFiles(
      [evidence.filePath],
      `${doc.title} - ${doc.associatedCase}`,
      `Attached: ${doc.fileName}`,
    ).then(result => {
      if (result.success) {
        toast.success('Email client opened');
      } else {
        toast.error(`Failed to open email: ${result.error}`);
      }
    });
  };

  // Bundle operations (multiple files)
  const handleDownloadBundle = () => {
    const docs = selectedDocs.size > 0
      ? filteredDocuments.filter(d => selectedDocs.has(d.id))
      : filteredDocuments;

    if (docs.length === 0) {
      toast.error('No documents to download');
      return;
    }

    void (async () => {
      let successCount = 0;
      for (const doc of docs) {
        const evidence = findEvidenceById(doc.id);
        if (evidence?.filePath) {
          const result = await window.justiceAPI.downloadFile(evidence.filePath, doc.fileName);
          if (result.success) {
            successCount++;
          }
        }
      }

      toast.success(`Downloaded ${successCount} of ${docs.length} files`);
    })();
  };

  const handlePrintBundle = () => {
    const docs = selectedDocs.size > 0
      ? filteredDocuments.filter(d => selectedDocs.has(d.id))
      : filteredDocuments;

    if (docs.length === 0) {
      toast.error('No documents to print');
      return;
    }

    void (async () => {
      let successCount = 0;
      for (const doc of docs) {
        const evidence = findEvidenceById(doc.id);
        if (evidence?.filePath) {
          const result = await window.justiceAPI.printFile(evidence.filePath);
          if (result.success) {
            successCount++;
          }
        }
      }

      toast.success(`Opened ${successCount} of ${docs.length} files for printing`);
    })();
  };

  const handleEmailBundle = () => {
    const docs = selectedDocs.size > 0
      ? filteredDocuments.filter(d => selectedDocs.has(d.id))
      : filteredDocuments;

    if (docs.length === 0) {
      toast.error('No documents to email');
      return;
    }

    const filePaths: string[] = [];
    for (const doc of docs) {
      const evidence = findEvidenceById(doc.id);
      if (evidence?.filePath) {
        filePaths.push(evidence.filePath);
      }
    }

    if (filePaths.length === 0) {
      toast.error('No valid file paths found');
      return;
    }

    void window.justiceAPI.emailFiles(
      filePaths,
      `Case Bundle: ${filePaths.length} documents`,
      'Please find attached case documents.',
    ).then(result => {
      if (result.success) {
        toast.success('Email client opened with documents');
      } else {
        toast.error(`Failed to open email: ${result.error}`);
      }
    });
  };

  // Helper function to find evidence by document ID
  const findEvidenceById = (docId: string) => {
    return evidence.find(ev => ev.id.toString() === docId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'needs_review':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'incomplete':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-600/20 text-green-300 border-green-600/30';
      case 'needs_review':
        return 'bg-amber-600/20 text-amber-300 border-amber-600/30';
      case 'incomplete':
        return 'bg-red-600/20 text-red-300 border-red-600/30';
      default:
        return '';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Show loading state with skeleton cards
  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        {/* Legal Disclaimer Banner */}
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-b border-amber-600/30 px-4 py-2">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <div className="text-amber-400 text-lg">⚖️</div>
            <div className="flex-1">
              <p className="text-amber-200 text-xs">
                <strong>Legal Notice:</strong> This tool assists with document organization only. You have the right to self-represent.
                <span className="text-amber-100"> However, licensed legal counsel is strongly advised regardless of your intentions.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar Skeleton */}
        <div className="bg-slate-900/50 border-b border-blue-800/30 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-3 h-10" />
        </div>

        {/* Loading State with Skeleton Cards */}
        <div
          className="flex-1 overflow-y-auto p-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-full px-4">
            <div className="grid grid-cols-4 gap-6 w-full transition-opacity duration-300">
              <SkeletonCard count={8} />
            </div>
          </div>
          <span className="sr-only">Loading documents...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        {/* Legal Disclaimer Banner */}
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-b border-amber-600/30 px-4 py-2">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <div className="text-amber-400 text-lg">⚖️</div>
            <div className="flex-1">
              <p className="text-amber-200 text-xs">
                <strong>Legal Notice:</strong> This tool assists with document organization only. You have the right to self-represent.
                <span className="text-amber-100"> However, licensed legal counsel is strongly advised regardless of your intentions.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Error Loading Documents</h2>
            <p className="text-red-200 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state when no documents exist
  if (filteredDocuments.length === 0 && documents.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        {/* Legal Disclaimer Banner */}
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-b border-amber-600/30 px-4 py-2">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <div className="text-amber-400 text-lg">⚖️</div>
            <div className="flex-1">
              <p className="text-amber-200 text-xs">
                <strong>Legal Notice:</strong> This tool assists with document organization only. You have the right to self-represent.
                <span className="text-amber-100"> However, licensed legal counsel is strongly advised regardless of your intentions.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Documents Yet</h2>
            <p className="text-blue-200 mb-6">
              Upload evidence, contracts, witness statements, or other legal documents to get started organizing your case files.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
            >
              Upload Your First Document
            </button>
            <p className="text-gray-400 text-sm mt-4">
              Supported formats: PDF, DOCX, Images
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Legal Disclaimer Banner */}
      <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-b border-amber-600/30 px-4 py-2">
        <div className="flex items-center gap-2 max-w-7xl mx-auto">
          <div className="text-amber-400 text-lg">⚖️</div>
          <div className="flex-1">
            <p className="text-amber-200 text-xs">
              <strong>Legal Notice:</strong> This tool assists with document organization only. You have the right to self-represent.
              <span className="text-amber-100"> However, licensed legal counsel is strongly advised regardless of your intentions.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/50 border-b border-blue-800/30 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Filter className="w-5 h-5 text-blue-300" />

          <select
            value={filterCase}
            onChange={(e) => setFilterCase(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-blue-700/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Cases</option>
            <option value="Smith vs ABC Corp">Smith vs ABC Corp</option>
            <option value="Tenant Rights Case">Tenant Rights Case</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-blue-700/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="complete">Complete</option>
            <option value="needs_review">Needs Review</option>
            <option value="incomplete">Incomplete</option>
          </select>

          <div className="flex-1" />

          {/* Upload Evidence Button */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-sm font-medium"
            title="Upload Evidence"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Evidence</span>
          </button>

          {selectedDocs.size > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-blue-300 text-sm font-medium">{selectedDocs.size} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleDownloadBundle()}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-sm"
                  title="Download Bundle"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => void handlePrintBundle()}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all text-sm"
                  title="Print Bundle"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => void handleEmailBundle()}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all text-sm"
                  title="Email Bundle"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-blue-300 text-sm font-medium">Full Case Bundle:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleDownloadBundle()}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-sm"
                  title="Download All"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => void handlePrintBundle()}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all text-sm"
                  title="Print All"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => void handleEmailBundle()}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all text-sm"
                  title="Email All"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="w-full max-w-full px-4">
          <div className="grid grid-cols-4 gap-6 w-full">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`bg-slate-900/50 border rounded-lg p-5 transition-all hover:border-blue-600/50 hover:shadow-lg hover:shadow-blue-600/20 cursor-pointer ${
                  selectedDocs.has(doc.id) ? 'border-blue-600/70 shadow-lg shadow-blue-600/30' : 'border-blue-800/30'
                }`}
                onClick={() => toggleDocSelection(doc.id)}
              >
                {/* Document Icon and Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-300 font-medium">{doc.fileType}</div>
                      <div className="text-xs text-gray-400">{doc.fileSize}</div>
                    </div>
                  </div>
                  {getStatusIcon(doc.status)}
                </div>

                {/* Title */}
                <h3 className="text-white font-bold text-base mb-2 line-clamp-2">{doc.title}</h3>
                <div className="text-xs text-blue-300 mb-3">{getTypeLabel(doc.type)}</div>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium mb-4 ${getStatusBadge(doc.status)}`}>
                  <span className="capitalize">{doc.status.replace('_', ' ')}</span>
                </div>

                {/* Metadata */}
                <div className="space-y-1 mb-4 text-sm text-gray-400">
                  <div className="truncate"><span className="text-gray-500">Case:</span> {doc.associatedCase}</div>
                  <div><span className="text-gray-500">Uploaded:</span> {doc.uploadDate}</div>
                  <div><span className="text-gray-500">Priority:</span> <span className={`capitalize font-medium ${doc.priority === 'critical' ? 'text-red-400' : doc.priority === 'important' ? 'text-amber-400' : 'text-gray-400'}`}>{doc.priority}</span></div>
                </div>

                {/* Checklist */}
                <div className="border-t border-blue-800/30 pt-3 mb-4">
                  <div className="text-xs text-gray-400 mb-2">Document Checklist:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${doc.checklist.signed ? 'bg-green-600/20 text-green-300' : 'bg-gray-700/50 text-gray-500'}`}>
                      {doc.checklist.signed ? '✓' : '○'} Signed
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${doc.checklist.dated ? 'bg-green-600/20 text-green-300' : 'bg-gray-700/50 text-gray-500'}`}>
                      {doc.checklist.dated ? '✓' : '○'} Dated
                    </span>
                    {doc.type === 'witness_statement' && (
                      <span className={`text-xs px-2 py-1 rounded ${doc.checklist.witnessed ? 'bg-green-600/20 text-green-300' : 'bg-gray-700/50 text-gray-500'}`}>
                        {doc.checklist.witnessed ? '✓' : '○'} Witnessed
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-xs font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleViewFile(doc);
                    }}
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownloadFile(doc);
                    }}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handlePrintFile(doc);
                    }}
                    title="Print"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800/50 text-gray-300 rounded-lg hover:bg-slate-700/50 transition-all text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleEmailFile(doc);
                    }}
                    title="Email"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        caseId={defaultCaseId}
        onUploadComplete={() => {
          void fetchEvidence();
          toast.success('Evidence uploaded successfully!');
        }}
      />
    </div>
  );
}
