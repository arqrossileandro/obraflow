'use client';

import { useAppStore } from '@/lib/store';
import { getActiveBlockers, formatRelativeDate } from '@/lib/workday';
import type { Task } from '@/types';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Lock, Phone, MessageCircle, AlertCircle, ChevronRight, ArrowUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function MobileBlockersView() {
  const { tasks, dependencies, members, selectedObraId, openTaskModal, setActiveView } = useAppStore();
  const blockers = getActiveBlockers(tasks, dependencies, selectedObraId as string);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="pb-4">
      <div className="px-3 py-3 bg-card border-b border-border sticky top-0 z-10">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-600" />
          Bloqueos activos
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {blockers.length === 0
            ? 'No hay tareas bloqueadas — todo en marcha'
            : `${blockers.length} tarea${blockers.length > 1 ? 's' : ''} frenada${blockers.length > 1 ? 's' : ''} por dependencias`}
        </p>
      </div>

      {blockers.length === 0 ? (
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
            <ArrowUp className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Sin bloqueos</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Todas las tareas activas pueden ejecutarse. Si una tarea está esperando a otra, va a aparecer acá.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveView('mobile_today')}>
            Volver a Hoy
          </Button>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {blockers.map(({ blockedTask, blockingTasks, daysOverdue }) => (
            <div
              key={blockedTask.id}
              className={cn(
                'rounded-xl border-2 overflow-hidden',
                daysOverdue > 0
                  ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                  : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
              )}
            >
              {/* Tarea bloqueada */}
              <button
                onClick={() => setExpandedId(prev => prev === blockedTask.id ? null : blockedTask.id)}
                className="w-full p-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start gap-2">
                  <div className={cn(
                    'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0',
                    daysOverdue > 0 ? 'bg-red-500' : 'bg-amber-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground leading-tight">
                      {blockedTask.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className={cn('font-medium', daysOverdue > 0 ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300')}>
                        {daysOverdue > 0 ? `${daysOverdue}d atrasada` : 'Esperando predecesoras'}
                      </span>
                      <span>·</span>
                      <span>{blockedTask.guild || 'Sin gremio'}</span>
                      <span>·</span>
                      <span>Iniciaba {formatRelativeDate(parseISO(blockedTask.startDate))}</span>
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    'w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform',
                    expandedId === blockedTask.id && 'rotate-90'
                  )} />
                </div>
              </button>

              {/* Lista de tareas que bloquean (siempre visible) */}
              <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                <div className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Falta terminar ({blockingTasks.length}):
                </div>
                {blockingTasks.map(({ task, progress }) => {
                  const assignee = task.assigneeIds
                    .map(id => members.find(m => m.id === id))
                    .find(Boolean);
                  return (
                    <div key={task.id} className="rounded-lg bg-card border border-border p-2.5">
                      <button
                        onClick={() => openTaskModal(task.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
                              {task.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <span>{task.guild || 'Sin gremio'}</span>
                              <span>·</span>
                              <span>vence {formatRelativeDate(parseISO(task.endDate))}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-foreground">{progress}%</div>
                            <Badge className={cn(
                              'text-[9px] px-1 py-0',
                              progress >= 100 ? 'bg-emerald-100 text-emerald-700' :
                              progress >= 50 ? 'bg-sky-100 text-sky-700' :
                              'bg-amber-100 text-amber-700'
                            )}>
                              {progress >= 100 ? 'Lista' : progress >= 50 ? 'Avanza' : 'Recién'}
                            </Badge>
                          </div>
                        </div>
                      </button>

                      {/* Acciones rápidas: llamar o WhatsApp al responsable */}
                      {assignee?.phone && (
                        <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-2">
                          <div className="text-[10px] text-muted-foreground flex-1 truncate">
                            Responsable: <span className="font-medium text-foreground">{assignee.name}</span>
                          </div>
                          <a
                            href={`tel:${assignee.phone.replace(/[^+\d]/g, '')}`}
                            className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-90 transition"
                            aria-label={`Llamar a ${assignee.name}`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://wa.me/${assignee.phone.replace(/[^+\d]/g, '').replace('+', '')}?text=${encodeURIComponent(
                              `Hola ${assignee.name}, te consulto por la tarea "${task.name}" que está bloqueando a "${blockedTask.name}". ¿Cómo va?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center active:scale-90 transition"
                            aria-label={`WhatsApp a ${assignee.name}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
