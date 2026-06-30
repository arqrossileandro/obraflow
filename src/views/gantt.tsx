'use client';

import { useAppStore, getRootTasks, getSubtasks } from '@/lib/store';
import type { Task, GanttScale, DependencyType } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks,
  addMonths, format, parseISO, differenceInCalendarDays, eachDayOfInterval,
  differenceInWeeks, differenceInMonths, isSameDay, isWithinInterval, subWeeks, subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Plus, Link2,
  Calendar as CalendarIcon, GripHorizontal
} from 'lucide-react';
import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  no_iniciada: 'bg-slate-200 text-slate-700 border-slate-300',
  en_curso: 'bg-emerald-500 text-white border-emerald-600',
  pausada: 'bg-amber-400 text-white border-amber-500',
  finalizada: 'bg-slate-400 text-white border-slate-500',
};

export function GanttView() {
  const {
    obras, tasks, dependencies, selectedObraId, ganttScale, setGanttScale,
    openTaskModal, moveTask, resizeTask, addDependency, deleteDependency,
  } = useAppStore();

  const obra = obras.find(o => o.id === selectedObraId);
  const [refDate, setRefDate] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-left' | 'resize-right' | 'create-dep';
    taskId: string;
    startX: number;
    originalStart: string;
    originalEnd: string;
    depFromTaskId?: string;
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
      // cada día = 1 col, agrupadas por semana en el header
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
      // 2 cols por mes
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
      // meses
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

  // Construir filas del gantt (tareas raíz + subtareas indentadas)
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

  // Convertir fecha a posición X
  const dateToX = useCallback((date: Date) => {
    return differenceInCalendarDays(date, rangeStart) * dayWidth;
  }, [rangeStart, dayWidth]);

  // Convertir posición X a fecha
  const xToDate = useCallback((x: number) => {
    const days = Math.round(x / dayWidth);
    return addDays(rangeStart, days);
  }, [rangeStart, dayWidth]);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft - LEFT_PANEL_WIDTH;
    const deltaDays = Math.round((e.clientX - dragState.startX) / dayWidth);

    if (dragState.type === 'move') {
      const newStart = addDays(parseISO(dragState.originalStart), deltaDays);
      const dur = differenceInCalendarDays(parseISO(dragState.originalEnd), parseISO(dragState.originalStart));
      const newEnd = addDays(newStart, dur);
      // Actualizar visualmente sin commit todavía (lo hacemos en mouseUp)
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
    }
    setDragState(null);
  }, [dragState, moveTask, resizeTask]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove as any);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  if (!obra) return null;

  // Lista de tareas para dependencias
  const taskMap = new Map(rows.map(r => [r.task.id, r.task]));

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

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="border-b border-slate-200 bg-white px-5 py-2.5 flex items-center gap-3 flex-wrap">
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
          <span className="text-xs text-slate-500 ml-2">
            {format(rangeStart, "dd MMM yyyy", { locale: es })} - {format(rangeEnd, "dd MMM yyyy", { locale: es })}
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        <ToggleGroup type="single" value={ganttScale} onValueChange={(v) => v && setGanttScale(v as GanttScale)} size="sm" className="rounded-md border">
          <ToggleGroupItem value="semana" className="text-xs h-7 px-3">Semana</ToggleGroupItem>
          <ToggleGroupItem value="quincena" className="text-xs h-7 px-3">Quincena</ToggleGroupItem>
          <ToggleGroupItem value="mes" className="text-xs h-7 px-3">Mes</ToggleGroupItem>
        </ToggleGroup>

        <div className="h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-500" /> Tarea
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-600" /> Avance
          </span>
          <span className="flex items-center gap-1">
            <Link2 className="w-3 h-3" /> Dependencia (FS/SS/FF/SF)
          </span>
          <span className="text-slate-400">· Arrastrar barra: mover · Borde: redimensionar · Clic: editar</span>
        </div>
      </div>

      {/* Gantt */}
      <div className="flex-1 overflow-auto bg-white" ref={containerRef} onMouseMove={handleMouseMove}>
        <div style={{ width: LEFT_PANEL_WIDTH + timelineWidth, minWidth: '100%' }}>
          {/* Header de dos niveles */}
          <div className="sticky top-0 z-20 flex bg-white border-b border-slate-200">
            {/* Esquina superior izquierda */}
            <div className="sticky left-0 z-30 bg-white border-r border-slate-200" style={{ width: LEFT_PANEL_WIDTH, height: HEADER_HEIGHT }}>
              <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase">Tareas</div>
              <div className="px-3 text-[10px] text-slate-400">{rows.length} tareas · {obra.name}</div>
            </div>
            {/* Header temporal */}
            <div className="flex" style={{ width: timelineWidth }}>
              {/* Nivel 1: columnas */}
              <div className="flex border-b border-slate-100" style={{ height: HEADER_HEIGHT / 2, width: '100%' }}>
                {columns.map((col, i) => {
                  // mostrar label solo si cambia
                  const showLabel = i === 0 || columns[i - 1].label !== col.label;
                  return (
                    <div
                      key={i}
                      className="text-center text-[11px] font-medium text-slate-700 border-r border-slate-100 flex items-center justify-center"
                      style={{ width: col.days * dayWidth }}
                    >
                      {showLabel && col.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Una sola fila header con sublabels y la fila izquierda vacía */}
          <div className="sticky top-[56px] z-20 flex bg-white border-b border-slate-200">
            <div className="sticky left-0 z-30 bg-white border-r border-slate-200" style={{ width: LEFT_PANEL_WIDTH, height: HEADER_HEIGHT / 2 }} />
            <div className="flex" style={{ width: timelineWidth, height: HEADER_HEIGHT / 2 }}>
              {columns.map((col, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] text-slate-500 border-r border-slate-100 flex items-center justify-center"
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
              const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

              return (
                <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50/50" style={{ height: ROW_HEIGHT }}>
                  {/* Panel izquierdo - nombre de tarea */}
                  <div
                    className="sticky left-0 z-10 bg-white border-r border-slate-200 flex items-center px-2 cursor-pointer hover:bg-slate-50"
                    style={{ width: LEFT_PANEL_WIDTH, paddingLeft: 12 + level * 20 }}
                    onClick={() => openTaskModal(task.id)}
                  >
                    {level > 0 && <span className="text-slate-300 mr-1.5 text-xs">└</span>}
                    <span
                      className={cn('w-1 h-5 rounded-full mr-2 shrink-0', PRIORITY_COLORS[task.priority])}
                      style={{ background: isRoot ? obra.color : undefined }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-xs truncate', isRoot ? 'font-medium text-slate-900' : 'text-slate-700')}>
                        {task.name}
                      </div>
                    </div>
                    <Badge className={cn('text-[9px] ml-1 px-1 py-0', STATUS_COLORS[task.status])}>
                      {task.progress}%
                    </Badge>
                  </div>

                  {/* Timeline */}
                  <div className="relative" style={{ width: timelineWidth, height: ROW_HEIGHT }}>
                    {/* Grid de fondo - líneas verticales */}
                    {columns.map((col, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-slate-100 pointer-events-none"
                        style={{ left: dateToX(col.start), width: col.days * dayWidth }}
                      />
                    ))}

                    {/* Línea de hoy */}
                    {isWithinInterval(new Date(), { start: rangeStart, end: rangeEnd }) && (
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-red-400 pointer-events-none z-10"
                        style={{ left: dateToX(new Date()) }}
                      >
                        <div className="absolute -top-0 -left-1 text-[9px] text-red-500 font-semibold bg-white px-0.5">Hoy</div>
                      </div>
                    )}

                    {/* Barra de tarea */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'absolute top-1.5 rounded-md border cursor-grab active:cursor-grabbing group transition-shadow hover:shadow-md',
                              STATUS_COLORS[task.status],
                              isRoot && 'ring-1 ring-offset-1 ring-slate-300'
                            )}
                            style={{
                              left: startX,
                              width: barWidth,
                              height: ROW_HEIGHT - 12,
                              background: isRoot ? obra.color : `${obra.color}cc`,
                              borderColor: isRoot ? obra.color : `${obra.color}`,
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDragState({
                                type: 'move',
                                taskId: task.id,
                                startX: e.clientX,
                                originalStart: task.startDate,
                                originalEnd: task.endDate,
                              });
                            }}
                            onClick={(e) => {
                              if (Math.abs(e.clientX - (dragState?.startX || 0)) < 3) {
                                openTaskModal(task.id);
                              }
                            }}
                          >
                            {/* Barra de progreso */}
                            <div
                              className="absolute top-0 left-0 bottom-0 rounded-l-md bg-emerald-600/70"
                              style={{ width: progressWidth }}
                            />
                            {/* Texto */}
                            <div className="relative px-2 py-1 text-[10px] font-medium truncate pointer-events-none">
                              {task.name} · {task.progress}%
                            </div>
                            {/* Handle izquierdo (resize) */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/20 rounded-l-md"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragState({
                                  type: 'resize-left',
                                  taskId: task.id,
                                  startX: e.clientX,
                                  originalStart: task.startDate,
                                  originalEnd: task.endDate,
                                });
                              }}
                            />
                            {/* Handle derecho (resize) */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/20 rounded-r-md"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragState({
                                  type: 'resize-right',
                                  taskId: task.id,
                                  startX: e.clientX,
                                  originalStart: task.startDate,
                                  originalEnd: task.endDate,
                                });
                              }}
                            />
                            {/* Punto de dependencia (derecha) */}
                            <div
                              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ borderColor: obra.color }}
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
                                });
                              }}
                              title="Crear dependencia"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="font-medium">{task.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {format(parseISO(task.startDate), "dd MMM", { locale: es })} - {format(parseISO(task.endDate), "dd MMM", { locale: es })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Avance: {task.progress}% · {task.guild || 'Sin gremio'}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}

            {/* Flechas de dependencias - SVG overlay */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              style={{ width: timelineWidth, height: rows.length * ROW_HEIGHT, marginLeft: 0, position: 'absolute', left: LEFT_PANEL_WIDTH, top: 0 }}
            >
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
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
                const color = dep.type === 'FS' ? '#475569' : dep.type === 'SS' ? '#0ea5e9' : dep.type === 'FF' ? '#a855f7' : '#f97316';
                return (
                  <g key={dep.id}>
                    <path d={path} stroke={color} strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
                    {dep.lagDays !== 0 && (
                      <text x={midX} y={(fromY + toY) / 2} fontSize="9" fill={color} textAnchor="middle" className="font-medium">
                        {dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Mensaje de drag overlay */}
          {dragState?.type === 'move' && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-2 rounded-md shadow-lg z-50">
              Moviendo tarea... soltar para confirmar
            </div>
          )}
        </div>
      </div>

      {/* Leyenda inferior de dependencias */}
      <div className="border-t border-slate-200 bg-white px-5 py-2 flex items-center gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-slate-600" /> FS: Fin→Inicio</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-sky-500" /> SS: Inicio→Inicio</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-purple-500" /> FF: Fin→Fin</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-orange-500" /> SF: Inicio→Fin</span>
        <span className="text-slate-400 ml-auto">Al mover una tarea predecesora, las dependencias FS propagan automáticamente</span>
      </div>
    </div>
  );
}
