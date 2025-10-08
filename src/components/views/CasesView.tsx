import { useState, useMemo } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { useCases } from '../../hooks/useCases';
import { useEvidence } from '../../hooks/useEvidence';
import { SkeletonTree } from '../ui/Skeleton';
import type { Case } from '../../models/Case';
import type { Evidence } from '../../models/Evidence';

interface TimelineEvent {
  date: string;
  label: string;
  status: 'completed' | 'current' | 'future';
}

interface TreeNode {
  id: string;
  type: 'case' | 'category' | 'item';
  label: string;
  date?: string;
  strength?: number; // 1-5 rating for evidence/argument strength
  faultBreach?: string; // Legal violation/issue reference
  children?: TreeNode[];
}

interface CaseData {
  id: number;
  title: string;
  status: string;
  timeline: TimelineEvent[];
  tree: TreeNode;
}

/**
 * Convert backend Case data to UI CaseData format with tree structure
 * Accepts evidence array to populate real evidence nodes
 */
function transformCaseToTreeData(caseItem: Case, caseEvidence: Evidence[]): CaseData {
  const createdDate = caseItem.createdAt.split('T')[0];
  const updatedDate = caseItem.updatedAt.split('T')[0];

  const timeline: TimelineEvent[] = [
    { date: createdDate, label: 'Case Created', status: 'completed' },
    { date: updatedDate, label: 'Last Updated', status: caseItem.status === 'active' ? 'current' : 'completed' },
  ];

  if (caseItem.status === 'closed') {
    timeline.push({ date: updatedDate, label: 'Case Closed', status: 'completed' });
  } else {
    timeline.push({ date: '(TBD)', label: 'Expected Resolution', status: 'future' });
  }

  // Group evidence by type
  const documents = caseEvidence.filter(e => e.evidenceType === 'document');
  const photos = caseEvidence.filter(e => e.evidenceType === 'photo');
  const emails = caseEvidence.filter(e => e.evidenceType === 'email');
  const recordings = caseEvidence.filter(e => e.evidenceType === 'recording');
  const notes = caseEvidence.filter(e => e.evidenceType === 'note');

  // Build evidence nodes
  const evidenceChildren: TreeNode[] = [];

  if (documents.length > 0) {
    evidenceChildren.push({
      id: `docs-category-${caseItem.id}`,
      type: 'category',
      label: `Documents (${documents.length})`,
      children: documents.map(doc => ({
        id: `evidence-${doc.id}`,
        type: 'item',
        label: doc.title,
        date: doc.obtainedDate || doc.createdAt.split('T')[0],
        strength: 3, // Default strength - could be enhanced later
      })),
    });
  }

  if (photos.length > 0) {
    evidenceChildren.push({
      id: `photos-category-${caseItem.id}`,
      type: 'category',
      label: `Photos (${photos.length})`,
      children: photos.map(photo => ({
        id: `evidence-${photo.id}`,
        type: 'item',
        label: photo.title,
        date: photo.obtainedDate || photo.createdAt.split('T')[0],
        strength: 3,
      })),
    });
  }

  if (emails.length > 0) {
    evidenceChildren.push({
      id: `emails-category-${caseItem.id}`,
      type: 'category',
      label: `Emails (${emails.length})`,
      children: emails.map(email => ({
        id: `evidence-${email.id}`,
        type: 'item',
        label: email.title,
        date: email.obtainedDate || email.createdAt.split('T')[0],
        strength: 3,
      })),
    });
  }

  if (recordings.length > 0) {
    evidenceChildren.push({
      id: `recordings-category-${caseItem.id}`,
      type: 'category',
      label: `Recordings (${recordings.length})`,
      children: recordings.map(rec => ({
        id: `evidence-${rec.id}`,
        type: 'item',
        label: rec.title,
        date: rec.obtainedDate || rec.createdAt.split('T')[0],
        strength: 3,
      })),
    });
  }

  if (notes.length > 0) {
    evidenceChildren.push({
      id: `notes-category-${caseItem.id}`,
      type: 'category',
      label: `Notes (${notes.length})`,
      children: notes.map(note => ({
        id: `evidence-${note.id}`,
        type: 'item',
        label: note.title,
        date: note.obtainedDate || note.createdAt.split('T')[0],
        strength: 2, // Notes typically have lower evidentiary weight
      })),
    });
  }

  // If no evidence at all, show placeholder
  if (evidenceChildren.length === 0) {
    evidenceChildren.push({
      id: `evidence-placeholder-${caseItem.id}`,
      type: 'item',
      label: 'No evidence yet',
      date: createdDate,
    });
  }

  const tree: TreeNode = {
    id: `case-${caseItem.id}`,
    type: 'case',
    label: caseItem.title,
    children: [
      {
        id: `evidence-${caseItem.id}`,
        type: 'category',
        label: `Evidence (${caseEvidence.length} items)`,
        children: evidenceChildren,
      },
      {
        id: `people-${caseItem.id}`,
        type: 'category',
        label: 'People',
        children: [
          {
            id: `person-placeholder-${caseItem.id}`,
            type: 'item',
            label: 'No people yet',
          },
        ],
      },
      {
        id: `events-${caseItem.id}`,
        type: 'category',
        label: 'Events',
        children: [
          {
            id: `event-created-${caseItem.id}`,
            type: 'item',
            label: 'Case Created',
            date: createdDate,
          },
          {
            id: `event-updated-${caseItem.id}`,
            type: 'item',
            label: 'Last Updated',
            date: updatedDate,
          },
        ],
      },
    ],
  };

  return {
    id: caseItem.id,
    title: caseItem.title,
    status: caseItem.status,
    timeline,
    tree,
  };
}

