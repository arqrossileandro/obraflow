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
  ArrowUpRight, ArrowDownRight, BarChart3, CheckCircle2, Clock
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
  Legend, LineChart, Line, ComposedChart, ReferenceLine, Area
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

  // Datos para la Curva S (acumulado planificado vs real por período)
  const sCurveData = useMemo(() => {
    if (obraTasks.length === 0 || !obra) return [];
    return cashFlowData.map((row, i) => {
      const prev = cashFlowData.slice(0, i);
      const prevPlanned = prev.reduce((s, r) => s + r.total, 0);
      const prevReal = prev.reduce((s, r) => s + r.realTotal, 0);
      return {
        ...row,
        plannedAcc: prevPlanned + row.total,
        realAcc: prevReal + row.realTotal,
      };
    });
  }, [cashFlowData, obraTasks, obra]);

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
  type AlertSeverity = 'high' | 'critical' | 'medium';
  const alerts: { severity: AlertSeverity; title: string; message: string }[] = [];
  if (totalDeviation > 0) {
    alerts.push({
      severity: 'high',
      title: 'Obra sobre presupuesto',
      message: `La obra supera el presupuesto planificado en ${formatCurrency(totalDeviation)} (${Math.round(totalDeviationPct)}%).`,
    });
  }
  if (budgetPct > 80) {
    alerts.push({
      severity: budgetPct > 100 ? 'critical' : 'high',
      title: 'Presupuesto de obra',
      message: `Se ha ejecutado el ${Math.round(budgetPct)}% del presupuesto total de la obra.`,
    });
  }
  taskDeviations.filter(t => t.deviationPct > 10).forEach(t => {
    alerts.push({
      severity: 'medium',
      title: `Desviación en: ${t.name}`,
      message: `Supera el planificado en ${formatCurrency(Math.abs(t.deviation))} (${Math.round(t.deviationPct)}%).`,
    });
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Finanzas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{obra.name}</p>
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
            <div className="text-xs text-muted-foreground">Presupuesto de obra</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(obra.budget)}</div>
            <div className="mt-2">
              <Progress value={Math.min(100, budgetPct)} className="h-1.5" />
              <div className="text-[10px] text-muted-foreground mt-1">{Math.round(budgetPct)}% ejecutado</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total planificado</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(totalPlanned)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              MO: {formatCurrency(totalPlannedLabor)} · Mat: {formatCurrency(totalPlannedMaterials)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total real ejecutado</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(totalReal)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              MO: {formatCurrency(totalRealLabor)} · Mat: {formatCurrency(totalRealMaterials)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Desviación total</div>
            <div className={cn('text-xl font-bold mt-1', totalDeviation > 0 ? 'text-destructive' : 'text-emerald-600')}>
              {totalDeviation > 0 ? '+' : ''}{formatCurrency(totalDeviation)}
            </div>
            <div className={cn('text-[10px] mt-1 font-semibold', totalDeviation > 0 ? 'text-destructive' : 'text-emerald-600')}>
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
                    a.severity === 'critical' ? 'bg-red-500' : a.severity === 'high' ? 'bg-primary' : 'bg-amber-500')} />
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
              <BarChart3 className="w-4 h-4 text-muted-foreground" /> Cash flow proyectado vs real
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">Vista {period === 'semana' ? 'semanal' : period === 'quincena' ? 'quincenal' : 'mensual'}</span>
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
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary" /> Mano de obra</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-500" /> Materiales</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-emerald-600" /> Total planif.</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-destructive" /> Total real</span>
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
              <thead className="sticky top-0 bg-card border-b border-border text-[10px] uppercase text-muted-foreground font-semibold">
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
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-1.5 px-2 font-medium">{row.label}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{formatCurrency(row.labor)}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{formatCurrency(row.materials)}</td>
                      <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(row.total)}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{formatCurrency(row.realLabor)}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{formatCurrency(row.realMaterials)}</td>
                      <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(row.realTotal)}</td>
                      <td className={cn('py-1.5 px-2 text-right font-semibold',
                        dev > 0 ? 'text-destructive' : dev < 0 ? 'text-emerald-600' : 'text-muted-foreground/70')}>
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
            <TrendingUp className="w-4 h-4 text-muted-foreground" /> Análisis de desviaciones por tarea
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {taskDeviations.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground/70 py-8">No hay tareas con costos reales registrados.</div>
          ) : (
            <div className="space-y-2">
              {taskDeviations.map(t => (
                <button
                  key={t.id}
                  onClick={() => openTaskModal(t.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/30 transition text-left"
                >
                  {t.deviation > 0 ? (
                    <TrendingUp className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Planif: {formatCurrency(t.planned)} · Real: {formatCurrency(t.real)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground/70">MO</div>
                      <div className={cn('font-medium', t.laborDev > 0 ? 'text-destructive' : t.laborDev < 0 ? 'text-emerald-600' : 'text-muted-foreground/70')}>
                        {t.laborDev !== 0 ? (t.laborDev > 0 ? '+' : '') + formatCurrency(t.laborDev) : '-'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground/70">Materiales</div>
                      <div className={cn('font-medium', t.materialsDev > 0 ? 'text-destructive' : t.materialsDev < 0 ? 'text-emerald-600' : 'text-muted-foreground/70')}>
                        {t.materialsDev !== 0 ? (t.materialsDev > 0 ? '+' : '') + formatCurrency(t.materialsDev) : '-'}
                      </div>
                    </div>
                    <Badge className={cn('text-[10px]',
                      t.deviationPct > 10 ? 'bg-red-100 text-destructive' :
                      t.deviationPct < -10 ? 'bg-emerald-100 text-emerald-700' :
                      'bg-muted text-foreground')}>
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
              <div key={i} className="flex items-center justify-between p-2.5 rounded-md border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground">{p.gremio} - {p.periodo}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Vencimiento: {format(parseISO(p.fecha), "dd MMM yyyy", { locale: es })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-foreground">{formatCurrency(p.monto)}</div>
                  <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50">Pendiente</Badge>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border font-semibold">
              <span className="text-xs text-foreground">Total a pagar en la quincena</span>
              <span className="text-base text-foreground">{formatCurrency(244500)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === HERRAMIENTAS AVANZADAS DE ANÁLISIS FINANCIERO === */}

      {/* Curva S (S-Curve) - Planificado vs Real acumulado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Curva S - Avance financiero acumulado
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">Planificado vs Real (acumulado)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ fontSize: 11, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area dataKey="plannedAcc" name="Planificado acum." stroke="#22c55e" fill="#22c55e20" strokeWidth={2} />
                <Line dataKey="realAcc" name="Real acum." stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            La Curva S compara el costo acumulado planificado contra el real. Si la línea roja está por encima de la verde, la obra va sobre presupuesto.
          </p>
        </CardContent>
      </Card>

      {/* Gestión del Valor Ganado (EVM) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Análisis de Valor Ganado (EVM)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {(() => {
              // PV = Budgeted Cost of Work Scheduled (planificado hasta hoy)
              // EV = Budgeted Cost of Work Performed (planificado de lo ejecutado)
              // AC = Actual Cost of Work Performed (real ejecutado)
              const now = new Date();
              let pv = 0, ev = 0, ac = 0;
              obraTasks.forEach(t => {
                const start = parseISO(t.startDate);
                const end = parseISO(t.endDate);
                const taskDur = Math.max(1, differenceInCalendarDays(end, start));
                const plannedTotal = t.laborCost + t.materialsCost;
                const realTotal = (t.realLaborCost || 0) + (t.realMaterialsCost || 0);
                // PV: fracción planificada hasta hoy
                if (now >= end) pv += plannedTotal;
                else if (now > start) pv += plannedTotal * (differenceInCalendarDays(now, start) / taskDur);
                // EV: fracción planificada del progreso real
                ev += plannedTotal * (t.progress / 100);
                // AC: costo real ejecutado
                ac += realTotal;
              });
              const cpi = ac > 0 ? ev / ac : 0; // Cost Performance Index
              const spi = pv > 0 ? ev / pv : 0; // Schedule Performance Index
              const cv = ev - ac; // Cost Variance
              const sv = ev - pv; // Schedule Variance
              const eac = cpi > 0 ? totalPlanned / cpi : 0; // Estimate at Completion
              const etc = eac - ac; // Estimate to Complete
              const vac = totalPlanned - eac; // Variance at Completion

              return (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-md bg-muted/30">
                      <div className="text-[10px] text-muted-foreground">PV (Planif.)</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(pv)}</div>
                    </div>
                    <div className="p-2 rounded-md bg-muted/30">
                      <div className="text-[10px] text-muted-foreground">EV (Ganado)</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(ev)}</div>
                    </div>
                    <div className="p-2 rounded-md bg-muted/30">
                      <div className="text-[10px] text-muted-foreground">AC (Real)</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(ac)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-md border border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-muted-foreground">CPI (Cost Performance)</div>
                          <div className={cn('text-lg font-bold mt-0.5', cpi >= 1 ? 'text-emerald-600' : 'text-red-600')}>{cpi.toFixed(2)}</div>
                        </div>
                        {cpi >= 1 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">CV: {formatCurrency(cv)}</div>
                      <p className="text-[9px] text-muted-foreground mt-1">{cpi >= 1 ? 'Por debajo del presupuesto' : 'Sobre presupuesto'}</p>
                    </div>
                    <div className="p-3 rounded-md border border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-muted-foreground">SPI (Schedule)</div>
                          <div className={cn('text-lg font-bold mt-0.5', spi >= 1 ? 'text-emerald-600' : 'text-amber-600')}>{spi.toFixed(2)}</div>
                        </div>
                        {spi >= 1 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-amber-500" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">SV: {formatCurrency(sv)}</div>
                      <p className="text-[9px] text-muted-foreground mt-1">{spi >= 1 ? 'Adelantado' : 'Atrasado'}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-muted/30 border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">Proyección a la finalización</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-[9px] text-muted-foreground">EAC (Est. Final)</div>
                        <div className="text-sm font-semibold text-foreground">{formatCurrency(eac)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground">ETC (Falta gastar)</div>
                        <div className="text-sm font-semibold text-foreground">{formatCurrency(etc)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground">VAC (Desv. Final)</div>
                        <div className={cn('text-sm font-semibold', vac >= 0 ? 'text-emerald-600' : 'text-red-600')}>{vac >= 0 ? '+' : ''}{formatCurrency(vac)}</div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Resumen por gremio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Costos por gremio
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {(() => {
              const guildStats: Record<string, { planned: number; real: number; count: number }> = {};
              obraTasks.filter(t => t.parentId === null && t.guild).forEach(t => {
                const g = t.guild!;
                if (!guildStats[g]) guildStats[g] = { planned: 0, real: 0, count: 0 };
                guildStats[g].planned += t.laborCost + t.materialsCost;
                guildStats[g].real += (t.realLaborCost || 0) + (t.realMaterialsCost || 0);
                guildStats[g].count++;
              });
              const sorted = Object.entries(guildStats).sort((a, b) => b[1].planned - a[1].planned);
              const maxPlanned = Math.max(...sorted.map(([, v]) => v.planned), 1);
              return (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {sorted.map(([guild, stats]) => {
                    const dev = stats.real - stats.planned;
                    const devPct = stats.planned > 0 ? (dev / stats.planned) * 100 : 0;
                    return (
                      <div key={guild} className="p-2.5 rounded-md border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{guild}</span>
                          <span className="text-[10px] text-muted-foreground">{stats.count} tareas</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
                            <div className="absolute h-full bg-primary/40 rounded-full" style={{ width: `${(stats.planned / maxPlanned) * 100}%` }} />
                            <div className="absolute h-full bg-primary rounded-full" style={{ width: `${(stats.real / maxPlanned) * 100}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Plan: {formatCurrency(stats.planned)}</span>
                          <span className="text-muted-foreground">Real: {formatCurrency(stats.real)}</span>
                          <Badge className={cn('text-[9px]', dev > 0 ? 'bg-red-100 text-red-700' : dev < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                            {dev > 0 ? '+' : ''}{Math.round(devPct)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Ratios financieros y salud de la obra */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" /> Ratios financieros y salud de la obra
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(() => {
            const remainingBudget = obra.budget - totalReal;
            const budgetBurnRate = totalReal / Math.max(1, differenceInCalendarDays(new Date(), parseISO(obra.startDate))); // gastado por día
            const daysToFinish = differenceInCalendarDays(parseISO(obra.endDate), new Date());
            const projectedFinalCost = totalReal + (budgetBurnRate * Math.max(0, daysToFinish));
            const budgetUtilization = (totalReal / obra.budget) * 100;
            const timeUtilization = (differenceInCalendarDays(new Date(), parseISO(obra.startDate)) / Math.max(1, differenceInCalendarDays(parseISO(obra.endDate), parseISO(obra.startDate)))) * 100;
            const healthScore = Math.max(0, Math.min(100, 100 - Math.abs(totalDeviationPct) - Math.abs(timeUtilization - budgetUtilization)));

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-md border border-border">
                  <div className="text-[10px] text-muted-foreground">Presupuesto restante</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(remainingBudget)}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{Math.round(100 - budgetUtilization)}% disponible</div>
                </div>
                <div className="p-3 rounded-md border border-border">
                  <div className="text-[10px] text-muted-foreground">Tasa de consumo</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(budgetBurnRate)}/día</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Gastado por día</div>
                </div>
                <div className="p-3 rounded-md border border-border">
                  <div className="text-[10px] text-muted-foreground">Costo proyectado final</div>
                  <div className={cn('text-sm font-semibold mt-0.5', projectedFinalCost > obra.budget ? 'text-red-600' : 'text-emerald-600')}>{formatCurrency(projectedFinalCost)}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{projectedFinalCost > obra.budget ? `Excede en ${formatCurrency(projectedFinalCost - obra.budget)}` : 'Dentro de presupuesto'}</div>
                </div>
                <div className="p-3 rounded-md border border-border">
                  <div className="text-[10px] text-muted-foreground">Salud financiera</div>
                  <div className={cn('text-sm font-semibold mt-0.5', healthScore >= 80 ? 'text-emerald-600' : healthScore >= 50 ? 'text-amber-600' : 'text-red-600')}>
                    {Math.round(healthScore)}/100
                  </div>
                  <div className="mt-1.5">
                    <Progress value={healthScore} className="h-1.5" />
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Comparativo: consumo de tiempo vs presupuesto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Consumo: Tiempo vs Presupuesto
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(() => {
            const now = new Date();
            const startDate = parseISO(obra.startDate);
            const endDate = parseISO(obra.endDate);
            const totalDays = differenceInCalendarDays(endDate, startDate) || 1;
            const elapsedDays = Math.max(0, differenceInCalendarDays(now, startDate));
            const timePct = Math.min(100, (elapsedDays / totalDays) * 100);
            const budgetPctCalc = Math.min(100, (totalReal / obra.budget) * 100);
            const diff = budgetPctCalc - timePct;
            return (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Tiempo transcurrido</span>
                    <span className="font-medium text-foreground">{Math.round(timePct)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${timePct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Presupuesto ejecutado</span>
                    <span className="font-medium text-foreground">{Math.round(budgetPctCalc)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', diff > 5 ? 'bg-red-500' : 'bg-emerald-500')} style={{ width: `${budgetPctCalc}%` }} />
                  </div>
                </div>
                <div className={cn('p-2.5 rounded-md text-xs flex items-center gap-2',
                  Math.abs(diff) <= 5 ? 'bg-emerald-50 text-emerald-700' : diff > 5 ? 'bg-red-50 text-red-700' : 'bg-sky-50 text-sky-700')}>
                  {Math.abs(diff) <= 5 ? <CheckCircle2 className="w-4 h-4" /> : diff > 5 ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  <span>
                    {Math.abs(diff) <= 5
                      ? `Consumo equilibrado: el gasto (${Math.round(budgetPctCalc)}%) coincide con el tiempo transcurrido (${Math.round(timePct)}%).`
                      : diff > 5
                        ? `Gasto por encima del tiempo: se ejecutó ${Math.round(diff)}% más del presupuesto que el tiempo transcurrido. Riesgo de exceder el presupuesto.`
                        : `Tiempo por encima del gasto: transcurrió ${Math.round(-diff)}% más de tiempo que el gasto. La obra podría estar subejecutada o atrasada.`}
                  </span>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
