/**
 * CaseFileView - Digital Case File Layout
 *
 * Comprehensive view showing all case materials organized like a legal file:
 * - Case Summary (auto-generated overview)
 * - Evidence (documents, photos, emails organized by type)
 * - Legal Research (legislation + case law from UK APIs)
 * - Timeline (deadlines and key dates)
 * - AI Analysis (chat history summaries)
 *
 * Features:
 * - Folder-style navigation
 * - Expandable sections
 * - PDF export capability (future)
 * - Real-time legal API integration
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Folder,
  FolderOpen,
  FileText,
  File,
  Image,
  Mail,
  Mic,
  StickyNote,
  Users,
  Scale,
  Gavel,
  Calendar,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Clock,
  BookOpen,
} from "lucide-react";
import { Card } from "../../components/ui/Card.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { SkeletonCard } from "../../components/ui/Skeleton.tsx";
import { apiClient } from "../../lib/apiClient.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { logger } from "../../lib/logger.ts";

// Types
interface CaseDetails {
  id: number;
  title: string;
  description: string;
  caseType: string;
  status: string;
  caseNumber?: string;
  courtName?: string;
  opposingParty?: string;
  filingDeadline?: string;
  nextHearingDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface Evidence {
  id: number;
  title: string;
  evidenceType: string;
  filePath?: string;
  filename?: string;
  description?: string;
  obtainedDate?: string;
  uploadedAt?: string;
}

interface Deadline {
  id: number;
  title: string;
  description?: string;
  deadlineDate: string;
  priority: string;
  status: string;
}

interface LegislationResult {
  title: string;
  content: string;
  url: string;
  section?: string;
  relevance: number;
}

interface CaseResult {
  citation: string;
  court: string;
  date: string;
  summary: string;
  url: string;
  relevance: number;
}

interface LegalResearch {
  legislation: LegislationResult[];
  cases: CaseResult[];
  caseType: string;
  searchTerms: string[];
}

// Evidence type icon mapping
const evidenceTypeIcons: Record<string, React.ReactNode> = {
  document: <FileText className="w-4 h-4" />,
  photo: <Image className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  recording: <Mic className="w-4 h-4" />,
  note: <StickyNote className="w-4 h-4" />,
  witness: <Users className="w-4 h-4" />,
};

// Folder section component
interface FolderSectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeVariant?: "success" | "warning" | "danger" | "neutral";
}

function FolderSection({
  title,
  icon,
  count,
  children,
  defaultOpen = false,
  badge,
  badgeVariant = "neutral",
}: FolderSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 transition-colors text-left"
      >
        {isOpen ? (
          <FolderOpen className="w-5 h-5 text-yellow-400" />
        ) : (
          <Folder className="w-5 h-5 text-yellow-400" />
        )}
        <span className="flex-1 font-medium text-white flex items-center gap-2">
          {icon}
          {title}
          {count !== undefined && (
            <span className="text-white/50 text-sm">({count})</span>
          )}
        </span>
        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-white/50" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white/50" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white/[0.02] border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  );
}

// File item component
interface FileItemProps {
  icon: React.ReactNode;
  name: string;
  meta?: string;
  onClick?: () => void;
  external?: boolean;
  url?: string;
}

function FileItem({ icon, name, meta, onClick, external, url }: FileItemProps) {
  const content = (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${
        onClick || url ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <div className="text-cyan-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">{name}</p>
        {meta && <p className="text-white/50 text-xs">{meta}</p>}
      </div>
      {external && <ExternalLink className="w-4 h-4 text-white/30" />}
    </div>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}

export function CaseFileView() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { sessionId } = useAuth();

  // State
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [legalResearch, setLegalResearch] = useState<LegalResearch | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLegal, setIsLoadingLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load case data
  const loadCaseData = useCallback(async () => {
    if (!caseId || !sessionId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all case data in parallel
      const [caseRes, evidenceRes, deadlinesRes] = await Promise.all([
        apiClient.cases.get(parseInt(caseId, 10)),
        apiClient.evidence.list(parseInt(caseId, 10)),
        apiClient.deadlines.list({ caseId: parseInt(caseId, 10) }),
      ]);

      if (caseRes.success && caseRes.data) {
        setCaseDetails(caseRes.data as CaseDetails);
      }

      if (evidenceRes.success && evidenceRes.data) {
        setEvidence(evidenceRes.data as Evidence[]);
      }

      if (deadlinesRes.success && deadlinesRes.data) {
        const items = (deadlinesRes.data as any).items || deadlinesRes.data;
        setDeadlines(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      logger.error("Failed to load case data:", { error: err as Error });
      setError(err instanceof Error ? err.message : "Failed to load case");
    } finally {
      setIsLoading(false);
    }
  }, [caseId, sessionId]);

  // Load legal research based on case type
  const loadLegalResearch = useCallback(async () => {
    if (!caseDetails?.caseType || !sessionId) {
      return;
    }

    try {
      setIsLoadingLegal(true);

      // Use apiClient instead of raw fetch
      const response = await apiClient.legal.search(
        `${caseDetails.caseType} ${caseDetails.title || ""}`,
      );

      if (response.success && response.data) {
        setLegalResearch({
          legislation: response.data.legislation || [],
          cases: response.data.cases || [],
          caseType: caseDetails.caseType,
          searchTerms: [caseDetails.caseType],
        });
      }
    } catch (err) {
      logger.error("Failed to load legal research:", { error: err as Error });
      // Don't show error - legal research is supplementary
    } finally {
      setIsLoadingLegal(false);
    }
  }, [caseDetails?.caseType, caseDetails?.title, sessionId]);

  // Initial load
  useEffect(() => {
    loadCaseData();
  }, [loadCaseData]);

  // Load legal research when case details are available
  useEffect(() => {
    if (caseDetails?.caseType) {
      loadLegalResearch();
    }
  }, [caseDetails?.caseType, loadLegalResearch]);

  // Group evidence by type
  const evidenceByType = evidence.reduce(
    (acc, item) => {
      const type = item.evidenceType || "document";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    },
    {} as Record<string, Evidence[]>,
  );

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <SkeletonCard lines={2} />
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={3} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !caseDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 p-8 flex items-center justify-center">
        <Card variant="glass" className="max-w-md">
          <div className="text-center p-6">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Error Loading Case File
            </h2>
            <p className="text-white/70 mb-4">{error || "Case not found"}</p>
            <Button onClick={() => navigate("/cases")} variant="secondary">
              <ArrowLeft className="w-4 h-4" />
              Back to Cases
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const overdueDeadlines = deadlines.filter(
    (d) => d.status !== "completed" && new Date(d.deadlineDate) < new Date(),
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/cases/${caseId}`)}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Folder className="w-5 h-5 text-yellow-400" />
                  Case File
                </h1>
                <p className="text-white/70 text-sm">{caseDetails.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  caseDetails.status === "active" ? "success" : "neutral"
                }
              >
                {caseDetails.status}
              </Badge>
              <Badge variant="neutral">{caseDetails.caseType}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadCaseData}
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-6 space-y-4">
        {/* Case Summary */}
        <FolderSection
          title="Case Summary"
          icon={<BookOpen className="w-4 h-4" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-white/50 text-xs uppercase mb-1">
                  Case Title
                </h4>
                <p className="text-white">{caseDetails.title}</p>
              </div>
              <div>
                <h4 className="text-white/50 text-xs uppercase mb-1">
                  Case Type
                </h4>
                <p className="text-white capitalize">{caseDetails.caseType}</p>
              </div>
              {caseDetails.caseNumber && (
                <div>
                  <h4 className="text-white/50 text-xs uppercase mb-1">
                    Case Number
                  </h4>
                  <p className="text-white">{caseDetails.caseNumber}</p>
                </div>
              )}
              {caseDetails.courtName && (
                <div>
                  <h4 className="text-white/50 text-xs uppercase mb-1">
                    Court/Tribunal
                  </h4>
                  <p className="text-white">{caseDetails.courtName}</p>
                </div>
              )}
              {caseDetails.opposingParty && (
                <div>
                  <h4 className="text-white/50 text-xs uppercase mb-1">
                    Opposing Party
                  </h4>
                  <p className="text-white">{caseDetails.opposingParty}</p>
                </div>
              )}
              <div>
                <h4 className="text-white/50 text-xs uppercase mb-1">
                  Created
                </h4>
                <p className="text-white">
                  {formatDate(caseDetails.createdAt)}
                </p>
              </div>
            </div>
            {caseDetails.description && (
              <div>
                <h4 className="text-white/50 text-xs uppercase mb-1">
                  Description
                </h4>
                <p className="text-white/90 whitespace-pre-line">
                  {caseDetails.description}
                </p>
              </div>
            )}
          </div>
        </FolderSection>

        {/* Evidence */}
        <FolderSection
          title="Evidence"
          icon={<FileText className="w-4 h-4" />}
          count={evidence.length}
          defaultOpen={true}
        >
          {evidence.length === 0 ? (
            <p className="text-white/50 text-sm">
              No evidence uploaded yet.{" "}
              <button
                onClick={() => navigate("/documents")}
                className="text-cyan-400 hover:underline"
              >
                Upload evidence
              </button>
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(evidenceByType).map(([type, items]) => (
                <div key={type}>
                  <h4 className="text-white/70 text-sm font-medium mb-2 capitalize flex items-center gap-2">
                    {evidenceTypeIcons[type] || <File className="w-4 h-4" />}
                    {type}s ({items.length})
                  </h4>
                  <div className="grid gap-2">
                    {items.map((item) => (
                      <FileItem
                        key={item.id}
                        icon={
                          evidenceTypeIcons[item.evidenceType] || (
                            <File className="w-4 h-4" />
                          )
                        }
                        name={item.title}
                        meta={
                          item.uploadedAt
                            ? `Uploaded ${formatDate(item.uploadedAt)}`
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FolderSection>

        {/* Timeline / Deadlines */}
        <FolderSection
          title="Timeline & Deadlines"
          icon={<Calendar className="w-4 h-4" />}
          count={deadlines.length}
          badge={
            overdueDeadlines > 0 ? `${overdueDeadlines} overdue` : undefined
          }
          badgeVariant={overdueDeadlines > 0 ? "danger" : "neutral"}
        >
          {deadlines.length === 0 ? (
            <p className="text-white/50 text-sm">
              No deadlines set.{" "}
              <button
                onClick={() => navigate("/timeline")}
                className="text-cyan-400 hover:underline"
              >
                Add deadlines
              </button>
            </p>
          ) : (
            <div className="space-y-2">
              {deadlines
                .sort(
                  (a, b) =>
                    new Date(a.deadlineDate).getTime() -
                    new Date(b.deadlineDate).getTime(),
                )
                .map((deadline) => {
                  const isOverdue =
                    deadline.status !== "completed" &&
                    new Date(deadline.deadlineDate) < new Date();
                  const isCompleted = deadline.status === "completed";

                  return (
                    <FileItem
                      key={deadline.id}
                      icon={
                        isCompleted ? (
                          <Clock className="w-4 h-4 text-green-400" />
                        ) : isOverdue ? (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        )
                      }
                      name={deadline.title}
                      meta={`${formatDate(deadline.deadlineDate)} • ${
                        isCompleted
                          ? "Completed"
                          : isOverdue
                            ? "OVERDUE"
                            : deadline.priority
                      }`}
                      onClick={() => navigate("/timeline")}
                    />
                  );
                })}
            </div>
          )}
        </FolderSection>

        {/* Legal Research */}
        <FolderSection
          title="Legal Research"
          icon={<Scale className="w-4 h-4" />}
          count={
            (legalResearch?.legislation?.length || 0) +
            (legalResearch?.cases?.length || 0)
          }
        >
          {isLoadingLegal ? (
            <div className="flex items-center gap-2 text-white/50">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading relevant legislation and case law...
            </div>
          ) : !legalResearch ||
            (legalResearch.legislation.length === 0 &&
              legalResearch.cases.length === 0) ? (
            <div className="text-white/50 text-sm">
              <p className="mb-2">
                No legal research found for this case type.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadLegalResearch}
                disabled={isLoadingLegal}
              >
                <RefreshCw className="w-4 h-4" />
                Search Legal APIs
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Legislation */}
              {legalResearch.legislation.length > 0 && (
                <div>
                  <h4 className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Relevant Legislation ({legalResearch.legislation.length})
                  </h4>
                  <div className="grid gap-2">
                    {legalResearch.legislation.map((item, idx) => (
                      <FileItem
                        key={idx}
                        icon={<Scale className="w-4 h-4" />}
                        name={item.title}
                        meta={item.section || "Full Act"}
                        url={item.url}
                        external
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Case Law */}
              {legalResearch.cases.length > 0 && (
                <div>
                  <h4 className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2">
                    <Gavel className="w-4 h-4" />
                    Relevant Case Law ({legalResearch.cases.length})
                  </h4>
                  <div className="grid gap-2">
                    {legalResearch.cases.map((item, idx) => (
                      <FileItem
                        key={idx}
                        icon={<Gavel className="w-4 h-4" />}
                        name={item.citation}
                        meta={`${item.court} • ${item.date}`}
                        url={item.url}
                        external
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Source info */}
              <p className="text-white/30 text-xs">
                Data sourced from legislation.gov.uk and Find Case Law API
              </p>
            </div>
          )}
        </FolderSection>

        {/* AI Analysis */}
        <FolderSection
          title="AI Analysis"
          icon={<MessageSquare className="w-4 h-4" />}
        >
          <div className="text-white/50 text-sm">
            <p className="mb-4">
              Chat with the AI assistant about your case to get analysis and
              suggestions stored here.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/chat")}
            >
              <MessageSquare className="w-4 h-4" />
              Open AI Chat
            </Button>
          </div>
        </FolderSection>
      </div>
    </div>
  );
}
