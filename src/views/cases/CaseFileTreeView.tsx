import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  Clock,
  Tag,
  Briefcase,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Camera,
  Mail,
  Mic,
  StickyNote,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { Case } from "../../domains/cases/entities/Case.ts";
import type { Evidence } from "../../domains/evidence/entities/Evidence.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { apiClient } from "../../lib/apiClient.ts";
import { cn } from "../../lib/utils.ts";

// Types for tree data
interface Deadline {
  id: number;
  title: string;
  description?: string;
  deadlineDate: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "upcoming" | "overdue" | "completed";
}

interface CaseTag {
  id: number;
  name: string;
  color: string;
}

interface TreeNodeData {
  id: string;
  type: "case" | "evidence" | "deadline" | "tag" | "category";
  label: string;
  subLabel?: string;
  icon: React.ReactNode;
  color: string;
  children?: TreeNodeData[];
  metadata?: Record<string, unknown>;
  expanded?: boolean;
}

// Evidence type icons
const getEvidenceIcon = (type: string) => {
  switch (type) {
    case "document":
      return <FileText className="w-4 h-4" />;
    case "photo":
      return <Camera className="w-4 h-4" />;
    case "email":
      return <Mail className="w-4 h-4" />;
    case "recording":
      return <Mic className="w-4 h-4" />;
    case "note":
      return <StickyNote className="w-4 h-4" />;
    case "witness":
      return <Users className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

// Priority colors
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "text-red-400 bg-red-500/20 border-red-500/30";
    case "high":
      return "text-orange-400 bg-orange-500/20 border-orange-500/30";
    case "medium":
      return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
    case "low":
      return "text-green-400 bg-green-500/20 border-green-500/30";
    default:
      return "text-gray-400 bg-gray-500/20 border-gray-500/30";
  }
};

// Status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-3 h-3 text-green-400" />;
    case "overdue":
      return <AlertTriangle className="w-3 h-3 text-red-400" />;
    default:
      return <Clock className="w-3 h-3 text-blue-400" />;
  }
};

