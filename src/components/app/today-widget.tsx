'use client';

import { useAppStore } from '@/lib/store';
import { getTodayTasks } from '@/lib/workday';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const PRIORITY_BADGE: Record<string, string> = {
  baja: 'bg-muted text-muted-foreground',
  media: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  critica: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export function TodayWidget() {
  const { tasks, dependencies, selectedObraId, openTaskModal, setActiveView } = useAppStore();
  const todayTasks = getTodayTasks(tasks, dependencies, selectedObraId as string);
  const top = todayTasks.slice(0, 5);
  const overdueCount = todayTasks.filter(t => t.isOverdue).length;

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Hoy
          </span>
          <span className="text-[10px] font-normal text-muted-foreground">
            {todayTasks.length} activas{overdueCount > 0 && (
              <span className="text-red-600 ml-1">· {overdueCount} atrasadas</span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {top.length === 0 ? (
          <div className="py-3 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <span>No hay tareas activas para hoy</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {top.map(({ task, isOverdue, isReadyToStart, blockers }) => (
              <button
                key={task.id}
                onClick={() => openTaskModal(task.id)}
                className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/40 transition text-left group"
              >
                <div className={cn(
                  'w-1 h-9 rounded-full shrink-0',
                  isOverdue ? 'bg-red-500' : isReadyToStart ? 'bg-emerald-500' : 'bg-amber-500'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate group-hover:text-primary">
                    {task.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span>{task.guild || 'Sin gremio'}</span>
                    <span>·</span>
                    <span>{task.progress}%</span>
                    {blockers.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-amber-600 flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {blockers.length} bloqueo{blockers.length > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                    {isOverdue && (
                      <>
                        <span>·</span>
                        <span className="text-red-600 font-medium">atrasada</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge className={cn('text-[9px] px-1.5 py-0', PRIORITY_BADGE[task.priority])}>
                    {task.priority}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground">
                    {format(parseISO(task.endDate), "dd MMM", { locale: es })}
                  </span>
                </div>
              </button>
            ))}
            {todayTasks.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-muted-foreground"
                onClick={() => setActiveView('task_list')}
              >
                Ver {todayTasks.length - 5} más <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