interface CasesViewProps {
  onCaseSelect?: (caseId: number) => void;
}

export function CasesView({ onCaseSelect }: CasesViewProps): JSX.Element {
  const { cases, loading: casesLoading, error: casesError } = useCases();
  const { evidence, loading: evidenceLoading, error: evidenceError } = useEvidence();
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const transformedCases = useMemo(() => {
    if (!cases || cases.length === 0) {
      return [];
    }
    return cases.map(caseItem => {
      // Filter evidence for this specific case
      const caseEvidence = evidence.filter(ev => ev.caseId === caseItem.id);
      return transformCaseToTreeData(caseItem, caseEvidence);
    });
  }, [cases, evidence]);

  // Combine loading states
  const loading = casesLoading || evidenceLoading;

  // Combine error states
  const error = casesError || evidenceError;

  const selectedCase = useMemo(() => {
    if (transformedCases.length === 0) {
      return null;
    }
    if (selectedCaseId === null) {
      return transformedCases[0];
    }
    return transformedCases.find(c => c.id === selectedCaseId) || transformedCases[0];
  }, [transformedCases, selectedCaseId]);

  // Calculate width needed for each subtree
  const calculateSubtreeWidth = (node: TreeNode): number => {
    // Box widths: case=180, category=160, item=150
    const nodeWidth = node.type === 'case' ? 180 : node.type === 'category' ? 160 : 150;

    if (!node.children || node.children.length === 0) {
      return nodeWidth;
    }

    const childWidths = node.children.map(calculateSubtreeWidth);
    const totalChildWidth = childWidths.reduce((sum, width) => sum + width, 0);
    const gaps = (node.children.length - 1) * 20; // Gap between children (reduced)

    return Math.max(totalChildWidth + gaps, nodeWidth);
  };

  const renderTreeNode = (node: TreeNode, x: number, y: number, parentX?: number, parentY?: number): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    // Box dimensions based on type (reduced sizes)
    const boxWidth = node.type === 'case' ? 180 : node.type === 'category' ? 160 : 150;
    const boxHeight = node.type === 'case' ? 90 : node.type === 'category' ? 60 : 100;
    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight / 2;

    // Draw branch from parent to this node
    if (parentX !== undefined && parentY !== undefined) {
      // Parent bottom center, child top center
      const parentBoxHeight = parentY === 100 ? 90 : 60; // Case box=90, category=60
      const startY = parentY + parentBoxHeight / 2; // Bottom of parent box
      const endY = y - boxHeight / 2; // Top of current box
      const midY = startY + (endY - startY) * 0.4;
      const path = `M ${parentX} ${startY} Q ${parentX} ${midY} ${x} ${endY}`;

      elements.push(
        <path
          key={`branch-${node.id}`}
          d={path}
          stroke={node.type === 'category' ? '#A0522D' : '#D2691E'}
          strokeWidth={node.type === 'category' ? 5 : 2}
          fill="none"
          strokeLinecap="round"
          className="transition-all duration-300"
          style={{
            filter: hoveredNodeId === node.id ? 'brightness(1.3)' : 'none',
          }}
        />,
      );
    }

    // Box colors based on type
    const boxColor = node.type === 'case' ? '#8B4513' :
      node.type === 'category' ? '#A0522D' :
        '#1e40af'; // Dark blue for items
    const borderColor = node.type === 'case' ? '#654321' :
      node.type === 'category' ? '#8B4513' :
        '#3b82f6'; // Blue border for items

    // Render strength stars (if item)
    const renderStars = (strength: number): string => {
      return '★'.repeat(strength) + '☆'.repeat(5 - strength);
    };

    // Draw box
    elements.push(
      <g key={`node-${node.id}`}>
        {/* Box background */}
        <rect
          x={boxX}
          y={boxY}
          width={boxWidth}
          height={boxHeight}
          fill={boxColor}
          stroke={borderColor}
          strokeWidth={3}
          rx={8}
          className="transition-all duration-300 cursor-pointer"
          style={{
            filter: hoveredNodeId === node.id ?
              'brightness(1.3) drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))' :
              'drop-shadow(0 4px 6px rgba(0,0,0,0.4))',
          }}
          onMouseEnter={() => setHoveredNodeId(node.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
          onClick={() => {
            // If this is a case node, navigate to detail
            if (node.type === 'case' && node.id.startsWith('case-')) {
              const caseId = parseInt(node.id.replace('case-', ''));
              if (onCaseSelect && !isNaN(caseId)) {
                void onCaseSelect(caseId);
              }
            }
          }}
        />

        {/* Title */}
        <text
          x={x}
          y={y - boxHeight / 2 + 20}
          textAnchor="middle"
          className="font-bold fill-white pointer-events-none"
          style={{ fontSize: node.type === 'case' ? '14px' : node.type === 'category' ? '12px' : '11px' }}
        >
          {node.label}
        </text>

        {/* Strength indicator (only for items) */}
        {node.strength && node.type === 'item' && (
          <text
            x={x}
            y={y + 5}
            textAnchor="middle"
            className="fill-yellow-400 pointer-events-none"
            style={{ fontSize: '12px' }}
          >
            {renderStars(node.strength)}
          </text>
        )}

        {/* Fault/Breach reference (only for items) */}
        {node.faultBreach && node.type === 'item' && (
          <text
            x={x}
            y={y + boxHeight / 2 - 20}
            textAnchor="middle"
            className="fill-gray-300 pointer-events-none"
            style={{ fontSize: '9px' }}
          >
            {node.faultBreach.length > 25 ? node.faultBreach.substring(0, 25) + '...' : node.faultBreach}
          </text>
        )}

        {/* Date (if present) */}
        {node.date && (
          <text
            x={x}
            y={y + boxHeight / 2 - 5}
            textAnchor="middle"
            className="fill-blue-300 pointer-events-none"
            style={{ fontSize: '8px' }}
          >
            {node.date}
          </text>
        )}
      </g>,
    );

    // Recursively draw children with proper spacing
    if (node.children && node.children.length > 0) {
      const childWidths = node.children.map(calculateSubtreeWidth);
      const totalWidth = childWidths.reduce((sum, width) => sum + width, 0);
      const gaps = (node.children.length - 1) * 20;
      const totalSpan = totalWidth + gaps;

      let currentX = x - totalSpan / 2;

      node.children.forEach((child, index) => {
        const childWidth = childWidths[index];
        const childX = currentX + childWidth / 2;
        const childY = y + 160; // Vertical spacing between levels (reduced)

        elements.push(...renderTreeNode(child, childX, childY, x, y));

        currentX += childWidth + 20; // Move to next child position (reduced gap)
      });
    }

    return elements;
  };

  // Show loading state with skeleton tree
  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Case Selector Skeleton */}
        <div className="h-20 bg-slate-900/50 border-b border-blue-800/30 flex items-center px-6">
          <div className="w-64 h-10 bg-slate-800/50 rounded-lg animate-pulse" />
        </div>

        {/* Timeline Skeleton */}
        <div className="h-28 bg-gradient-to-b from-slate-900/30 to-transparent border-b border-blue-800/20 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="relative h-full flex items-center">
              <div className="absolute left-0 right-0 h-1 bg-slate-700/50 rounded-full" style={{ top: '40px' }} />
              <div className="relative w-full flex justify-between">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex flex-col items-center" style={{ flex: 1 }}>
                    <div className="w-4 h-4 rounded-full bg-slate-600/50 animate-pulse" />
                    <div className="mt-3 space-y-1">
                      <div className="h-3 w-20 bg-slate-700/50 rounded animate-pulse" />
                      <div className="h-2 w-16 bg-slate-700/30 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tree Skeleton */}
        <div
          className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <SkeletonTree />
          <span className="sr-only">Loading case tree...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
        <div className="max-w-md text-center">
          <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Error Loading Cases</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show empty state when no cases
  if (!selectedCase) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
        <div className="max-w-md text-center">
          <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Cases Yet</h2>
          <p className="text-blue-200 mb-6">
            Create your first case to start organizing evidence, documents, and legal information.
          </p>
          <p className="text-gray-400 text-sm">
            Use the chat to create a case, or wait for the case management feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Case Selector */}
      <div className="h-20 bg-slate-900/50 border-b border-blue-800/30 flex items-center px-6">
        <div className="relative">
          <select
            value={selectedCaseId || ''}
            onChange={(e) => setSelectedCaseId(Number(e.target.value))}
            className="appearance-none bg-slate-800/50 border border-blue-700/30 rounded-lg px-4 py-2 pr-10 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
          >
            {transformedCases.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300 pointer-events-none" />
        </div>
      </div>

      {/* Timeline Tracker */}
      <div className="h-28 bg-gradient-to-b from-slate-900/30 to-transparent border-b border-blue-800/20 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative h-full flex items-center">
            {/* Timeline line */}
            <div className="absolute left-0 right-0 h-1 bg-slate-700/50 rounded-full" style={{ top: '40px' }} />

            {/* Timeline events */}
            <div className="relative w-full flex justify-between">
              {selectedCase?.timeline.map((event, index) => {
                const isCompleted = event.status === 'completed';
                const isCurrent = event.status === 'current';

                return (
                  <div key={index} className="flex flex-col items-center group relative" style={{ flex: 1 }}>
                    {/* Marker */}
                    <div className="relative z-10">
                      <div
                        className={`w-4 h-4 rounded-full border-4 transition-all duration-300 ${
                          isCompleted ? 'bg-gray-400 border-gray-300' :
                            isCurrent ? 'bg-blue-500 border-blue-400 animate-pulse' :
                              'bg-slate-600 border-slate-500'
                        }`}
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="mt-3 text-center">
                      <div className={`text-xs font-medium ${
                        isCompleted ? 'text-gray-400' :
                          isCurrent ? 'text-blue-300' :
                            'text-slate-400'
                      }`}>
                        {event.label}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{event.date}</div>
                    </div>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block">
                      <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap">
                        {event.label}
                        <div className="text-blue-300 mt-1">{event.date}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
        <svg
          viewBox="0 0 2000 1200"
          className="w-full h-full transition-opacity duration-300"
          style={{ minHeight: '800px' }}
        >
          {renderTreeNode(selectedCase.tree, 1000, 100)}
        </svg>
      </div>
    </div>
  );
}
