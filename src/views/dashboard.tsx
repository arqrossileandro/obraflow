'use client';

import { useAppStore, getRootTasks, getSubtasks, formatCurrency, getMaterialsByObra } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock,
  Wallet, Package, Users, Activity, ArrowRight, Plus, FileCheck2, Bell
} from 'lucide-react';
import { format, parseISO, differenceInCalendarDays, isAfter, isBefore, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { computeMaterialScheduledDate } from '@/lib/store';

const STATUS_COLORS: Record<string, string> = {
  no_iniciada: 'bg-slate-200 text-slate-700',
  en_curso: 'bg-emerald-100 text-emerald-700',
  pausada: 'bg-amber-100 text-amber-700',
  finalizada: 'bg-slate-100 text-slate-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  baja: 'bg-slate-100 text-slate-600',
  media: 'bg-sky-100 text-sky-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
};

export function DashboardView() {
  const { obras, tasks, materials, members, selectedObraId, openTaskModal, setActiveView, dependencies } = useAppStore();

  const obra = obras.find(o => o.id === selectedObraId);
  if (!obra) return null;

  const rootTasks = getRootTasks(tasks, obra.id);
  const allSubtasks = tasks.filter(t => t.obraId === obra.id && t.parentId !== null);
  const obraTasks = tasks.filter(t => t.obraId === obra.id);

  // KPIs
  const totalBudget = obra.budget;
  const spentLabor = obraTasks.reduce((s, t) => s + (t.realLaborCost || 0), 0);
  const spentMaterials = obraTasks.reduce((s, t) => s + (t.realMaterialsCost || 0), 0);
  const totalSpent = spentLabor + spentMaterials;
  const spentPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const plannedLabor = obraTasks.reduce((s, t) => s + (t.laborCost || 0), 0);
  const plannedMaterials = obraTasks.reduce((s, t) => s + (t.materialsCost || 0), 0);
  const totalPlanned = plannedLabor + plannedMaterials;

  const finalizadaCount = obraTasks.filter(t => t.status === 'finalizada').length;
  const enCursoCount = obraTasks.filter(t => t.status === 'en_curso').length;
  const pendienteCount = obraTasks.filter(t => t.status === 'no_iniciada').length;
  const completionRate = obraTasks.length > 0 ? (finalizadaCount / obraTasks.length) * 100 : 0;

  const now = new Date();
  const overdueTasks = obraTasks.filter(t =>
    t.status !== 'finalizada' && isAfter(now, parseISO(t.endDate))
  );
  const upcomingTasks = obraTasks.filter(t => {
    const start = parseISO(t.startDate);
    return isAfter(start, now) && isBefore(start, addDays(now, 14));
  }).sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()).slice(0, 5);

  // Próximos pedidos de materiales
  const obraMaterials = getMaterialsByObra(materials, obra.id);
  const upcomingMaterials = obraMaterials
    .map(m => {
      const task = tasks.find(t => t.id === m.taskId);
      const schedDate = computeMaterialScheduledDate(m, task);
      return { ...m, computedDate: schedDate, taskName: task?.name || '' };
    })
    .filter(m => m.computedDate && isAfter(parseISO(m.computedDate!), now) && isBefore(parseISO(m.computedDate!), addDays(now, 30)))
    .sort((a, b) => parseISO(a.computedDate!).getTime() - parseISO(b.computedDate!).getTime())
    .slice(0, 4);

  // Desviaciones por tarea
  const taskDeviations = obraTasks
    .map(t => ({
      ...t,
      planned: t.laborCost + t.materialsCost,
      real: (t.realLaborCost || 0) + (t.realMaterialsCost || 0),
    }))
    .map(t => ({
      ...t,
      deviation: t.real - t.planned,
      deviationPct: t.planned > 0 ? ((t.real - t.planned) / t.planned) * 100 : 0,
    }))
    .filter(t => t.deviation !== 0)
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
    .slice(0, 4);

  const daysElapsed = differenceInCalendarDays(now, parseISO(obra.startDate));
  const daysTotal = differenceInCalendarDays(parseISO(obra.endDate), parseISO(obra.startDate));
  const timePct = Math.max(0, Math.min(100, (daysElapsed / daysTotal) * 100));

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{obra.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{obra.client} · {obra.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setActiveView('gantt')}>
            Ver Gantt <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
          <Button size="sm" onClick={() => setActiveView('task_list')}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nueva tarea
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Avance general</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{Math.round(completionRate)}%</span>
              <span className="text-xs text-slate-500">{finalizadaCount}/{obraTasks.length} tareas</span>
            </div>
            <Progress value={completionRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Presupuesto ejecutado</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalSpent)}</span>
            </div>
            <div className="mt-1.5 text-xs text-slate-500">
              de {formatCurrency(totalBudget)} · <span className={cn('font-semibold', spentPct > 100 ? 'text-red-600' : 'text-slate-700')}>{Math.round(spentPct)}%</span>
            </div>
            <Progress value={Math.min(100, spentPct)} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Tiempo transcurrido</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{Math.round(timePct)}%</span>
              <span className="text-xs text-slate-500">{daysElapsed} / {daysTotal} días</span>
            </div>
            <Progress value={timePct} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Alertas activas</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{overdueTasks.length + taskDeviations.length}</span>
              <span className="text-xs text-slate-500">requieren atención</span>
            </div>
            <div className="mt-1.5 text-xs text-slate-500">
              {overdueTasks.length} atrasadas · {taskDeviations.length} desviaciones
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen financiero + Estado de tareas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resumen financiero */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Resumen financiero</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500">Mano de obra</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">{formatCurrency(spentLabor)}</div>
                <div className="text-xs text-slate-400 mt-0.5">presup: {formatCurrency(plannedLabor)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Materiales</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">{formatCurrency(spentMaterials)}</div>
                <div className="text-xs text-slate-400 mt-0.5">presup: {formatCurrency(plannedMaterials)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">{formatCurrency(totalSpent)}</div>
                <div className="text-xs text-slate-400 mt-0.5">presup: {formatCurrency(totalPlanned)}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-slate-600">{finalizadaCount} finalizadas</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-slate-600">{enCursoCount} en curso</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">{pendienteCount} pendientes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" /> Equipo asignado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {obra.memberIds.map(mid => {
                const m = members.find(x => x.id === mid);
                if (!m) return null;
                const assigned = obraTasks.filter(t => t.assigneeIds.includes(m.id)).length;
                return (
                  <div key={mid} className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback style={{ background: m.avatarColor }} className="text-white text-[10px] font-semibold">
                        {m.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-900 truncate">{m.name}</div>
                      <div className="text-[10px] text-slate-500 capitalize">{m.role.replace(/_/g, ' ')}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{assigned} tareas</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximas tareas + Alertas de desviación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximas tareas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Próximas tareas a iniciar</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveView('task_list')}>
                Ver todas <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingTasks.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No hay tareas próximas</div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map(t => {
                  const daysToStart = differenceInCalendarDays(parseISO(t.startDate), now);
                  return (
                    <button
                      key={t.id}
                      onClick={() => openTaskModal(t.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition text-left"
                    >
                      <div className="w-1 h-9 rounded-full" style={{ background: obra.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-900 truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Inicia {format(parseISO(t.startDate), "dd MMM", { locale: es })} · {t.guild || 'Sin gremio'}
                        </div>
                      </div>
                      <Badge className={cn('text-[10px]', PRIORITY_COLORS[t.priority])}>{t.priority}</Badge>
                      <span className="text-[10px] text-slate-500 shrink-0">en {daysToStart}d</span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas de desviación */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Desviaciones financieras
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveView('finanzas')}>
                Ver finanzas <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {taskDeviations.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">Sin desviaciones</div>
            ) : (
              <div className="space-y-2">
                {taskDeviations.map(t => (
                  <button
                    key={t.id}
                    onClick={() => openTaskModal(t.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition text-left"
                  >
                    {t.deviation > 0 ? (
                      <TrendingUp className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-900 truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Presup: {formatCurrency(t.planned)} · Real: {formatCurrency(t.real)}
                      </div>
                    </div>
                    <Badge className={cn('text-[10px]', t.deviation > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>
                      {t.deviation > 0 ? '+' : ''}{Math.round(t.deviationPct)}%
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pedidos próximos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" /> Pedidos de materiales próximos
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveView('kanban')}>
              Ver kanban <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {upcomingMaterials.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">No hay pedidos próximos</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {upcomingMaterials.map(m => {
                const daysToOrder = differenceInCalendarDays(parseISO(m.computedDate!), now);
                return (
                  <div key={m.id} className="border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition">
                    <div className="text-xs font-medium text-slate-900 truncate" title={m.name}>{m.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{m.quantity} {m.unit} · {formatCurrency(m.totalCost)}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Tarea: {m.taskName}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge className="bg-orange-50 text-orange-700 text-[10px]">
                        <Bell className="w-2.5 h-2.5 mr-1" /> en {daysToOrder}d
                      </Badge>
                      <span className="text-[10px] text-slate-500 capitalize">{m.kanbanStatus}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
