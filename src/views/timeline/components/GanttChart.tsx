import { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, ZoomIn, ZoomOut, FileImage, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { DeadlineWithDependencies } from '../../../domains/timeline/entities/DeadlineDependency';

interface GanttChartProps {
  deadlines: DeadlineWithDependencies[];
  onDeadlineUpdate: (id: number, newDate: string) => void;
  onDependencyClick?: (sourceId: number, targetId: number) => void;
}

const PIXELS_PER_DAY = 40;
const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 80;
const LABEL_WIDTH = 250;

export function GanttChart({ deadlines, onDeadlineUpdate, onDependencyClick }: GanttChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [draggingDeadlineId, setDraggingDeadlineId] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate date range
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (deadlines.length === 0) {
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return {
        minDate: today,
        maxDate: nextMonth,
        totalDays: 30,
      };
    }

    const dates = deadlines.map((d) => new Date(d.deadlineDate));
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Add padding
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 7);

    const diffTime = Math.abs(max.getTime() - min.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { minDate: min, maxDate: max, totalDays: diffDays };
  }, [deadlines]);

  // Calculate position for a date
  const getPositionForDate = useCallback(
    (date: Date) => {
      const diffTime = date.getTime() - minDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays * PIXELS_PER_DAY * zoom;
    },
    [minDate, zoom]
  );

  // Calculate date from position
  const getDateFromPosition = useCallback(
    (positionX: number) => {
      const days = positionX / (PIXELS_PER_DAY * zoom);
      const newDate = new Date(minDate);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    },
    [minDate, zoom]
  );

  // Handle drag start
  const handleDragStart = useCallback((deadlineId: number) => {
    setDraggingDeadlineId(deadlineId);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (deadlineId: number, newX: number) => {
      const newDate = getDateFromPosition(newX);
      onDeadlineUpdate(deadlineId, newDate.toISOString().split('T')[0]);
      setDraggingDeadlineId(null);
    },
    [getDateFromPosition, onDeadlineUpdate]
  );

  // Export to PNG
  const exportToPNG = useCallback(async () => {
    if (!chartRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#1f2937',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `timeline-gantt-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Export to PDF
  const exportToPDF = useCallback(async () => {
    if (!chartRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#1f2937',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`timeline-gantt-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Generate month headers
  const monthHeaders = useMemo(() => {
    const headers: Array<{ month: string; x: number; width: number }> = [];
    const currentDate = new Date(minDate);
    currentDate.setDate(1);

    while (currentDate <= maxDate) {
      const monthStart = new Date(currentDate);
      const monthEnd = new Date(currentDate);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const x = getPositionForDate(monthStart);
      const endX = getPositionForDate(monthEnd);
      const width = endX - x;

      headers.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        x,
        width,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return headers;
  }, [minDate, maxDate, getPositionForDate]);

  const priorityColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5 text-white" />
          </button>
          <span className="text-sm text-white/70">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToPNG}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <FileImage className="w-4 h-4" />
            <span className="text-sm text-white">Export PNG</span>
          </button>
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm text-white">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-auto bg-gray-900">
        <div ref={chartRef} className="min-w-max p-4">
          {/* Header Row */}
          <div className="flex sticky top-0 z-10 bg-gray-900">
            <div className="w-[250px] flex-shrink-0 pr-4">
              <div className="h-[80px] flex items-center font-semibold text-white border-b border-white/10">
                Deadline
              </div>
            </div>
            <div className="relative" style={{ width: totalDays * PIXELS_PER_DAY * zoom }}>
              {/* Month Headers */}
              <div className="flex h-10 border-b border-white/10">
                {monthHeaders.map((header, i) => (
                  <div
                    key={i}
                    className="border-r border-white/10 flex items-center justify-center text-sm font-medium text-white/70"
                    style={{ width: header.width, marginLeft: i === 0 ? header.x : 0 }}
                  >
                    {header.month}
                  </div>
                ))}
              </div>

              {/* Day Grid */}
              <div className="flex h-10">
                {Array.from({ length: totalDays }).map((_, i) => {
                  const date = new Date(minDate);
                  date.setDate(date.getDate() + i);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div
                      key={i}
                      className={`border-r border-white/5 flex items-center justify-center text-xs ${
                        isWeekend ? 'bg-white/5 text-white/50' : 'text-white/70'
                      }`}
                      style={{ width: PIXELS_PER_DAY * zoom }}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Deadline Rows */}
          <div className="relative">
            {deadlines.map((deadline, index) => {
              const x = getPositionForDate(new Date(deadline.deadlineDate));
              const y = index * ROW_HEIGHT;

              return (
                <div key={deadline.id} className="flex border-b border-white/5">
                  {/* Label Column */}
                  <div className="w-[250px] flex-shrink-0 pr-4">
                    <div className="h-[60px] flex flex-col justify-center">
                      <div className="font-medium text-white text-sm truncate">{deadline.title}</div>
                      <div className="text-xs text-white/50 truncate">{deadline.caseTitle}</div>
                    </div>
                  </div>

                  {/* Chart Column */}
                  <div className="relative" style={{ width: totalDays * PIXELS_PER_DAY * zoom, height: ROW_HEIGHT }}>
                    {/* Grid Background */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: totalDays }).map((_, i) => {
                        const date = new Date(minDate);
                        date.setDate(date.getDate() + i);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                          <div
                            key={i}
                            className={`border-r border-white/5 ${isWeekend ? 'bg-white/5' : ''}`}
                            style={{ width: PIXELS_PER_DAY * zoom }}
                          />
                        );
                      })}
                    </div>

                    {/* Deadline Bar */}
                    <motion.div
                      drag="x"
                      dragMomentum={false}
                      dragElastic={0}
                      onDragStart={() => handleDragStart(deadline.id)}
                      onDragEnd={(_, info) => handleDragEnd(deadline.id, x + info.offset.x)}
                      className={`absolute top-1/2 -translate-y-1/2 h-8 rounded cursor-move ${
                        priorityColors[deadline.priority]
                      } opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center`}
                      style={{
                        left: x,
                        width: Math.max(PIXELS_PER_DAY * zoom, 80),
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileDrag={{ scale: 1.1, zIndex: 10 }}
                    >
                      <span className="text-xs font-medium text-white px-2 truncate">{deadline.title}</span>
                    </motion.div>

                    {/* Today Indicator */}
                    {(() => {
                      const todayX = getPositionForDate(new Date());
                      if (todayX >= 0 && todayX <= totalDays * PIXELS_PER_DAY * zoom) {
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20"
                            style={{ left: todayX }}
                          >
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-blue-500 rounded text-xs text-white whitespace-nowrap">
                              Today
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              );
            })}

            {/* Dependency Arrows (SVG Overlay) */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: LABEL_WIDTH + totalDays * PIXELS_PER_DAY * zoom, height: deadlines.length * ROW_HEIGHT }}
            >
              {deadlines.flatMap((deadline, index) =>
                deadline.dependencies.map((dep) => {
                  const targetIndex = deadlines.findIndex((d) => d.id === dep.targetDeadlineId);
                  if (targetIndex === -1) return null;

                  const sourceX = LABEL_WIDTH + getPositionForDate(new Date(deadline.deadlineDate));
                  const sourceY = index * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const targetX = LABEL_WIDTH + getPositionForDate(new Date(deadlines[targetIndex].deadlineDate));
                  const targetY = targetIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

                  return (
                    <g key={`${deadline.id}-${dep.id}`}>
                      <line
                        x1={sourceX}
                        y1={sourceY}
                        x2={targetX}
                        y2={targetY}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                        className="hover:stroke-primary-400 cursor-pointer"
                        onClick={() => onDependencyClick?.(deadline.id, dep.targetDeadlineId)}
                      />
                    </g>
                  );
                })
              )}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
                </marker>
              </defs>
            </svg>
          </div>

          {deadlines.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <p className="text-white/50">No deadlines to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