// Tree Node Component
function TreeNode({
  node,
  level = 0,
  isLast = false,
  parentPath = "",
  onToggle,
  expandedNodes,
}: {
  node: TreeNodeData;
  level?: number;
  isLast?: boolean;
  parentPath?: string;
  onToggle: (nodeId: string) => void;
  expandedNodes: Set<string>;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const nodePath = parentPath ? `${parentPath}-${node.id}` : node.id;

  return (
    <div className="relative">
      {/* Node Content */}
      <div
        className={cn(
          "relative flex items-center gap-3 py-2 px-3 rounded-lg transition-all",
          "hover:bg-white/5 cursor-pointer group",
          level > 0 && "ml-6",
        )}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {/* Connection Lines */}
        {level > 0 && (
          <>
            {/* Horizontal connector */}
            <div
              className="absolute left-0 top-1/2 w-4 h-px bg-gradient-to-r from-white/20 to-transparent"
              style={{ marginLeft: "-1rem" }}
            />
            {/* Vertical connector */}
            {!isLast && (
              <div
                className="absolute left-0 top-1/2 bottom-0 w-px bg-white/10"
                style={{ marginLeft: "-1rem", height: "calc(100% + 0.5rem)" }}
              />
            )}
          </>
        )}

        {/* Expand/Collapse Toggle */}
        {hasChildren ? (
          <button
            className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-white/60" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white/60" />
            )}
          </button>
        ) : (
          <div className="w-6" /> // Spacer
        )}

        {/* Node Icon */}
        <div
          className={cn(
            "flex-shrink-0 p-2 rounded-lg border",
            node.color,
            "transition-transform group-hover:scale-110",
          )}
        >
          {node.icon}
        </div>

        {/* Node Labels */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">
              {node.label}
            </span>
            {node.type === "deadline" && Boolean(node.metadata?.status) && (
              <span className="flex-shrink-0">
                {getStatusIcon(node.metadata?.status as string)}
              </span>
            )}
            {node.type === "deadline" && Boolean(node.metadata?.priority) && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border",
                  getPriorityColor(node.metadata?.priority as string),
                )}
              >
                {String(node.metadata?.priority)}
              </span>
            )}
          </div>
          {node.subLabel && (
            <span className="text-sm text-white/50 truncate block">
              {node.subLabel}
            </span>
          )}
        </div>

        {/* Child Count Badge */}
        {hasChildren && (
          <span className="flex-shrink-0 text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
            {node.children?.length}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {/* Vertical line for children */}
          <div
            className="absolute left-6 top-0 w-px bg-white/10"
            style={{
              height: "calc(100% - 1rem)",
              marginLeft: level > 0 ? "0.5rem" : "0",
            }}
          />
          {node.children?.map((child, index) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isLast={index === (node.children?.length || 0) - 1}
              parentPath={nodePath}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Build tree data from case, evidence, deadlines, and tags
function buildTreeData(
  caseData: Case,
  evidence: Evidence[],
  deadlines: Deadline[],
  tags: CaseTag[],
): TreeNodeData {
  // Evidence category node
  const evidenceNode: TreeNodeData = {
    id: "evidence-category",
    type: "category",
    label: "Evidence",
    subLabel: `${evidence.length} item${evidence.length !== 1 ? "s" : ""}`,
    icon: <FileText className="w-4 h-4" />,
    color: "text-blue-400 bg-blue-500/20 border-blue-500/30",
    children: evidence.map((e) => ({
      id: `evidence-${e.id}`,
      type: "evidence" as const,
      label: e.title,
      subLabel: e.evidenceType,
      icon: getEvidenceIcon(e.evidenceType),
      color: "text-blue-300 bg-blue-500/10 border-blue-500/20",
      metadata: { type: e.evidenceType, obtainedDate: e.obtainedDate },
    })),
    expanded: true,
  };

  // Deadlines category node
  const deadlinesNode: TreeNodeData = {
    id: "deadlines-category",
    type: "category",
    label: "Deadlines & Timeline",
    subLabel: `${deadlines.length} deadline${deadlines.length !== 1 ? "s" : ""}`,
    icon: <Clock className="w-4 h-4" />,
    color: "text-amber-400 bg-amber-500/20 border-amber-500/30",
    children: deadlines.map((d) => ({
      id: `deadline-${d.id}`,
      type: "deadline" as const,
      label: d.title,
      subLabel: new Date(d.deadlineDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      icon: <Calendar className="w-4 h-4" />,
      color: getPriorityColor(d.priority),
      metadata: { priority: d.priority, status: d.status },
    })),
    expanded: true,
  };

  // Tags category node
  const tagsNode: TreeNodeData = {
    id: "tags-category",
    type: "category",
    label: "Tags",
    subLabel: `${tags.length} tag${tags.length !== 1 ? "s" : ""}`,
    icon: <Tag className="w-4 h-4" />,
    color: "text-purple-400 bg-purple-500/20 border-purple-500/30",
    children: tags.map((t) => ({
      id: `tag-${t.id}`,
      type: "tag" as const,
      label: t.name,
      icon: <Tag className="w-4 h-4" />,
      color: `text-white bg-opacity-20 border-opacity-30`,
      metadata: { color: t.color },
    })),
    expanded: true,
  };

  // Root case node
  const caseNode: TreeNodeData = {
    id: `case-${caseData.id}`,
    type: "case",
    label: caseData.title,
    subLabel: `${caseData.caseType} | ${caseData.status}`,
    icon: <Briefcase className="w-5 h-5" />,
    color: "text-primary-400 bg-primary-500/20 border-primary-500/30",
    children: [
      ...(evidence.length > 0 ? [evidenceNode] : []),
      ...(deadlines.length > 0 ? [deadlinesNode] : []),
      ...(tags.length > 0 ? [tagsNode] : []),
    ],
    expanded: true,
  };

  return caseNode;
}

// Main Component
export function CaseFileTreeView() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { sessionId } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tags, setTags] = useState<CaseTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["evidence-category", "deadlines-category", "tags-category"]),
  );

  const loadCaseData = useCallback(async () => {
    if (!caseId || !sessionId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch case details
      const caseResponse = await apiClient.cases.get(parseInt(caseId));
      if (!caseResponse.success || !caseResponse.data) {
        throw new Error("Failed to load case");
      }
      setCaseData(caseResponse.data);

      // Fetch evidence for this case
      const evidenceResponse = await apiClient.evidence.list(parseInt(caseId));
      if (evidenceResponse.success && evidenceResponse.data) {
        setEvidence(evidenceResponse.data);
      }

      // Fetch deadlines for this case
      const deadlinesResponse = await apiClient.deadlines.list({
        caseId: parseInt(caseId),
      });
      if (deadlinesResponse.success && deadlinesResponse.data) {
        // Map the API response to our Deadline type
        const deadlineItems = (deadlinesResponse.data.items || []).map(
          (d: {
            id: number;
            title: string;
            description?: string;
            deadlineDate: string;
            priority: string;
            status: string;
          }) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            deadlineDate: d.deadlineDate,
            priority: d.priority as "low" | "medium" | "high" | "critical",
            status: d.status as "upcoming" | "overdue" | "completed",
          }),
        );
        setDeadlines(deadlineItems);
      }

      // Fetch tags for this case
      const tagsResponse = await apiClient.tags.getTagsForCase(
        parseInt(caseId),
      );
      if (tagsResponse.success && tagsResponse.data) {
        setTags(tagsResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load case data");
    } finally {
      setLoading(false);
    }
  }, [caseId, sessionId]);

  useEffect(() => {
    loadCaseData();
  }, [loadCaseData]);

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (node: TreeNodeData) => {
      allIds.add(node.id);
      node.children?.forEach(collectIds);
    };
    if (caseData) {
      const treeData = buildTreeData(caseData, evidence, deadlines, tags);
      collectIds(treeData);
    }
    setExpandedNodes(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          <p className="text-white/60">Loading case file...</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-semibold text-white">
            Failed to load case
          </h2>
          <p className="text-white/60">{error || "Case not found"}</p>
          <button
            onClick={() => navigate("/cases")}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  const treeData = buildTreeData(caseData, evidence, deadlines, tags);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/cases")}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white/60" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Case File</h1>
                <p className="text-white/60 text-sm">{caseData.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExpandAll}
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Case Summary Card */}
          <div className="mb-8 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary-500/20 border border-primary-500/30">
                <Briefcase className="w-8 h-8 text-primary-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white">
                  {caseData.title}
                </h2>
                {caseData.description && (
                  <p className="text-white/60 mt-1 line-clamp-2">
                    {caseData.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-sm px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                    {caseData.caseType}
                  </span>
                  <span
                    className={cn(
                      "text-sm px-3 py-1 rounded-full border",
                      caseData.status === "active"
                        ? "bg-green-500/20 text-green-300 border-green-500/30"
                        : caseData.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                          : "bg-gray-500/20 text-gray-300 border-gray-500/30",
                    )}
                  >
                    {caseData.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tree Structure */}
          <div className="space-y-2">
            {treeData.children?.map((child, index) => (
              <TreeNode
                key={child.id}
                node={child}
                level={0}
                isLast={index === (treeData.children?.length || 0) - 1}
                onToggle={handleToggle}
                expandedNodes={expandedNodes}
              />
            ))}
          </div>

          {/* Empty State */}
          {(!treeData.children || treeData.children.length === 0) && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white/60">
                No items in this case yet
              </h3>
              <p className="text-white/40 mt-1">
                Add evidence, deadlines, or tags to see them here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
