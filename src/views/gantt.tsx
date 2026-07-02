'use client';

import { useAppStore, getRootTasks, getSubtasks, getTaskBarColor } from '@/lib/store';
import type { Task, GanttScale, DependencyType } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks,
  addMonths, format, parseISO, differenceInCalendarDays, isWithinInterval,
  subWeeks, subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus, Link2, X
} from 'lucide-react';
import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddTaskDialog } from '@/components/app/add-task-dialog';

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 56;
const LEFT_PANEL_WIDTH = 320;

const PRIORITY_COLORS: Record<string, string> = {
  baja: 'border-l-slate-400',
  media: 'border-l-sky-500',
  alta: 'border-l-orange-500',
  critica: 'border-l-red-500',
};

const STATUS_COLORS: Record<string, string> = {
  no_iniciada: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300',
  en_curso: 'bg-emerald-500 text-white border-emerald-600',
  pausada: 'bg-amber-400 text-white border-amber-500',
  finalizada: 'bg-slate-400 text-white border-slate-500',
};

const DEP_COLORS: Record<DependencyType, string> = {
  FS: '#64748b',
  SS: '#0ea5e9',
  FF: '#a855f7',
  SF: '#f97316',
};

export function GanttView() {
  const {
    obras, tasks, dependencies, selectedObraId, ganttScale, setGanttScale,
    openTaskModal, moveTask, resizeTask, addDependency, deleteDependency,
  } = useAppStore();

  const obra = obras.find(o => o.id === selectedObraId);
  const [refDate, setRefDate] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [hoveredDepId, setHoveredDepId] = useState<string | null>(null);

  // Estado de drag con preview (fantasma)
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-left' | 'resize-right' | 'create-dep';
    taskId: string;
    startX: number;
    originalStart: string;
    originalEnd: string;
    depFromTaskId?: string;
    currentDeltaDays: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Calcular rango de fechas
  const { startDate: rangeStart, endDate: rangeEnd, totalDays, columns } = useMemo(() => {
    let s: Date, e: Date;
    if (ganttScale === 'semana') {
      s = startOfWeek(refDate, { weekStartsOn: 1 });
      e = endOfWeek(addWeeks(refDate, 11), { weekStartsOn: 1 });
    } else if (ganttScale === 'quincena') {
      s = startOfWeek(refDate, { weekStartsOn: 1 });
      e = endOfWeek(addWeeks(refDate, 23), { weekStartsOn: 1 });
    } else {
      s = startOfMonth(refDate);
      e = endOfMonth(addMonths(refDate, 5));
    }
    const total = differenceInCalendarDays(e, s) + 1;
    let cols: { label: string; sublabel: string; days: number; start: Date }[] = [];

    if (ganttScale === 'semana') {
      let cur = new Date(s);
      while (cur <= e) {
        const weekEnd = endOfWeek(cur, { weekStartsOn: 1 });
        const wStart = startOfWeek(cur, { weekStartsOn: 1 });
        cols.push({
          label: `Sem ${format(wStart, "I")}`,
          sublabel: format(wStart, "dd MMM", { locale: es }),
          days: differenceInCalendarDays(weekEnd, wStart) + 1,
          start: wStart,
        });
        cur = addDays(weekEnd, 1);
      }
    } else if (ganttScale === 'quincena') {
      let cur = new Date(s);
      while (cur <= e) {
        const mStart = startOfMonth(cur);
        const mEnd = endOfMonth(cur);
        cols.push({
          label: format(mStart, "MMM yyyy", { locale: es }),
          sublabel: '1-15',
          days: 15,
          start: mStart,
        });
        cols.push({
          label: format(mStart, "MMM yyyy", { locale: es }),
          sublabel: '16-30',
          days: differenceInCalendarDays(mEnd, mStart) - 14,
          start: addDays(mStart, 15),
        });
        cur = addMonths(mStart, 1);
      }
    } else {
      let cur = new Date(s);
      while (cur <= e) {
        const mStart = startOfMonth(cur);
        const mEnd = endOfMonth(cur);
        cols.push({
          label: format(mStart, "MMM yyyy", { locale: es }),
          sublabel: '',
          days: differenceInCalendarDays(mEnd, mStart) + 1,
          start: mStart,
        });
        cur = addMonths(mStart, 1);
      }
    }
    return { startDate: s, endDate: e, totalDays: total, columns: cols };
  }, [refDate, ganttScale]);

  const dayWidth = useMemo(() => {
    const base = ganttScale === 'semana' ? 28 : ganttScale === 'quincena' ? 14 : 7;
    return base * zoom;
  }, [ganttScale, zoom]);

  const timelineWidth = totalDays * dayWidth;

  // Construir filas del gantt
  const rows = useMemo(() => {
    if (!obra) return [];
    const result: { task: Task; level: number; index: number }[] = [];
    const rootTasks = getRootTasks(tasks, obra.id);
    let idx = 0;
    const walk = (task: Task, level: number) => {
      result.push({ task, level, index: idx++ });
      getSubtasks(tasks, task.id).forEach(st => walk(st, level + 1));
    };
    rootTasks.forEach(t => walk(t, 0));
    return result;
  }, [tasks, obra]);

  const dateToX = useCallback((date: Date) => {
    return differenceInCalendarDays(date, rangeStart) * dayWidth;
  }, [rangeStart, dayWidth]);

  const xToDate = useCallback((x: number) => {
    const days = Math.round(x / dayWidth);
    return addDays(rangeStart, days);
  }, [rangeStart, dayWidth]);

  // Mouse move global durante drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;
    const deltaDays = Math.round((e.clientX - dragState.startX) / dayWidth);
    if (deltaDays !== dragState.currentDeltaDays) {
      setDragState(s => s ? { ...s, currentDeltaDays: deltaDays } : s);
    }
  }, [dragState, dayWidth]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragState) return;
    const deltaDays = Math.round((e.clientX - dragState.startX) / dayWidth);

    if (dragState.type === 'move') {
      const newStart = addDays(parseISO(dragState.originalStart), deltaDays);
      const dur = differenceInCalendarDays(parseISO(dragState.originalEnd), parseISO(dragState.originalStart));
      moveTask(dragState.taskId, format(newStart, 'yyyy-MM-dd'), dur);
    } else if (dragState.type === 'resize-left') {
      const newStart = addDays(parseISO(dragState.originalStart), deltaDays);
      const originalEnd = parseISO(dragState.originalEnd);
      if (differenceInCalendarDays(originalEnd, newStart) >= 1) {
        resizeTask(dragState.taskId, format(newStart, 'yyyy-MM-dd'), format(originalEnd, 'yyyy-MM-dd'));
      }
    } else if (dragState.type === 'resize-right') {
      const newEnd = addDays(parseISO(dragState.originalEnd), deltaDays);
      const originalStart = parseISO(dragState.originalStart);
      if (differenceInCalendarDays(newEnd, originalStart) >= 1) {
        resizeTask(dragState.taskId, format(originalStart, 'yyyy-MM-dd'), format(newEnd, 'yyyy-MM-dd'));
      }
    } else if (dragState.type === 'create-dep' && dragState.depFromTaskId) {
      // Detectar sobre qué tarea se soltó
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollL = containerRef.current.scrollLeft;
        const x = e.clientX - rect.left - LEFT_PANEL_WIDTH + scrollL;
        const y = e.clientY - rect.top - 56 /* header */ + containerRef.current.scrollTop;
        const targetIdx = Math.floor(y / ROW_HEIGHT);
        const targetRow = rows[targetIdx];
        if (targetRow && targetRow.task.id !== dragState.depFromTaskId) {
          // Crear dependencia FS por defecto
          addDependency({
            fromTaskId: dragState.depFromTaskId,
            toTaskId: targetRow.task.id,
            type: 'FS',
            lagDays: 0,
          });
        }
      }
    }
    setDragState(null);
  }, [dragState, moveTask, resizeTask, addDependency, rows]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  if (!obra) return null;

  const navigate = (direction: 'prev' | 'next') => {
    if (ganttScale === 'semana') {
      setRefDate(d => direction === 'prev' ? subWeeks(d, 4) : addWeeks(d, 4));
    } else if (ganttScale === 'quincena') {
      setRefDate(d => direction === 'prev' ? subMonths(d, 2) : addMonths(d, 2));
    } else {
      setRefDate(d => direction === 'prev' ? subMonths(d, 3) : addMonths(d, 3));
    }
  };

  const goToday = () => setRefDate(new Date());

  // Posición del fantasma durante drag
  const getGhostStyle = (task: Task) => {
    if (!dragState || dragState.taskId !== task.id) return null;
    const delta = dragState.currentDeltaDays;
    if (dragState.type === 'move') {
      return {
        left: dateToX(parseISO(task.startDate)) + delta * dayWidth,
        width: (differenceInCalendarDays(parseISO(task.endDate), parseISO(task.startDate)) + 1) * dayWidth,
      };
    } else if (dragState.type === 'resize-left') {
      const newStartX = dateToX(parseISO(task.startDate)) + delta * dayWidth;
      const endX = dateToX(parseISO(task.endDate)) + dayWidth;
      return { left: newStartX, width: Math.max(dayWidth, endX - newStartX) };
    } else if (dragState.type === 'resize-right') {
      const startX = dateToX(parseISO(task.startDate));
      const newEndX = dateToX(parseISO(task.endDate)) + dayWidth + delta * dayWidth;
      return { left: startX, width: Math.max(dayWidth, newEndX - startX) };
    }
    return null;
  };

  // Posición de la flecha temporal durante create-dep
  const depPreview = (() => {
    if (!dragState || dragState.type !== 'create-dep' || !dragState.depFromTaskId) return null;
    const fromRow = rows.find(r => r.task.id === dragState.depFromTaskId);
    if (!fromRow) return null;
    const fromX = dateToX(parseISO(fromRow.task.endDate)) + dayWidth;
    const fromY = fromRow.index * ROW_HEIGHT + ROW_HEIGHT / 2;
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return { fromX, fromY, mouseX: dragState.currentDeltaDays, rect };
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-5 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => navigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {format(rangeStart, "dd MMM yyyy", { locale: es })} - {format(rangeEnd, "dd MMM yyyy", { locale: es })}
          </span>
        </div>

        <div className="h-5 w-px bg-border" />

        <ToggleGroup type="single" value={ganttScale} onValueChange={(v) => v && setGanttScale(v as GanttScale)} size="sm" className="rounded-md border">
          <ToggleGroupItem value="semana" className="text-xs h-7 px-3">Semana</ToggleGroupItem>
          <ToggleGroupItem value="quincena" className="text-xs h-7 px-3">Quincena</ToggleGroupItem>
          <ToggleGroupItem value="mes" className="text-xs h-7 px-3">Mes</ToggleGroupItem>
        </ToggleGroup>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <Button size="sm" className="h-8 ml-auto" onClick={() => setAddTaskOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Crear tarea
        </Button>
      </div>

      {/* Gantt */}
      <div className="flex-1 overflow-auto bg-card" ref={containerRef}>
        <div style={{ width: LEFT_PANEL_WIDTH + timelineWidth, minWidth: '100%' }}>
          {/* Header nivel 1 */}
          <div className="sticky top-0 z-20 flex bg-card border-b border-border">
            <div className="sticky left-0 z-30 bg-card border-r border-border" style={{ width: LEFT_PANEL_WIDTH, height: HEADER_HEIGHT }}>
              <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">Tareas</div>
              <div className="px-3 text-[10px] text-muted-foreground/70">{rows.length} tareas · {obra.name}</div>
            </div>
            <div className="flex" style={{ width: timelineWidth }}>
              <div className="flex border-b border-border/50" style={{ height: HEADER_HEIGHT / 2, width: '100%' }}>
                {columns.map((col, i) => {
                  const showLabel = i === 0 || columns[i - 1].label !== col.label;
                  return (
                    <div
                      key={i}
                      className="text-center text-[11px] font-medium text-foreground border-r border-border/50 flex items-center justify-center"
                      style={{ width: col.days * dayWidth }}
                    >
                      {showLabel && col.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Header nivel 2 */}
          <div className="sticky top-[56px] z-20 flex bg-card border-b border-border">
            <div className="sticky left-0 z-30 bg-card border-r border-border" style={{ width: LEFT_PANEL_WIDTH, height: HEADER_HEIGHT / 2 }} />
            <div className="flex" style={{ width: timelineWidth, height: HEADER_HEIGHT / 2 }}>
              {columns.map((col, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] text-muted-foreground border-r border-border/50 flex items-center justify-center"
                  style={{ width: col.days * dayWidth }}
                >
                  {col.sublabel}
                </div>
              ))}
            </div>
          </div>

          {/* Filas de tareas */}
          <div className="relative">
            {rows.map(({ task, level, index }) => {
              const startX = dateToX(parseISO(task.startDate));
              const endX = dateToX(parseISO(task.endDate)) + dayWidth;
              const barWidth = Math.max(dayWidth, endX - startX);
              const progressWidth = (barWidth * task.progress) / 100;
              const isRoot = task.parentId === null;
              const barColor = getTaskBarColor(task, tasks, obra.color);
              const ghostStyle = getGhostStyle(task);

              return (
                <div key={task.id} className="flex border-b border-border/40 hover:bg-muted/30 pointer-events-none" style={{ height: ROW_HEIGHT }}>
                  {/* Panel izquierdo */}
                  <div
                    className="sticky left-0 z-10 bg-card border-r border-border flex items-center px-2 cursor-pointer hover:bg-muted/50 pointer-events-auto"
                    style={{ width: LEFT_PANEL_WIDTH, paddingLeft: 12 + level * 20 }}
                    onClick={() => openTaskModal(task.id)}
                  >
                    {level > 0 && <span className="text-muted-foreground/40 mr-1.5 text-xs">└</span>}
                    <span
                      className="w-1.5 h-5 rounded-full mr-2 shrink-0"
                      style={{ background: barColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-xs truncate', isRoot ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {task.name}
                      </div>
                    </div>
                    <Badge className={cn('text-[9px] ml-1 px-1 py-0', STATUS_COLORS[task.status])}>
                      {task.progress}%
                    </Badge>
                  </div>

                  {/* Timeline */}
                  <div className="relative pointer-events-none" style={{ width: timelineWidth, height: ROW_HEIGHT }}>
                    {/* Grid de fondo */}
                    {columns.map((col, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-border/30 pointer-events-none"
                        style={{ left: dateToX(col.start), width: col.days * dayWidth }}
                      />
                    ))}

                    {/* Línea de hoy */}
                    {isWithinInterval(new Date(), { start: rangeStart, end: rangeEnd }) && (
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-red-400 pointer-events-none z-10"
                        style={{ left: dateToX(new Date()) }}
                      >
                        <div className="absolute -top-0 -left-1 text-[9px] text-red-500 font-semibold bg-card px-0.5">Hoy</div>
                      </div>
                    )}

                    {/* Fantasma (preview) durante drag */}
                    {ghostStyle && (
                      <div
                        className="absolute top-1.5 rounded-md border-2 border-dashed pointer-events-none z-20"
                        style={{
                          left: ghostStyle.left,
                          width: ghostStyle.width,
                          height: ROW_HEIGHT - 12,
                          borderColor: barColor,
                          background: `${barColor}20`,
                        }}
                      >
                        <div className="px-2 py-1 text-[10px] font-medium truncate" style={{ color: barColor }}>
                          {dragState?.type === 'move' && '↔ '}
                          {dragState?.type === 'resize-left' && '↤ '}
                          {dragState?.type === 'resize-right' && '↦ '}
                          {task.name}
                        </div>
                      </div>
                    )}

                    {/* Barra real de tarea */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'absolute top-1.5 rounded-md border cursor-grab active:cursor-grabbing group transition-shadow hover:shadow-md pointer-events-auto',
                              isRoot && 'ring-1 ring-offset-1 ring-border'
                            )}
                            style={{
                              left: startX,
                              width: barWidth,
                              height: ROW_HEIGHT - 12,
                              background: barColor,
                              borderColor: barColor,
                              opacity: ghostStyle ? 0.4 : 1,
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDragState({
                                type: 'move',
                                taskId: task.id,
                                startX: e.clientX,
                                originalStart: task.startDate,
                                originalEnd: task.endDate,
                                currentDeltaDays: 0,
                              });
                            }}
                            onClick={(e) => {
                              if (Math.abs(e.clientX - (dragState?.startX || 0)) < 3 && !dragState) {
                                openTaskModal(task.id);
                              }
                            }}
                          >
                            {/* Barra de progreso */}
                            <div
                              className="absolute top-0 left-0 bottom-0 rounded-l-md bg-black/25"
                              style={{ width: progressWidth }}
                            />
                            {/* Texto */}
                            <div className="relative px-2 py-1 text-[10px] font-medium truncate pointer-events-none text-white drop-shadow-sm">
                              {task.name} · {task.progress}%
                            </div>
                            {/* Handle izquierdo (resize) */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/30 rounded-l-md"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragState({
                                  type: 'resize-left',
                                  taskId: task.id,
                                  startX: e.clientX,
                                  originalStart: task.startDate,
                                  originalEnd: task.endDate,
                                  currentDeltaDays: 0,
                                });
                              }}
                            />
                            {/* Handle derecho (resize) */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/30 rounded-r-md"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragState({
                                  type: 'resize-right',
                                  taskId: task.id,
                                  startX: e.clientX,
                                  originalStart: task.startDate,
                                  originalEnd: task.endDate,
                                  currentDeltaDays: 0,
                                });
                              }}
                            />
                            {/* Punto derecho: crear dependencia FROM (esta es la predecesora) */}
                            <div
                              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-card border-2 cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity z-30"
                              style={{ borderColor: barColor }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragState({
                                  type: 'create-dep',
                                  taskId: task.id,
                                  startX: e.clientX,
                                  originalStart: task.startDate,
                                  originalEnd: task.endDate,
                                  depFromTaskId: task.id,
                                  currentDeltaDays: 0,
                                });
                              }}
                              title="Arrastrar para crear dependencia"
                            />
                            {/* Punto izquierdo: crear dependencia TO (esta es la sucesora) - visual */}
                            <div
                              className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-card border-2 cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity z-30"
                              style={{ borderColor: barColor }}
                              title="Inicio de tarea"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="font-medium">{task.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {format(parseISO(task.startDate), "dd MMM", { locale: es })} - {format(parseISO(task.endDate), "dd MMM", { locale: es })}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Avance: {task.progress}% · {task.guild || 'Sin gremio'}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}

            {/* Hit areas de dependencias - divs absolutos para capturar hover */}
            <div
              className="absolute top-0 left-0"
              style={{
                width: timelineWidth,
                height: rows.length * ROW_HEIGHT,
                marginLeft: 0,
                position: 'absolute',
                left: LEFT_PANEL_WIDTH,
                top: 0,
                pointerEvents: 'none',
                zIndex: 50,
              }}
            >
              {dependencies.map(dep => {
                const fromRow = rows.find(r => r.task.id === dep.fromTaskId);
                const toRow = rows.find(r => r.task.id === dep.toTaskId);
                if (!fromRow || !toRow) return null;
                const fromX = dateToX(parseISO(fromRow.task.endDate)) + dayWidth;
                const fromY = fromRow.index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const toX = dateToX(parseISO(toRow.task.startDate));
                const toY = toRow.index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const midX = Math.max(fromX + 12, toX - 12);
                const centerX = midX;
                const centerY = (fromY + toY) / 2;
                const isHovered = hoveredDepId === dep.id;
                const color = DEP_COLORS[dep.type];
                const path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX - 4} ${toY}`;
                return (
                  <div key={dep.id}>
                    {/* Hit area invisible - banda a lo largo del path */}
                    <div
                      className="absolute"
                      style={{
                        left: Math.min(fromX, midX, toX) - 7,
                        top: Math.min(fromY, toY) - 7,
                        width: Math.max(fromX, midX, toX) - Math.min(fromX, midX, toX) + 14,
                        height: Math.max(fromY, toY) - Math.min(fromY, toY) + 14,
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHoveredDepId(dep.id)}
                      onMouseLeave={() => setHoveredDepId(null)}
                    />
                  </div>
                );
              })}
            </div>

            {/* SVG overlay de dependencias (solo visual, sin interacción) */}
            <svg
              className="absolute top-0 left-0"
              style={{
                width: timelineWidth,
                height: rows.length * ROW_HEIGHT,
                marginLeft: 0,
                position: 'absolute',
                left: LEFT_PANEL_WIDTH,
                top: 0,
                pointerEvents: 'none',
                zIndex: 60,
                overflow: 'visible',
              }}
            >
              <defs>
                <marker id="arrow-fs" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 Z" fill={DEP_COLORS.FS} />
                </marker>
                <marker id="arrow-ss" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 Z" fill={DEP_COLORS.SS} />
                </marker>
                <marker id="arrow-ff" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 Z" fill={DEP_COLORS.FF} />
                </marker>
                <marker id="arrow-sf" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 Z" fill={DEP_COLORS.SF} />
                </marker>
              </defs>
              {dependencies.map(dep => {
                const fromRow = rows.find(r => r.task.id === dep.fromTaskId);
                const toRow = rows.find(r => r.task.id === dep.toTaskId);
                if (!fromRow || !toRow) return null;
                const fromX = dateToX(parseISO(fromRow.task.endDate)) + dayWidth;
                const fromY = fromRow.index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const toX = dateToX(parseISO(toRow.task.startDate));
                const toY = toRow.index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const midX = Math.max(fromX + 12, toX - 12);
                const path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX - 4} ${toY}`;
                const color = DEP_COLORS[dep.type];
                const isHovered = hoveredDepId === dep.id;
                const centerX = midX;
                const centerY = (fromY + toY) / 2;
                return (
                  <g key={dep.id}>
                    {/* Path visible */}
                    <path
                      d={path}
                      stroke={color}
                      strokeWidth={isHovered ? '3' : '2'}
                      fill="none"
                      markerEnd={`url(#arrow-${dep.type.toLowerCase()})`}
                      style={{ pointerEvents: 'none' }}
                    />
                    {dep.lagDays !== 0 && (
                      <text
                        x={midX + 4}
                        y={centerY - 2}
                        fontSize="9"
                        fill={color}
                        textAnchor="start"
                        className="font-medium"
                        style={{ pointerEvents: 'none' }}
                      >
                        {dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Botones de eliminar dependencia (X roja) - divs HTML absolutos */}
            <div
              className="absolute top-0 left-0"
              style={{
                width: timelineWidth,
                height: rows.length * ROW_HEIGHT,
                position: 'absolute',
                left: LEFT_PANEL_WIDTH,
                top: 0,
                pointerEvents: 'none',
                zIndex: 55,
              }}
            >
              {dependencies.map(dep => {
                const fromRow = rows.find(r => r.task.id === dep.fromTaskId);
                const toRow = rows.find(r => r.task.id === dep.toTaskId);
                if (!fromRow || !toRow) return null;
                const fromY = fromRow.index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const toY = toRow.index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const fromX = dateToX(parseISO(fromRow.task.endDate)) + dayWidth;
                const toX = dateToX(parseISO(toRow.task.startDate));
                const midX = Math.max(fromX + 12, toX - 12);
                const centerX = midX;
                const centerY = (fromY + toY) / 2;
                const isHovered = hoveredDepId === dep.id;
                if (!isHovered) return null;
                return (
                  <button
                    key={dep.id}
                    onClick={() => deleteDependency(dep.id)}
                    className="absolute w-[18px] h-[18px] rounded-full bg-red-500 border-2 border-white shadow-md flex items-center justify-center hover:bg-red-600 transition-colors"
                    style={{
                      left: centerX - 9,
                      top: centerY - 9,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                    }}
                    title="Eliminar dependencia"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8">
                      <path d="M1 1 L7 7 M7 1 L1 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Línea temporal durante create-dep */}
            {depPreview && (
              <svg
                className="absolute top-0 left-0 pointer-events-none z-40"
                style={{
                  width: timelineWidth,
                  height: rows.length * ROW_HEIGHT,
                  position: 'absolute',
                  left: LEFT_PANEL_WIDTH,
                  top: 0,
                }}
              >
                <line
                  x1={depPreview.fromX}
                  y1={depPreview.fromY}
                  x2={depPreview.fromX + depPreview.mouseX}
                  y2={depPreview.fromY}
                  stroke={DEP_COLORS.FS}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </svg>
            )}
          </div>

          {/* Mensaje de drag overlay */}
          {dragState && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-3 py-2 rounded-md shadow-lg z-50">
              {dragState.type === 'move' && 'Moviendo tarea... soltar para confirmar'}
              {dragState.type === 'resize-left' && 'Redimensionando inicio... soltar para confirmar'}
              {dragState.type === 'resize-right' && 'Redimensionando fin... soltar para confirmar'}
              {dragState.type === 'create-dep' && 'Arrastrando dependencia... soltar sobre la tarea sucesora'}
            </div>
          )}
        </div>
      </div>

      {/* Leyenda inferior */}
      <div className="border-t border-border bg-card px-5 py-2 flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-slate-600" /> FS: Fin→Inicio</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-sky-500" /> SS: Inicio→Inicio</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-purple-500" /> FF: Fin→Fin</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-orange-500" /> SF: Inicio→Fin</span>
        <span className="text-muted-foreground/70 ml-auto">Arrastrar barra: mover · Borde: redimensionar · Círculo derecho: crear dependencia · Hover flecha: eliminar</span>
      </div>

      <AddTaskDialog open={addTaskOpen} onOpenChange={setAddTaskOpen} />
    </div>
  );
}
