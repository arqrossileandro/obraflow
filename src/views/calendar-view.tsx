'use client';

import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, parseISO, isSameDay, isSameMonth, addMonths, subMonths, isToday,
  isWithinInterval
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useState } from 'react';

const STATUS_DOT: Record<string, string> = {
  no_iniciada: 'bg-slate-400',
  en_curso: 'bg-emerald-500',
  pausada: 'bg-amber-500',
  finalizada: 'bg-slate-400',
};

export function CalendarView() {
  const { obras, tasks, selectedObraId, openTaskModal } = useAppStore();
  const obra = obras.find(o => o.id === selectedObraId);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (!obra) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const obraTasks = tasks.filter(t => t.obraId === obra.id);

  const getTasksForDay = (day: Date) => {
    return obraTasks.filter(t => {
      const start = parseISO(t.startDate);
      const end = parseISO(t.endDate);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  const getTaskStartsOnDay = (day: Date) => obraTasks.filter(t => isSameDay(parseISO(t.startDate), day));
  const getTaskEndsOnDay = (day: Date) => obraTasks.filter(t => isSameDay(parseISO(t.endDate), day));

  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Calendario</h2>
          <p className="text-xs text-slate-500 mt-0.5">{obra.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoy</Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(d => subMonths(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-slate-900 min-w-[140px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(d => addMonths(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" /> Inicio de tarea
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500" /> Fin de tarea
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-300" /> En curso
        </span>
        <span className="text-slate-400 ml-auto">
          {obraTasks.length} tareas en el calendario
        </span>
      </div>

      <Card className="overflow-hidden">
        {/* Header días de la semana */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekdays.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-600 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayTasks = getTasksForDay(day);
            const starts = getTaskStartsOnDay(day);
            const ends = getTaskEndsOnDay(day);
            const inMonth = isSameMonth(day, currentMonth);
            const isTodayDay = isToday(day);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[120px] border-r border-b border-slate-100 p-1.5 relative',
                  !inMonth && 'bg-slate-50/50',
                  isWeekend && inMonth && 'bg-slate-50/30',
                  (i + 1) % 7 === 0 && 'border-r-0'
                )}
              >
                <div className={cn(
                  'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                  isTodayDay ? 'bg-orange-500 text-white' : inMonth ? 'text-slate-700' : 'text-slate-400'
                )}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-0.5">
                  {/* Inicios */}
                  {starts.map(t => (
                    <button
                      key={`s-${t.id}`}
                      onClick={() => openTaskModal(t.id)}
                      className="w-full text-left text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition truncate flex items-center gap-1"
                      title={`Inicio: ${t.name}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                      <span className="truncate">▶ {t.name}</span>
                    </button>
                  ))}
                  {/* Fines */}
                  {ends.map(t => (
                    <button
                      key={`e-${t.id}`}
                      onClick={() => openTaskModal(t.id)}
                      className="w-full text-left text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 hover:bg-orange-200 transition truncate flex items-center gap-1"
                      title={`Fin: ${t.name}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />
                      <span className="truncate">■ {t.name}</span>
                    </button>
                  ))}
                  {/* En curso (sin inicio ni fin hoy) */}
                  {dayTasks.filter(t => !starts.includes(t) && !ends.includes(t)).slice(0, 2).map(t => (
                    <button
                      key={`m-${t.id}`}
                      onClick={() => openTaskModal(t.id)}
                      className="w-full text-left text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition truncate flex items-center gap-1"
                      title={`En curso: ${t.name}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                  {dayTasks.filter(t => !starts.includes(t) && !ends.includes(t)).length > 2 && (
                    <div className="text-[10px] text-slate-500 px-1.5">
                      +{dayTasks.filter(t => !starts.includes(t) && !ends.includes(t)).length - 2} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
