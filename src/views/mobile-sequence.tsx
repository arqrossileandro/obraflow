'use client';

import { useAppStore } from '@/lib/store';
import { getTaskSequence, formatRelativeDate } from '@/lib/workday';
import type { Task } from '@/types';
import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ArrowUp, ArrowDown, Lock, Unlock, CheckCircle2, Circle,
  ChevronRight, ChevronLeft, AlertCircle, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function MobileSequenceView() {
  const { tasks, dependencies, members, selectedObraId, openTaskModal, setActiveView } = useAppStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Lista de tareas "navegables" — subtareas de la obra
  const selectableTasks = useMemo(() =>
    tasks.filter(t => t.obraId === selectedObraId && t.parentId !== null),
    [tasks, selectedObraId]
  );

  const sequence = selectedTaskId
    ? getTaskSequence(selectedTaskId, tasks, dependencies)
    : null;

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // Si no hay tarea seleccionada, mostrar lista para elegir
  if (!sequence || !selectedTask) {
    return (
      <div className="pb-4">
        <div className="px-3 py-3 bg-card border-b border-border sticky top-0 z-10">
          <h2 className="text-base font-bold text-foreground">Secuencia</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Elegí una tarea para ver qué la bloquea y qué va a desbloquear
          </p>
        </div>

        {selectableTasks.length === 0 ? (
          <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No hay tareas para navegar</p>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {selectableTasks
              .filter(t => t.status !== 'finalizada')
              .slice(0, 50)
              .map(task => {
                const seq = getTaskSequence(task.id, tasks, dependencies);
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="w-full p-2.5 rounded-lg border border-border bg-card flex items-center gap-2 active:scale-[0.98] transition text-left"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: task.color || '#f97316' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{task.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        {seq && seq.blockers.length > 0 && (
                          <span className="text-amber-600 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> {seq.blockers.length}
                          </span>
                        )}
                        {seq && seq.unlocks.length > 0 && (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Unlock className="w-2.5 h-2.5" /> {seq.unlocks.length}
                          </span>
                        )}
                        <span>· {task.progress}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  const isReady = sequence.blockers.length === 0;
  const allBlockersDone = sequence.blockers.every(b => b.status === 'finalizada');

  return (
    <div className="pb-4 min-h-screen flex flex-col">
      <div className="px-3 py-3 bg-card border-b border-border sticky top-0 z-10 flex items-center gap-2">
        <button
          onClick={() => setSelectedTaskId(null)}
          className="w-8 h-8 -ml-1 rounded-md flex items-center justify-center hover:bg-muted"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-foreground truncate">{selectedTask.name}</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {selectedTask.guild || 'Sin gremio'} · {selectedTask.progress}% completado
          </p>
        </div>
        <button
          onClick={() => openTaskModal(selectedTask.id)}
          className="text-[10px] text-primary hover:underline shrink-0"
        >
          Detalle
        </button>
      </div>

      <div className="flex-1 p-3 space-y-3">
        {/* Bloqueantes (arriba) */}
        <div>
          <div className="text-[10px] font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide mb-2 flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            {sequence.blockers.length > 0
              ? `Bloqueantes (${sequence.blockers.length})`
              : 'Sin bloqueantes'}
          </div>
          {sequence.blockers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800 p-3 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                Lista para arrancar
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                No hay tareas que la bloqueen
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sequence.blockers.map(({ task: blocker, progress, status }) => (
                <button
                  key={blocker.id}
                  onClick={() => setSelectedTaskId(blocker.id)}
                  className={cn(
                    'w-full p-2.5 rounded-lg border-2 flex items-center gap-2 active:scale-[0.98] transition text-left',
                    status === 'finalizada'
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                  )}
                >
                  {status === 'finalizada' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{blocker.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {blocker.guild || 'Sin gremio'} · vence {formatRelativeDate(parseISO(blocker.endDate))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-foreground">{progress}%</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tarea actual (centro) */}
        <div className={cn(
          'rounded-xl border-2 p-3',
          isReady ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' :
          allBlockersDone ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/40' :
          'border-amber-400 bg-amber-50 dark:bg-amber-950/40'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: selectedTask.color || '#f97316' }} />
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Tarea actual
            </div>
          </div>
          <div className="text-sm font-bold text-foreground mb-1">{selectedTask.name}</div>
          <div className="text-[11px] text-muted-foreground mb-2">
            {format(parseISO(selectedTask.startDate), "dd MMM", { locale: es })} - {format(parseISO(selectedTask.endDate), "dd MMM", { locale: es })}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
            <div
              className={cn(
                'h-full transition-all',
                selectedTask.progress >= 100 ? 'bg-emerald-500' :
                selectedTask.progress >= 50 ? 'bg-sky-500' : 'bg-amber-500'
              )}
              style={{ width: `${selectedTask.progress}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground text-right">{selectedTask.progress}%</div>

          {/* Responsables */}
          {selectedTask.assigneeIds.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Responsables:</span>
              {selectedTask.assigneeIds.map(id => {
                const m = members.find(x => x.id === id);
                if (!m) return null;
                return (
                  <Badge key={id} variant="outline" className="text-[9px] px-1.5 py-0">
                    {m.initials} {m.name.split(' ')[0]}
                  </Badge>
                );
              })}
            </div>
          )}

          {selectedTask.description && (
            <div className="mt-2 pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
              {selectedTask.description}
            </div>
          )}
        </div>

        {/* Desbloquea (abajo) */}
        <div>
          <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-2 flex items-center gap-1">
            <ArrowDown className="w-3 h-3" />
            {sequence.unlocks.length > 0
              ? `Desbloquea (${sequence.unlocks.length})`
              : 'No desbloquea otras tareas'}
          </div>
          {sequence.unlocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-center">
              <div className="text-[11px] text-muted-foreground">
                Es la última de la cadena
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sequence.unlocks.map(({ task: next, status }) => (
                <button
                  key={next.id}
                  onClick={() => setSelectedTaskId(next.id)}
                  className="w-full p-2.5 rounded-lg border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-2 active:scale-[0.98] transition text-left"
                >
                  {status === 'finalizada' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{next.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {next.guild || 'Sin gremio'} · inicia {formatRelativeDate(parseISO(next.startDate))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-foreground">{next.progress}%</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CTA: ir a Hoy para reportar avance */}
        <Button
          className="w-full"
          size="lg"
          onClick={() => setActiveView('mobile_today')}
        >
          Reportar avance
        </Button>
      </div>
    </div>
  );
}
