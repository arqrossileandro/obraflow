'use client';

import { useAppStore, formatCurrency } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ToggleGroup, ToggleGroupItem
} from '@/components/ui/toggle-group';
import {
  Wallet, TrendingUp, TrendingDown, AlertTriangle, Plus,
  ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';
import {
  format, parseISO, differenceInCalendarDays, addDays, eachWeekOfInterval,
  eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isWithinInterval, subDays
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, LineChart, Line, ComposedChart, ReferenceLine
} from 'recharts';
import type { CashFlowPeriod } from '@/types';

export function FinanzasView() {
  const { obras, tasks, selectedObraId, openTaskModal } = useAppStore();
  const obra = obras.find(o => o.id === selectedObraId);
  const [period, setPeriod] = useState<CashFlowPeriod>('quincena');

  const obraTasks = obra ? tasks.filter(t => t.obraId === obra.id) : [];

  // Generar buckets de tiempo para cash flow
  const cashFlowData = useMemo(() => {
    if (obraTasks.length === 0 || !obra) return [];

    const allStarts = obraTasks.map(t => parseISO(t.startDate));
    const allEnds = obraTasks.map(t => parseISO(t.endDate));
    const minDate = new Date(Math.min(...allStarts.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allEnds.map(d => d.getTime())));

    let buckets: { start: Date; end: Date; label: string }[] = [];
    if (period === 'semana') {
      const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
      buckets = weeks.map(w => ({
        start: w,
        end: endOfWeek(w, { weekStartsOn: 1 }),
        label: `Sem ${format(w, "I/yyyy")}`,
      }));
    } else if (period === 'quincena') {
      let cur = startOfMonth(minDate);
      while (cur <= maxDate) {
        const mStart = startOfMonth(cur);
        const mEnd = endOfMonth(cur);
        buckets.push({
          start: mStart,
          end: addDays(mStart, 14),
          label: `${format(mStart, "MMM yy")} Q1`,
        });
        buckets.push({
          start: addDays(mStart, 15),
          end: mEnd,
          label: `${format(mStart, "MMM yy")} Q2`,
        });
        cur = addDays(mEnd, 1);
      }
    } else {
      const months = eachMonthOfInterval({ start: minDate, end: maxDate });
      buckets = months.map(m => ({
        start: m,
        end: endOfMonth(m),
        label: format(m, "MMM yy", { locale: es }),
      }));
    }

    const out = buckets.map(bucket => {
      let plannedLabor = 0, plannedMaterials = 0, realLabor = 0, realMaterials = 0;
      obraTasks.forEach(t => {
        const tStart = parseISO(t.startDate);
        const tEnd = parseISO(t.endDate);
        const taskDuration = Math.max(1, differenceInCalendarDays(tEnd, tStart));
        const overlapStart = new Date(Math.max(tStart.getTime(), bucket.start.getTime()));
        const overlapEnd = new Date(Math.min(tEnd.getTime(), bucket.end.getTime()));
        if (overlapStart <= overlapEnd) {
          const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1;
          const ratio = overlapDays / taskDuration;
          plannedLabor += t.laborCost * ratio;
          plannedMaterials += t.materialsCost * ratio;
          realLabor += (t.realLaborCost || 0) * ratio;
          realMaterials += (t.realMaterialsCost || 0) * ratio;
        }
      });
      return {
        label: bucket.label,
        labor: Math.round(plannedLabor),
        materials: Math.round(plannedMaterials),
        total: Math.round(plannedLabor + plannedMaterials),
        realLabor: Math.round(realLabor),
        realMaterials: Math.round(realMaterials),
        realTotal: Math.round(realLabor + realMaterials),
      };
    });
    return out;
  }, [obraTasks, period, obra]);

  if (!obra) return null;

  // Calcular totales
  const totalPlannedLabor = obraTasks.reduce((s, t) => s + (t.laborCost || 0), 0);
  const totalPlannedMaterials = obraTasks.reduce((s, t) => s + (t.materialsCost || 0), 0);
  const totalPlanned = totalPlannedLabor + totalPlannedMaterials;

  const totalRealLabor = obraTasks.reduce((s, t) => s + (t.realLaborCost || 0), 0);
  const totalRealMaterials = obraTasks.reduce((s, t) => s + (t.realMaterialsCost || 0), 0);
  const totalReal = totalRealLabor + totalRealMaterials;

  const budgetPct = obra.budget > 0 ? (totalReal / obra.budget) * 100 : 0;
  const plannedPct = totalPlanned > 0 ? (totalReal / totalPlanned) * 100 : 0;

  // Desviaciones por tarea
  const taskDeviations = obraTasks
    .filter(t => t.parentId === null)
    .map(t => {
      const planned = t.laborCost + t.materialsCost;
      const real = (t.realLaborCost || 0) + (t.realMaterialsCost || 0);
      return {
        ...t,
        planned, real,
        deviation: real - planned,
        deviationPct: planned > 0 ? ((real - planned) / planned) * 100 : 0,
        laborDev: (t.realLaborCost || 0) - t.laborCost,
        materialsDev: (t.realMaterialsCost || 0) - t.materialsCost,
      };
    })
    .filter(t => t.real > 0)
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  const totalDeviation = totalReal - totalPlanned;
  const totalDeviationPct = totalPlanned > 0 ? (totalDeviation / totalPlanned) * 100 : 0;

  // Alertas
  const alerts = [];
  if (totalDeviation > 0) {
    alerts.push({
      severity: 'high' as const,
      title: 'Obra sobre presupuesto',
      message: `La obra supera el presupuesto planificado en ${formatCurrency(totalDeviation)} (${Math.round(totalDeviationPct)}%).`,
    });
  }
  if (budgetPct > 80) {
    alerts.push({
      severity: budgetPct > 100 ? 'critical' as const : 'high' as const,
      title: 'Presupuesto de obra',
      message: `Se ha ejecutado el ${Math.round(budgetPct)}% del presupuesto total de la obra.`,
    });
  }
  taskDeviations.filter(t => t.deviationPct > 10).forEach(t => {
    alerts.push({
      severity: 'medium' as const,
      title: `Desviación en: ${t.name}`,
      message: `Supera el planificado en ${formatCurrency(Math.abs(t.deviation))} (${Math.round(t.deviationPct)}%).`,
    });
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Finanzas</h2>
          <p className="text-xs text-slate-500 mt-0.5">{obra.name}</p>
        </div>
        <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v as CashFlowPeriod)} size="sm" className="rounded-md border">
          <ToggleGroupItem value="semana" className="text-xs h-8 px-3">Semanal</ToggleGroupItem>
          <ToggleGroupItem value="quincena" className="text-xs h-8 px-3">Quincenal</ToggleGroupItem>
          <ToggleGroupItem value="mes" className="text-xs h-8 px-3">Mensual</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Presupuesto de obra</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(obra.budget)}</div>
            <div className="mt-2">
              <Progress value={Math.min(100, budgetPct)} className="h-1.5" />
              <div className="text-[10px] text-slate-500 mt-1">{Math.round(budgetPct)}% ejecutado</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Total planificado</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(totalPlanned)}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              MO: {formatCurrency(totalPlannedLabor)} · Mat: {formatCurrency(totalPlannedMaterials)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Total real ejecutado</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(totalReal)}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              MO: {formatCurrency(totalRealLabor)} · Mat: {formatCurrency(totalRealMaterials)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Desviación total</div>
            <div className={cn('text-xl font-bold mt-1', totalDeviation > 0 ? 'text-red-600' : 'text-emerald-600')}>
              {totalDeviation > 0 ? '+' : ''}{formatCurrency(totalDeviation)}
            </div>
            <div className={cn('text-[10px] mt-1 font-semibold', totalDeviation > 0 ? 'text-red-600' : 'text-emerald-600')}>
              {totalDeviation > 0 ? '+' : ''}{Math.round(totalDeviationPct)}% vs planificado
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Alertas financieras ({alerts.length})</span>
            </div>
            <div className="space-y-1.5">
              {alerts.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                  <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                    a.severity === 'critical' ? 'bg-red-500' : a.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500')} />
                  <span><strong>{a.title}:</strong> {a.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Cash Flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500" /> Cash flow proyectado vs real
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Vista {period === 'semana' ? 'semanal' : period === 'quincena' ? 'quincenal' : 'mensual'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="labor" name="MO planif." fill="#f97316" stackId="planned" radius={[0, 0, 0, 0]} />
                <Bar dataKey="materials" name="Mat. planif." fill="#0ea5e9" stackId="planned" radius={[3, 3, 0, 0]} />
                <Line dataKey="realTotal" name="Real total" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                <Line dataKey="total" name="Planif. total" stroke="#16a34a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 mt-2">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> Mano de obra</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-500" /> Materiales</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-emerald-600" /> Total planif.</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-red-600" /> Total real</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabla detallada de cash flow por período */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Detalle por período</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-200 text-[10px] uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="text-left py-2 px-2">Período</th>
                  <th className="text-right py-2 px-2">MO planif.</th>
                  <th className="text-right py-2 px-2">Mat. planif.</th>
                  <th className="text-right py-2 px-2">Total planif.</th>
                  <th className="text-right py-2 px-2">MO real</th>
                  <th className="text-right py-2 px-2">Mat. real</th>
                  <th className="text-right py-2 px-2">Total real</th>
                  <th className="text-right py-2 px-2">Desviación</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowData.map((row, i) => {
                  const dev = row.realTotal - row.total;
                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-1.5 px-2 font-medium">{row.label}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{formatCurrency(row.labor)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{formatCurrency(row.materials)}</td>
                      <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(row.total)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{formatCurrency(row.realLabor)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{formatCurrency(row.realMaterials)}</td>
                      <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(row.realTotal)}</td>
                      <td className={cn('py-1.5 px-2 text-right font-semibold',
                        dev > 0 ? 'text-red-600' : dev < 0 ? 'text-emerald-600' : 'text-slate-400')}>
                        {dev !== 0 ? (dev > 0 ? '+' : '') + formatCurrency(dev) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Análisis de desviaciones por tarea */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" /> Análisis de desviaciones por tarea
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {taskDeviations.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8">No hay tareas con costos reales registrados.</div>
          ) : (
            <div className="space-y-2">
              {taskDeviations.map(t => (
                <button
                  key={t.id}
                  onClick={() => openTaskModal(t.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-md border border-slate-200 hover:bg-slate-50 transition text-left"
                >
                  {t.deviation > 0 ? (
                    <TrendingUp className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{t.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Planif: {formatCurrency(t.planned)} · Real: {formatCurrency(t.real)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400">MO</div>
                      <div className={cn('font-medium', t.laborDev > 0 ? 'text-red-600' : t.laborDev < 0 ? 'text-emerald-600' : 'text-slate-400')}>
                        {t.laborDev !== 0 ? (t.laborDev > 0 ? '+' : '') + formatCurrency(t.laborDev) : '-'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400">Materiales</div>
                      <div className={cn('font-medium', t.materialsDev > 0 ? 'text-red-600' : t.materialsDev < 0 ? 'text-emerald-600' : 'text-slate-400')}>
                        {t.materialsDev !== 0 ? (t.materialsDev > 0 ? '+' : '') + formatCurrency(t.materialsDev) : '-'}
                      </div>
                    </div>
                    <Badge className={cn('text-[10px]',
                      t.deviationPct > 10 ? 'bg-red-100 text-red-700' :
                      t.deviationPct < -10 ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700')}>
                      {t.deviationPct > 0 ? '+' : ''}{Math.round(t.deviationPct)}%
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen de certificados próximos a pagar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Próximos pagos a realizar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {[
              { gremio: 'Plomeros', periodo: '2026 Julio - Quincena 1', monto: 28500, fecha: '2026-07-15' },
              { gremio: 'Albañilería', periodo: '2026 Julio - Quincena 1', monto: 52300, fecha: '2026-07-15' },
              { gremio: 'Estructura', periodo: '2026 Julio - Quincena 1', monto: 145000, fecha: '2026-07-15' },
              { gremio: 'Electricistas', periodo: '2026 Julio - Quincena 1', monto: 18700, fecha: '2026-07-15' },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-md border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-orange-50 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-900">{p.gremio} - {p.periodo}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Vencimiento: {format(parseISO(p.fecha), "dd MMM yyyy", { locale: es })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-slate-900">{formatCurrency(p.monto)}</div>
                  <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50">Pendiente</Badge>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200 font-semibold">
              <span className="text-xs text-slate-700">Total a pagar en la quincena</span>
              <span className="text-base text-slate-900">{formatCurrency(244500)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
