// ============================================================================
// Workday logic — compartido entre Dashboard (desktop) y Mobile tabs
// ============================================================================
// Funciones puras que calculan: tareas de hoy, bloqueos activos, próximos
// desbloqueos, y árbol de dependencias centrado en una tarea.
// ============================================================================

import type { Task, Dependency, ID, AppNotification } from '@/types';
import { parseISO, isAfter, isBefore, isWithinInterval, addDays, differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

/** Tarea que debería ejecutarse hoy (rango de fechas incluye hoy, no finalizada) */
export function isTaskActiveToday(task: Task, today: Date = new Date()): boolean {
  if (task.status === 'finalizada') return false;
  const start = parseISO(task.startDate);
  const end = parseISO(task.endDate);
  // Si la fecha de fin ya pasó y no está finalizada, igual cuenta como "hoy" (atrasada)
  if (isBefore(end, start)) return false;
  try {
    return isWithinInterval(today, { start, end: addDays(end, 30) });
  } catch {
    return false;
  }
}

/** Tarea atrasada: fecha de fin < hoy, no finalizada */
export function isTaskOverdue(task: Task, today: Date = new Date()): boolean {
  if (task.status === 'finalizada') return false;
  return isAfter(today, parseISO(task.endDate));
}

/**
 * Bloqueo activo: la tarea por fecha debería estar activa o ya atrasada,
 * pero tiene al menos una predecesora FS no finalizada.
 */
export function getTaskBlockers(
  task: Task,
  tasks: Task[],
  dependencies: Dependency[],
  today: Date = new Date(),
): { blockingTask: Task; dep: Dependency }[] {
  if (task.status === 'finalizada') return [];
  // Solo dependencias FS que apuntan a esta tarea (es la sucesora)
  const incomingDeps = dependencies.filter(d => d.toTaskId === task.id && d.type === 'FS');
  const result: { blockingTask: Task; dep: Dependency }[] = [];
  for (const dep of incomingDeps) {
    const blocker = tasks.find(t => t.id === dep.fromTaskId);
    if (!blocker) continue;
    // Aplica el lagDays: la predecesora + lagDays debe ser <= hoy
    const effectiveEnd = addDays(parseISO(blocker.endDate), dep.lagDays || 0);
    if (blocker.status !== 'finalizada' || isAfter(effectiveEnd, today)) {
      result.push({ blockingTask: blocker, dep });
    }
  }
  return result;
}

export interface TodayTask {
  task: Task;
  blockers: { blockingTask: Task; dep: Dependency }[];
  isOverdue: boolean;
  isReadyToStart: boolean; // no tiene bloqueos pendientes
  daysLate: number;
  assignees: ID[];
}

/** Lista de tareas activas hoy con sus bloqueos calculados */
export function getTodayTasks(
  tasks: Task[],
  dependencies: Dependency[],
  obraId: ID,
  today: Date = new Date(),
): TodayTask[] {
  const obraTasks = tasks.filter(t => t.obraId === obraId && t.parentId !== null); // solo subtareas operativas
  const result = obraTasks
    .filter(t => isTaskActiveToday(t, today))
    .map(t => {
      const blockers = getTaskBlockers(t, tasks, dependencies, today);
      const isOverdue = isTaskOverdue(t, today);
      const daysLate = isOverdue ? differenceInCalendarDays(today, parseISO(t.endDate)) : 0;
      return {
        task: t,
        blockers,
        isOverdue,
        isReadyToStart: blockers.length === 0 && t.status === 'no_iniciada',
        daysLate,
        assignees: t.assigneeIds,
      };
    })
    .sort((a, b) => {
      // Orden: atrasadas primero, luego por prioridad, luego por fecha de fin
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      const prioOrder = { critica: 0, alta: 1, media: 2, baja: 3 };
      const pa = prioOrder[a.task.priority] ?? 2;
      const pb = prioOrder[b.task.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return parseISO(a.task.endDate).getTime() - parseISO(b.task.endDate).getTime();
    });
  return result;
}

export interface ActiveBlocker {
  blockedTask: Task;
  blockingTasks: { task: Task; dep: Dependency; progress: number }[];
  daysOverdue: number;
}

/** Tareas que por fecha deberían estar activas pero tienen bloqueos */
export function getActiveBlockers(
  tasks: Task[],
  dependencies: Dependency[],
  obraId: ID,
  today: Date = new Date(),
): ActiveBlocker[] {
  const obraTasks = tasks.filter(t => t.obraId === obraId && t.parentId !== null && t.status !== 'finalizada');
  return obraTasks
    .map(t => {
      const blockers = getTaskBlockers(t, tasks, dependencies, today);
      if (blockers.length === 0) return null;
      // Solo mostrar si la tarea ya debería haber empezado (inicio <= hoy + 7d)
      const start = parseISO(t.startDate);
      if (isAfter(start, addDays(today, 7))) return null;
      return {
        blockedTask: t,
        blockingTasks: blockers.map(b => ({
          task: b.blockingTask,
          dep: b.dep,
          progress: b.blockingTask.progress,
        })),
        daysOverdue: isAfter(today, parseISO(t.endDate))
          ? differenceInCalendarDays(today, parseISO(t.endDate))
          : 0,
      } as ActiveBlocker;
    })
    .filter((x): x is ActiveBlocker => x !== null)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export interface UpcomingUnblock {
  task: Task;                 // tarea en curso cerca de terminar
  willUnlock: Task[];         // tareas que se van a desbloquear
  daysToFinish: number;       // días para que termine según fecha planificada
}

/** Tareas en curso que van a desbloquear a otras en los próximos 7 días */
export function getUpcomingUnblocks(
  tasks: Task[],
  dependencies: Dependency[],
  obraId: ID,
  today: Date = new Date(),
  lookaheadDays = 7,
): UpcomingUnblock[] {
  const obraTasks = tasks.filter(t => t.obraId === obraId);
  // Tareas en curso, no finalizadas, que terminan dentro de `lookaheadDays` días
  const candidates = obraTasks.filter(t => {
    if (t.status === 'finalizada' || t.parentId === null) return false;
    const end = parseISO(t.endDate);
    const start = parseISO(t.startDate);
    if (isAfter(today, end)) return false; // ya atrasada, no "próxima"
    if (isAfter(start, today)) return false; // todavía no empezó
    return isBefore(end, addDays(today, lookaheadDays));
  });
  return candidates
    .map(t => {
      // Buscar dependencias donde esta tarea es la predecesora (FS)
      const outgoingDeps = dependencies.filter(d => d.fromTaskId === t.id && d.type === 'FS');
      const willUnlock: Task[] = [];
      for (const dep of outgoingDeps) {
        const next = tasks.find(x => x.id === dep.toTaskId);
        if (next && next.status !== 'finalizada') {
          willUnlock.push(next);
        }
      }
      if (willUnlock.length === 0) return null;
      return {
        task: t,
        willUnlock,
        daysToFinish: differenceInCalendarDays(parseISO(t.endDate), today),
      } as UpcomingUnblock;
    })
    .filter((x): x is UpcomingUnblock => x !== null)
    .sort((a, b) => a.daysToFinish - b.daysToFinish);
}

export interface TaskSequence {
  blockers: { task: Task; dep: Dependency; progress: number; status: Task['status'] }[];
  currentTask: Task;
  unlocks: { task: Task; dep: Dependency; status: Task['status'] }[];
}

/** Árbol de dependencias centrado en una tarea — para vista "Secuencia" en mobile */
export function getTaskSequence(
  taskId: ID,
  tasks: Task[],
  dependencies: Dependency[],
): TaskSequence | null {
  const current = tasks.find(t => t.id === taskId);
  if (!current) return null;

  // Predecesoras FS (las que bloquean a esta)
  const incomingDeps = dependencies.filter(d => d.toTaskId === taskId && d.type === 'FS');
  const blockers = incomingDeps
    .map(dep => {
      const task = tasks.find(t => t.id === dep.fromTaskId);
      if (!task) return null;
      return { task, dep, progress: task.progress, status: task.status };
    })
    .filter((x): x is { task: Task; dep: Dependency; progress: number; status: Task['status'] } => x !== null)
    .sort((a, b) => a.progress - b.progress); // menos avanzadas primero (las que más faltan)

  // Sucesoras FS (las que esta va a desbloquear)
  const outgoingDeps = dependencies.filter(d => d.fromTaskId === taskId && d.type === 'FS');
  const unlocks = outgoingDeps
    .map(dep => {
      const task = tasks.find(t => t.id === dep.toTaskId);
      if (!task) return null;
      return { task, dep, status: task.status };
    })
    .filter((x): x is { task: Task; dep: Dependency; status: Task['status'] } => x !== null);

  return { blockers, currentTask: current, unlocks };
}

/** Genera notificaciones de desbloqueo cuando una tarea llega a 100% */
export function generateUnblockNotifications(
  tasks: Task[],
  dependencies: Dependency[],
  obraId: ID,
  justCompletedTaskId: ID,
): AppNotification[] {
  const outgoingDeps = dependencies.filter(
    d => d.fromTaskId === justCompletedTaskId && d.type === 'FS'
  );
  const result: AppNotification[] = [];
  for (const dep of outgoingDeps) {
    const next = tasks.find(t => t.id === dep.toTaskId);
    if (!next || next.status === 'finalizada') continue;
    // Verificar que no queden otros bloqueos
    const otherBlockers = getTaskBlockers(next, tasks, dependencies);
    if (otherBlockers.length === 0) {
      result.push({
        id: `n${Date.now()}-${next.id}`,
        obraId,
        taskId: next.id,
        type: 'task_unblocked',
        title: `Tarea desbloqueada: ${next.name}`,
        message: `${next.name} ya puede arrancar — la predecesora fue completada.`,
        createdAt: new Date().toISOString(),
        read: false,
        severity: 'info',
      });
    }
  }
  return result;
}

/** Formatea fecha relativa tipo "hace 2 días" / "en 3 días" */
export function formatRelativeDate(date: Date, today: Date = new Date()): string {
  const diff = differenceInCalendarDays(date, today);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  if (diff === -1) return 'ayer';
  if (diff > 0 && diff < 7) return `en ${diff} días`;
  if (diff < 0 && diff > -7) return `hace ${Math.abs(diff)} días`;
  return format(date, "dd MMM", { locale: es });
}

/** Estado de urgencia de una tarea para colorear cards en mobile */
export type TaskUrgency = 'overdue' | 'today' | 'soon' | 'future' | 'blocked';

export function getTaskUrgency(task: Task, today: Date = new Date()): TaskUrgency {
  if (task.status === 'finalizada') return 'future'; // no relevante
  const end = parseISO(task.endDate);
  const start = parseISO(task.startDate);
  if (isAfter(today, end)) return 'overdue';
  if (isWithinInterval(today, { start, end })) return 'today';
  if (isBefore(start, addDays(today, 7))) return 'soon';
  return 'future';
}

export const URGENCY_STYLES: Record<TaskUrgency, { bg: string; border: string; text: string; label: string }> = {
  overdue: { bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-300 dark:border-red-800', text: 'text-red-700 dark:text-red-300', label: 'Atrasada' },
  today:   { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', label: 'En fecha' },
  soon:    { bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-300 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-300', label: 'Próxima' },
  future:  { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', label: 'Futura' },
  blocked: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', label: 'Bloqueada' },
};
