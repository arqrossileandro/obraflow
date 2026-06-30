'use client';

import { useAppStore, formatCurrency } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Building2, Users, Wallet, Activity, ArrowRight, MapPin, Calendar } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  planificada: { label: 'Planificada', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  en_curso: { label: 'En curso', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  pausada: { label: 'Pausada', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  finalizada: { label: 'Finalizada', cls: 'bg-slate-100 text-slate-500 border-slate-300' },
};

export function OverviewView() {
  const { obras, tasks, members, materials, setSelectedObra, setActiveView } = useAppStore();

  const totalBudget = obras.reduce((s, o) => s + o.budget, 0);
  const totalSpent = tasks.reduce((s, t) => s + (t.realLaborCost || 0) + (t.realMaterialsCost || 0), 0);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'finalizada').length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Vista General</h2>
        <p className="text-sm text-slate-500 mt-0.5">Resumen consolidado de todas las obras activas</p>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Obras activas</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold">{obras.length}</div>
            <div className="text-xs text-slate-500 mt-1">{obras.filter(o => o.status === 'en_curso').length} en curso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Tareas totales</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-sky-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold">{totalTasks}</div>
            <div className="text-xs text-slate-500 mt-1">{completedTasks} finalizadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Presupuesto total</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <div className="text-xs text-slate-500 mt-1">ejecutado: {formatCurrency(totalSpent)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Equipo total</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold">{members.length}</div>
            <div className="text-xs text-slate-500 mt-1">miembros activos</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de obras */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Obras</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map(obra => {
            const obraTasks = tasks.filter(t => t.obraId === obra.id);
            const obraSpent = obraTasks.reduce((s, t) => s + (t.realLaborCost || 0) + (t.realMaterialsCost || 0), 0);
            const obraCompleted = obraTasks.filter(t => t.status === 'finalizada').length;
            const completionRate = obraTasks.length > 0 ? (obraCompleted / obraTasks.length) * 100 : 0;
            const budgetPct = obra.budget > 0 ? (obraSpent / obra.budget) * 100 : 0;
            const now = new Date();
            const daysElapsed = Math.max(0, differenceInCalendarDays(now, parseISO(obra.startDate)));
            const daysTotal = Math.max(1, differenceInCalendarDays(parseISO(obra.endDate), parseISO(obra.startDate)));

            return (
              <Card key={obra.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white" style={{ background: obra.color }}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 truncate" title={obra.name}>{obra.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">{obra.client}</div>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_LABELS[obra.status].cls)}>
                      {STATUS_LABELS[obra.status].label}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{obra.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{format(parseISO(obra.startDate), "dd MMM yyyy", { locale: es })} - {format(parseISO(obra.endDate), "dd MMM yyyy", { locale: es })}</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-500">Avance</span>
                        <span className="font-medium text-slate-700">{Math.round(completionRate)}%</span>
                      </div>
                      <Progress value={completionRate} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-500">Presupuesto</span>
                        <span className={cn('font-medium', budgetPct > 100 ? 'text-red-600' : 'text-slate-700')}>{Math.round(budgetPct)}%</span>
                      </div>
                      <Progress value={Math.min(100, budgetPct)} className="h-1.5" />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500">
                      {obraTasks.length} tareas · {obraCompleted} finalizadas · día {daysElapsed}/{daysTotal}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => { setSelectedObra(obra.id); setActiveView('dashboard'); }}
                    >
                      Abrir <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Resumen de materiales próximos a nivel global */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Materiales pendientes de pedido</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-slate-500">
            {materials.filter(m => m.kanbanStatus === 'pendiente').length} materiales esperando ser pedidos · {materials.filter(m => m.kanbanStatus === 'pedido').length} pedidos en curso · {materials.filter(m => m.kanbanStatus === 'en_transito').length} en tránsito · {materials.filter(m => m.kanbanStatus === 'entregado').length} entregados
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
