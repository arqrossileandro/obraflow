'use client';

import { useAppStore } from '@/lib/store';
import { getUpcomingUnblocks } from '@/lib/workday';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Unlock, Zap, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function UnblocksWidget() {
  const { tasks, dependencies, selectedObraId, openTaskModal } = useAppStore();
  const unblocks = getUpcomingUnblocks(tasks, dependencies, selectedObraId as string);

  // Si no hay próximos desbloqueos, no mostrar
  if (unblocks.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-sky-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Unlock className="w-4 h-4 text-sky-600" />
            Próximos desbloqueos
          </span>
          <span className="text-[10px] font-normal text-muted-foreground">7 días</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {unblocks.slice(0, 3).map(({ task, willUnlock, daysToFinish }) => (
            <div key={task.id} className="p-2 rounded-md border border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/20">
              <button
                onClick={() => openTaskModal(task.id)}
                className="w-full flex items-center gap-2 text-left group"
              >
                <Zap className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate group-hover:text-primary">
                    {task.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Termina {format(parseISO(task.endDate), "dd MMM", { locale: es })}
                    <span className="ml-1 text-sky-600 font-medium">
                      · {daysToFinish === 0 ? 'hoy' : daysToFinish === 1 ? 'mañana' : `en ${daysToFinish}d`}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-semibold text-foreground">{task.progress}%</div>
                </div>
              </button>
              <div className="mt-1.5 pl-5 flex flex-wrap gap-1">
                {willUnlock.slice(0, 3).map(next => (
                  <button
                    key={next.id}
                    onClick={() => openTaskModal(next.id)}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 hover:opacity-80 transition truncate max-w-[140px]"
                    title={next.name}
                  >
                    → {next.name}
                  </button>
                ))}
                {willUnlock.length > 3 && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    +{willUnlock.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
