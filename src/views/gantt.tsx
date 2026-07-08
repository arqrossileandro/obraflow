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
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Plus, Link2, X, Layers, ClipboardPaste,
  Copy, ChevronsDownUp, ChevronsUpDown, Flag
} from 'lucide-react';
import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AddTaskDialog } from '@/components/app/add-task-dialog';
import { TemplateDialog } from '@/components/app/template-dialog';

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
    clipboard, pasteTask, copyTask, reorderTask,
  } = useAppStore();

  const obra = obras.find(o => o.id === selectedObraId);
  const [refDate, setRefDate] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [hoveredDepId, setHoveredDepId] = useState<string | null>(null);
  const [scrollState, setScrollState] = useState({ left: 0, top: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  // Estado de colapso de tareas (taskId → true si está colapsada)
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  // Estado de drag con preview (fantasma)
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-left' | 'resize-right' | 'create-dep';
    taskId: string;
    startX: number;
    startY: number;
    originalStart: string;
    originalEnd: string;
    depFromTaskId?: string;
    currentDeltaDays: number;
    currentMouseX: number;
    currentMouseY: number;
    wasDragged: boolean;
  } | null>(null);

  // Ref para acceder al dragState actual dentro de los handlers globales
  // (evita re-registrar listeners en cada cambio de dragState)
  const dragStateRef = useRef(dragState);
  useEffect(() => { dragStateRef.current = dragState; }, [dragState]);

  // Refs para rows y dayWidth se declaran después de que esos valores existen
  // (ver más abajo)

  const containerRef = useRef<HTMLDivElement>(null);

  // Calcular rango de fechas — extendido hacia pasado (6 meses) y futuro (12-24 meses)
  const { startDate: rangeStart, endDate: rangeEnd, totalDays, columns } = useMemo(() => {
    let s: Date, e: Date;
    if (ganttScale === 'semana') {
      // 8 semanas atrás, 24 adelante (más futuro porque las tareas largas se ven cortadas)
      s = startOfWeek(subWeeks(refDate, 8), { weekStartsOn: 1 });
      e = endOfWeek(addWeeks(refDate, 24), { weekStartsOn: 1 });
    } else if (ganttScale === 'quincena') {
      // 6 meses atrás, 18 adelante
      s = startOfMonth(subMonths(refDate, 6));
      e = endOfMonth(addMonths(refDate, 18));
    } else {
      // 6 meses atrás, 12 adelante
      s = startOfMonth(subMonths(refDate, 6));
      e = endOfMonth(addMonths(refDate, 12));
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

  // Construir filas del gantt — respeta colapso
  const rows = useMemo(() => {
    if (!obra) return [];
    const result: { task: Task; level: number; index: number }[] = [];
    const rootTasks = getRootTasks(tasks, obra.id);
    let idx = 0;
    const walk = (task: Task, level: number) => {
      result.push({ task, level, index: idx++ });
      // Solo recorrer subtareas si la tarea NO está colapsada
      if (!collapsedTasks.has(task.id)) {
        getSubtasks(tasks, task.id).forEach(st => walk(st, level + 1));
      }
    };
    rootTasks.forEach(t => walk(t, 0));
    return result;
  }, [tasks, obra, collapsedTasks]);

  // Refs para rows y dayWidth (para que los handlers globales los lean sin re-registrarse)
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  const dayWidthRef = useRef(dayWidth);
  useEffect(() => { dayWidthRef.current = dayWidth; }, [dayWidth]);

  // Toggle colapso
  const toggleCollapse = useCallback((taskId: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Colapsar todas las tareas que tienen subtareas
  const collapseAll = useCallback(() => {
    const allWithSubtasks = new Set<string>();
    tasks.forEach(t => {
      if (tasks.some(child => child.parentId === t.id)) {
        allWithSubtasks.add(t.id);
      }
    });
    setCollapsedTasks(allWithSubtasks);
  }, [tasks]);

  // Expandir todo
  const expandAll = useCallback(() => {
    setCollapsedTasks(new Set());
  }, []);

  // Helper: ¿la tarea tiene subtareas?
  const hasSubtasks = useCallback((taskId: string) => {
    return tasks.some(t => t.parentId === taskId);
  }, [tasks]);

  const dateToX = useCallback((date: Date) => {
    return differenceInCalendarDays(date, rangeStart) * dayWidth;
  }, [rangeStart, dayWidth]);

  const xToDate = useCallback((x: number) => {
    const days = Math.round(x / dayWidth);
    return addDays(rangeStart, days);
  }, [rangeStart, dayWidth]);

  // Helper para iniciar drag: setea state + ref al mismo tiempo
  const startDrag = useCallback((ds: NonNullable<typeof dragState>) => {
    dragStateRef.current = ds;
    setDragState(ds);
  }, []);

  // Handlers estables que leen del ref (no se re-crean en cada render)
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const dw = dayWidthRef.current;
    const deltaDays = Math.round((e.clientX - ds.startX) / dw);

    // Detectar si el mouse se movió más de 3px (para distinguir click de drag)
    const moveDistance = Math.abs(e.clientX - ds.startX) + Math.abs(e.clientY - ds.startY);
    if (!ds.wasDragged && moveDistance > 3) {
      setDragState(s => s ? { ...s, wasDragged: true } : s);
    }

    // Calcular posición del pointer en coords del timeline
    let mouseX = 0, mouseY = 0;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseX = e.clientX - rect.left - LEFT_PANEL_WIDTH + containerRef.current.scrollLeft;
      mouseY = e.clientY - rect.top - HEADER_HEIGHT + containerRef.current.scrollTop;
    }

    if (deltaDays !== ds.currentDeltaDays || ds.type === 'create-dep') {
      setDragState(s => s ? {
        ...s,
        currentDeltaDays: deltaDays,
        currentMouseX: mouseX,
        currentMouseY: mouseY,
      } : s);
    }
  }, [LEFT_PANEL_WIDTH, HEADER_HEIGHT]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const ds = dragStateRef.current;
    if (!ds) return;

    if (ds.type === 'create-dep' && ds.depFromTaskId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top - HEADER_HEIGHT + containerRef.current.scrollTop;
      const targetIdx = Math.floor(y / ROW_HEIGHT);
      const targetRow = rowsRef.current[targetIdx];
      if (targetRow && targetRow.task.id !== ds.depFromTaskId) {
        addDependency({
          fromTaskId: ds.depFromTaskId,
          toTaskId: targetRow.task.id,
          type: 'FS',
          lagDays: 0,
        });
      }
    } else if (ds.wasDragged) {
      const dw = dayWidthRef.current;
      const deltaDays = Math.round((e.clientX - ds.startX) / dw);
      if (ds.type === 'move') {
        const newStart = addDays(parseISO(ds.originalStart), deltaDays);
        const dur = differenceInCalendarDays(parseISO(ds.originalEnd), parseISO(ds.originalStart));
        moveTask(ds.taskId, format(newStart, 'yyyy-MM-dd'), dur);
      } else if (ds.type === 'resize-left') {
        const newStart = addDays(parseISO(ds.originalStart), deltaDays);
        const originalEnd = parseISO(ds.originalEnd);
        if (differenceInCalendarDays(originalEnd, newStart) >= 1) {
          resizeTask(ds.taskId, format(newStart, 'yyyy-MM-dd'), format(originalEnd, 'yyyy-MM-dd'));
        }
      } else if (ds.type === 'resize-right') {
        const newEnd = addDays(parseISO(ds.originalEnd), deltaDays);
        const originalStart = parseISO(ds.originalStart);
        if (differenceInCalendarDays(newEnd, originalStart) >= 1) {
          resizeTask(ds.taskId, format(originalStart, 'yyyy-MM-dd'), format(newEnd, 'yyyy-MM-dd'));
        }
      }
    } else if (!ds.wasDragged && ds.type !== 'create-dep') {
      // Fue un click (sin drag) → abrir el modal
      openTaskModal(ds.taskId);
    }
    setDragState(null);
    dragStateRef.current = null;
  }, [addDependency, moveTask, resizeTask, openTaskModal, HEADER_HEIGHT, ROW_HEIGHT]);

  // Registrar listeners UNA sola vez al montar el componente
  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Trackear scroll y tamaño del viewport del contenedor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setScrollState({ left: el.scrollLeft, top: el.scrollTop });
      setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  if (!obra) return null;

  const navigate = (direction: 'prev' | 'next') => {
    if (ganttScale === 'semana') {
      // Salto grande: 8 semanas (2 meses) por click
      setRefDate(d => direction === 'prev' ? subWeeks(d, 8) : addWeeks(d, 8));
    } else if (ganttScale === 'quincena') {
      // 4 meses por salto
      setRefDate(d => direction === 'prev' ? subMonths(d, 4) : addMonths(d, 4));
    } else {
      // 6 meses por salto en vista mensual
      setRefDate(d => direction === 'prev' ? subMonths(d, 6) : addMonths(d, 6));
    }
  };

  const goToday = () => {
    const today = new Date();
    setRefDate(today);
    // Calcular el nuevo rangeStart según la escala actual
    let newRangeStart: Date;
    if (ganttScale === 'semana') {
      newRangeStart = startOfWeek(subWeeks(today, 8), { weekStartsOn: 1 });
    } else if (ganttScale === 'quincena') {
      newRangeStart = startOfMonth(subMonths(today, 6));
    } else {
      newRangeStart = startOfMonth(subMonths(today, 6));
    }
    // Scrollear a la posición de "hoy" después de que se recalcule el rango
    setTimeout(() => {
      if (containerRef.current) {
        const todayX = differenceInCalendarDays(today, newRangeStart) * dayWidth;
        const viewportWidth = containerRef.current.clientWidth - LEFT_PANEL_WIDTH;
        // Centrar "hoy" en el viewport
        containerRef.current.scrollLeft = Math.max(0, todayX - viewportWidth / 2);
      }
    }, 100);
  };

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
  // currentMouseX/Y están en coords internas del contenido scrolleable (incluye LEFT_PANEL_WIDTH)
  const depPreview = (() => {
    if (!dragState || dragState.type !== 'create-dep' || !dragState.depFromTaskId) return null;
    const fromRow = rows.find(r => r.task.id === dragState.depFromTaskId);
    if (!fromRow) return null;
    // fromX/Y en coords internas del contenido scrolleable
    const fromX = dateToX(parseISO(fromRow.task.endDate)) + dayWidth + LEFT_PANEL_WIDTH;
    const fromY = fromRow.index * ROW_HEIGHT + ROW_HEIGHT / 2 + HEADER_HEIGHT;
    // toX/Y ya están en coords internas (calculadas en handleMouseMove)
    const toX = dragState.currentMouseX + LEFT_PANEL_WIDTH;
    const toY = dragState.currentMouseY + HEADER_HEIGHT;
    return { fromX, fromY, toX, toY };
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] relative">
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

        <div className="ml-auto flex items-center gap-2">
          {clipboard && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-primary/50 text-primary"
              onClick={() => {
                const newId = pasteTask(null, obra.id, 0);
                if (newId) {
                  openTaskModal(newId);
                }
              }}
              title={`Pegar: ${clipboard.task.name} (${clipboard.subtasks.length + 1} tareas)`}
            >
              <ClipboardPaste className="w-3.5 h-3.5 mr-1" />
              Pegar
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8" onClick={() => setTemplateOpen(true)}>
            <Layers className="w-3.5 h-3.5 mr-1" /> Plantilla
          </Button>
          <Button size="sm" className="h-8" onClick={() => setAddTaskOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Crear tarea
          </Button>
        </div>
      </div>

      {/* Gantt - contenedor scrolleable */}
      <div className="flex-1 overflow-auto bg-card relative" ref={containerRef}>
        <div style={{ width: LEFT_PANEL_WIDTH + timelineWidth, minWidth: '100%' }}>
          {/* Header unificado (nivel 1 + nivel 2 en una sola fila sticky) */}
          <div className="sticky top-0 z-20 flex bg-card border-b border-border" style={{ height: HEADER_HEIGHT }}>
            <div className="sticky left-0 z-30 bg-card border-r border-border flex flex-col justify-center" style={{ width: LEFT_PANEL_WIDTH }}>
              <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <span>Tareas</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="font-normal normal-case text-muted-foreground/70">{rows.length}</span>
                {/* Botones colapsar/expandir todo */}
                <div className="flex items-center gap-0.5 ml-auto">
                  <button
                    onClick={collapseAll}
                    className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition"
                    title="Colapsar todo"
                  >
                    <ChevronsDownUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={expandAll}
                    className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition"
                    title="Expandir todo"
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="px-3 text-[10px] text-muted-foreground/70 truncate">{obra.name}</div>
            </div>
            <div className="flex flex-col" style={{ width: timelineWidth }}>
              {/* Sub-nivel 1: meses / semanas */}
              <div className="flex border-b border-border/50" style={{ height: HEADER_HEIGHT / 2 }}>
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
              {/* Sub-nivel 2: sublabels (días / quincenas) — solo si hay sublabel */}
              <div className="flex relative" style={{ height: HEADER_HEIGHT / 2 }}>
                {columns.map((col, i) => (
                  <div
                    key={i}
                    className="text-center text-[10px] text-muted-foreground border-r border-border/50 flex items-center justify-center"
                    style={{ width: col.days * dayWidth }}
                  >
                    {col.sublabel}
                  </div>
                ))}
                {/* Etiqueta "Hoy" flotante en el header */}
                {isWithinInterval(new Date(), { start: rangeStart, end: rangeEnd }) && (
                  <div
                    className="absolute top-0 bottom-0 flex items-center pointer-events-none z-20"
                    style={{ left: dateToX(new Date()) - 16 }}
                  >
                    <span className="text-[9px] font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-1 rounded shadow-sm border border-red-300 dark:border-red-800">
                      HOY
                    </span>
                  </div>
                )}
              </div>
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
              const hasChildren = hasSubtasks(task.id);
              const isCollapsed = collapsedTasks.has(task.id);
              const isMilestone = task.type === 'hito';

              return (
                <div key={task.id} className="flex border-b border-border/40 hover:bg-muted/30 pointer-events-none group" style={{ height: ROW_HEIGHT }}>
                  {/* Panel izquierdo */}
                  <div
                    className="sticky left-0 z-10 bg-card border-r border-border flex items-center px-2 cursor-pointer hover:bg-muted/50 pointer-events-auto"
                    style={{ width: LEFT_PANEL_WIDTH, paddingLeft: 12 + level * 20 }}
                    onClick={() => openTaskModal(task.id)}
                  >
                    {/* Ícono de colapsar/expandir */}
                    {hasChildren ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapse(task.id);
                        }}
                        className="w-4 h-4 flex items-center justify-center mr-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded shrink-0"
                        title={isCollapsed ? 'Expandir' : 'Colapsar'}
                      >
                        <ChevronRight className={cn('w-3 h-3 transition-transform', !isCollapsed && 'rotate-90')} />
                      </button>
                    ) : (
                      <span className="w-4 mr-1 shrink-0" />
                    )}
                    {/* Ícono de hito (diamante) o barra de color */}
                    {isMilestone ? (
                      <Flag className="w-3.5 h-3.5 mr-1.5 shrink-0" style={{ color: barColor }} />
                    ) : (
                      <span
                        className="w-1.5 h-5 rounded-full mr-2 shrink-0"
                        style={{ background: barColor }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-xs truncate', isRoot ? 'font-medium text-foreground' : 'text-muted-foreground', isMilestone && 'italic')}>
                        {task.name}
                        {hasChildren && isCollapsed && (
                          <span className="ml-1.5 text-[9px] text-muted-foreground/70">
                            ({getSubtasks(tasks, task.id).length} ocultas)
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Botones: copiar + reordenar (visibles en hover) */}
                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyTask(task.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted rounded"
                        title="Copiar tarea (con subtareas)"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderTask(task.id, 'up');
                        }}
                        className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                        title="Mover arriba"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderTask(task.id, 'down');
                        }}
                        className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                        title="Mover abajo"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
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

                    {/* Línea de hoy — semitransparente, elegante */}
                    {isWithinInterval(new Date(), { start: rangeStart, end: rangeEnd }) && (
                      <div
                        className="absolute top-0 bottom-0 pointer-events-none z-10"
                        style={{
                          left: dateToX(new Date()),
                          width: 2,
                          background: 'linear-gradient(to bottom, rgba(239,68,68,0.8), rgba(239,68,68,0.4))',
                          boxShadow: '0 0 8px rgba(239,68,68,0.3)',
                        }}
                      />
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

                    {/* Barra real de tarea — hito (diamante) o tarea normal (barra) */}
                    {isMilestone ? (
                      <div
                        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing group transition-transform hover:scale-125"
                        style={{
                          left: startX - (ROW_HEIGHT - 12) / 2 + dayWidth / 2,
                          top: 4,
                          width: ROW_HEIGHT - 12,
                          height: ROW_HEIGHT - 12,
                          transform: 'rotate(45deg)',
                          background: barColor,
                          border: `2px solid ${barColor}`,
                          boxShadow: ghostStyle ? 'none' : '0 2px 4px rgba(0,0,0,0.2)',
                          opacity: ghostStyle ? 0.4 : 1,
                          touchAction: 'none',
                        }}
                        title={`Hito: ${task.name} — ${format(parseISO(task.startDate), "dd MMM yyyy", { locale: es })}`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                          startDrag({
                            type: 'move',
                            taskId: task.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            originalStart: task.startDate,
                            originalEnd: task.endDate,
                            currentDeltaDays: 0,
                            currentMouseX: 0,
                            currentMouseY: 0,
                            wasDragged: false,
                          });
                        }}
                      />
                    ) : (
                      <div
                        className={cn(
                          'absolute top-1.5 rounded-md border cursor-grab active:cursor-grabbing group/bar transition-shadow hover:shadow-md pointer-events-auto'
                        )}
                        style={{
                          left: startX,
                          width: barWidth,
                          height: ROW_HEIGHT - 12,
                          background: barColor,
                          borderColor: barColor,
                          opacity: ghostStyle ? 0.4 : 1,
                          touchAction: 'none',
                        }}
                        title={`${task.name} — ${format(parseISO(task.startDate), "dd MMM", { locale: es })} al ${format(parseISO(task.endDate), "dd MMM", { locale: es })} — ${task.progress}% — click para editar, arrastrar para mover`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                          startDrag({
                            type: 'move',
                            taskId: task.id,
                            startX: e.clientX,
                            startY: e.clientY,
                            originalStart: task.startDate,
                            originalEnd: task.endDate,
                            currentDeltaDays: 0,
                            currentMouseX: 0,
                            currentMouseY: 0,
                            wasDragged: false,
                          });
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
                              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/30 rounded-l-md opacity-0 group-hover/bar:opacity-100 transition-opacity"
                              style={{ touchAction: 'none' }}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                                startDrag({
                                  type: 'resize-left',
                                  taskId: task.id,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  originalStart: task.startDate,
                                  originalEnd: task.endDate,
                                  currentDeltaDays: 0,
                                  currentMouseX: 0,
                                  currentMouseY: 0,
                                  wasDragged: false,
                                });
                              }}
                            />
                            {/* Handle derecho (resize) */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/30 rounded-r-md opacity-0 group-hover/bar:opacity-100 transition-opacity"
                              style={{ touchAction: 'none' }}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                                startDrag({
                                  type: 'resize-right',
                                  taskId: task.id,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  originalStart: task.startDate,
                                  originalEnd: task.endDate,
                                  currentDeltaDays: 0,
                                  currentMouseX: 0,
                                  currentMouseY: 0,
                                  wasDragged: false,
                                });
                              }}
                            />
                            {/* Punto derecho: crear dependencia FROM (esta es la predecesora) */}
                            <div
                              className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair transition-all hover:scale-150 z-40 shadow-sm opacity-0 pointer-events-none group-hover/bar:opacity-100 group-hover/bar:pointer-events-auto"
                              style={{ borderColor: barColor, background: barColor, marginRight: '-6px', touchAction: 'none' }}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                                startDrag({
                                  type: 'create-dep',
                                  taskId: task.id,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  originalStart: task.startDate,
                                  originalEnd: task.endDate,
                                  depFromTaskId: task.id,
                                  currentDeltaDays: 0,
                                  currentMouseX: 0,
                                  currentMouseY: 0,
                                  wasDragged: false,
                                });
                              }}
                              title="Arrastrar para crear dependencia"
                            />
                            {/* Punto izquierdo: destino de dependencia (visual) */}
                            <div
                              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair transition-all hover:scale-150 z-40 shadow-sm opacity-0 pointer-events-none group-hover/bar:opacity-100 group-hover/bar:pointer-events-auto"
                              style={{ borderColor: barColor, background: 'var(--card)' }}
                              title="Inicio de tarea"
                            />
                          </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Las flechas de dependencias se renderizan en un overlay fijo fuera del contenedor scrolleable */}
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

      {/* === OVERLAY DE DEPENDENCIAS === */}
      {/* Capa 1: SVG visual (curvas, flechas, etiquetas) - sin interacción */}
      {(() => {
        const curvePath = (x1: number, y1: number, x2: number, y2: number) => {
          const dx = Math.abs(x2 - x1);
          const cp = Math.max(20, Math.min(60, dx / 2));
          return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2 - 4} ${y2}`;
        };

        return (
          <svg
            className="absolute pointer-events-none"
            style={{
              left: 0,
              top: 0,
              width: LEFT_PANEL_WIDTH + timelineWidth,
              height: rows.length * ROW_HEIGHT + HEADER_HEIGHT,
              overflow: 'visible',
              zIndex: 5,
            }}
          >
            <defs>
              {Object.entries(DEP_COLORS).map(([type, color]) => (
                <marker
                  key={type}
                  id={`arrow-${type.toLowerCase()}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="7"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L7,3 L0,6 Z" fill={color} />
                </marker>
              ))}
            </defs>

            {dependencies.map(dep => {
              const fromRow = rows.find(r => r.task.id === dep.fromTaskId);
              const toRow = rows.find(r => r.task.id === dep.toTaskId);
              if (!fromRow || !toRow) return null;

              const fromX = dateToX(parseISO(fromRow.task.endDate)) + dayWidth + LEFT_PANEL_WIDTH;
              const fromY = fromRow.index * ROW_HEIGHT + ROW_HEIGHT / 2 + HEADER_HEIGHT;
              const toX = dateToX(parseISO(toRow.task.startDate)) + LEFT_PANEL_WIDTH;
              const toY = toRow.index * ROW_HEIGHT + ROW_HEIGHT / 2 + HEADER_HEIGHT;

              const centerX = (fromX + toX) / 2;
              const centerY = (fromY + toY) / 2;
              const isHovered = hoveredDepId === dep.id;
              const color = DEP_COLORS[dep.type];
              const path = curvePath(fromX, fromY, toX, toY);

              return (
                <g key={dep.id}>
                  <path
                    d={path}
                    stroke={color}
                    strokeWidth={isHovered ? '3' : '2'}
                    fill="none"
                    markerEnd={`url(#arrow-${dep.type.toLowerCase()})`}
                  />
                  {dep.lagDays !== 0 && (
                    <text x={centerX} y={centerY - 6} fontSize="10" fill={color} textAnchor="middle" className="font-semibold">
                      {dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`}
                    </text>
                  )}
                  {isHovered && (
                    <g>
                      <circle cx={centerX} cy={centerY} r="10" fill="#ef4444" stroke="white" strokeWidth="2" />
                      <path
                        d={`M ${centerX - 3.5} ${centerY - 3.5} L ${centerX + 3.5} ${centerY + 3.5} M ${centerX + 3.5} ${centerY - 3.5} L ${centerX - 3.5} ${centerY + 3.5}`}
                        stroke="white" strokeWidth="2" strokeLinecap="round"
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {depPreview && (() => {
              const path = curvePath(depPreview.fromX, depPreview.fromY, depPreview.toX, depPreview.toY);
              return (
                <g>
                  <path d={path} stroke={DEP_COLORS.FS} strokeWidth="2.5" fill="none" strokeDasharray="6 4" markerEnd="url(#arrow-fs)" opacity="0.7" />
                  <circle cx={depPreview.toX} cy={depPreview.toY} r="4" fill={DEP_COLORS.FS} opacity="0.7" />
                </g>
              );
            })()}
          </svg>
        );
      })()}

      {/* Capa 2: Hit-areas como divs HTML (interacción para hover y eliminar) */}
      <div
        className="absolute"
        style={{
          left: 0,
          top: 0,
          width: LEFT_PANEL_WIDTH + timelineWidth,
          height: rows.length * ROW_HEIGHT + HEADER_HEIGHT,
          zIndex: 15, // Encima del panel izquierdo (z-10) y SVG visual (z-5), debajo de barras (z-30)
          pointerEvents: 'none',
        }}
      >
        {dependencies.map(dep => {
          const fromRow = rows.find(r => r.task.id === dep.fromTaskId);
          const toRow = rows.find(r => r.task.id === dep.toTaskId);
          if (!fromRow || !toRow) return null;

          const fromX = dateToX(parseISO(fromRow.task.endDate)) + dayWidth + LEFT_PANEL_WIDTH;
          const fromY = fromRow.index * ROW_HEIGHT + ROW_HEIGHT / 2 + HEADER_HEIGHT;
          const toX = dateToX(parseISO(toRow.task.startDate)) + LEFT_PANEL_WIDTH;
          const toY = toRow.index * ROW_HEIGHT + ROW_HEIGHT / 2 + HEADER_HEIGHT;

          const isHovered = hoveredDepId === dep.id;
          const minX = Math.min(fromX, toX);
          const maxX = Math.max(fromX, toX);
          const minY = Math.min(fromY, toY);
          const maxY = Math.max(fromY, toY);

          return (
            <div
              key={dep.id}
              className="absolute"
              style={{
                left: minX - 10,
                top: minY - 10,
                width: maxX - minX + 20,
                height: maxY - minY + 20,
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              onMouseOver={() => setHoveredDepId(dep.id)}
              onMouseOut={() => setHoveredDepId(null)}
              onClick={(e) => {
                // Solo eliminar si se hace click cerca del centro (donde está el botón X)
                const centerX = (fromX + toX) / 2;
                const centerY = (fromY + toY) / 2;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                const dist = Math.sqrt((clickX - centerX + minX - 10) ** 2 + (clickY - centerY + minY - 10) ** 2);
                if (dist < 15) {
                  deleteDependency(dep.id);
                }
              }}
            />
          );
        })}
      </div>
      {/* === FIN OVERLAY DE DEPENDENCIAS === */}
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
      <TemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
    </div>
  );
}
