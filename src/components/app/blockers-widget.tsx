'use client';

import { useAppStore } from '@/lib/store';
import { getActiveBlockers } from '@/lib/workday';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function BlockersWidget() {
  const { tasks, dependencies, selectedObraId, openTaskModal, setActiveView } = useAppStore();
  const blockers = getActiveBlockers(tasks, dependencies, selectedObraId as string);

  // Si no hay bloqueos, no mostrar el widget (no aporta ruido)
  if (blockers.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-600" />
            Bloqueos activos
          </span>
          <span className="text-[10px] font-normal text-red-600">
            {blockers.length} tarea{blockers.length > 1 ? 's' : ''} frenada{blockers.length > 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {blockers.slice(0, 4).map(({ blockedTask, blockingTasks, daysOverdue }) => (
            <div
              key={blockedTask.id}
              className="p-2 rounded-md border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
            >
              <button
                onClick={() => openTaskModal(blockedTask.id)}
                className="w-full flex items-center gap-2 text-left group"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate group-hover:text-primary">
                    {blockedTask.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Inicio: {format(parseISO(blockedTask.startDate), "dd MMM", { locale: es })}
                    {daysOverdue > 0 && (
                      <span className="text-red-600 font-medium ml-1">· {daysOverdue}d atrasada</span>
                    )}
                  </div>
                </div>
              </button>
              <div className="mt-1.5 pl-5 space-y-1">
                {blockingTasks.map(({ task, progress }) => (
                  <button
                    key={task.id}
                    onClick={() => openTaskModal(task.id)}
                    className="w-full flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition group"
                  >
                    <span className="text-red-500">↳ falta:</span>
                    <span className="truncate group-hover:text-primary">{task.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto shrink-0">
                      {progress}%
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {blockers.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-muted-foreground"
              onClick={() => setActiveView('task_list')}
            >
              Ver {blockers.length - 4} más <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
