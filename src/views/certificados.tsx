'use client';

import { useAppStore, formatCurrency, getRootTasks, getSubtasks } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Plus, FileCheck2, Users, TrendingUp, Download, Printer, ChevronRight
} from 'lucide-react';
import { format, parseISO, subDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

export function CertificadosView() {
  const { obras, tasks, selectedObraId, members, openTaskModal } = useAppStore();
  const obra = obras.find(o => o.id === selectedObraId);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 15), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Gremios disponibles (de tareas raíz con guild) - hooks deben ir antes de cualquier return
  const guilds = useMemo(() => {
    if (!obra) return [];
    const rootTasks = getRootTasks(tasks, obra.id);
    return Array.from(new Set(rootTasks.filter(t => t.guild).map(t => t.guild!)));
  }, [tasks, obra]);

  if (!obra) return null;

  const effectiveGuild = selectedGuild || guilds[0] || '';

  // Tarea raíz asociada al gremio
  const guildTask = getRootTasks(tasks, obra.id).find(t => t.guild === effectiveGuild);
  // Subtareas con % de repercusión
  const subtasks = guildTask ? getSubtasks(tasks, guildTask.id).filter(st => st.repercussionPercent !== undefined) : [];

  // Calcular líneas del certificado
  const certificateLines = subtasks.map(st => {
    const totalAmount = (st.laborCost + st.materialsCost); // monto proporcional
    // Previous progress: para el mock, asumimos que es el 70% del actual (en real sería histórico)
    const previousProgress = Math.max(0, st.progress - 15);
    const periodProgress = st.progress - previousProgress;
    const amountToPay = (totalAmount * periodProgress) / 100;
    return {
      subtareaId: st.id,
      subtareaName: st.name,
      repercussionPercent: st.repercussionPercent || 0,
      previousProgress,
      currentProgress: st.progress,
      periodProgress,
      totalAmount,
      amountToPay,
    };
  });

  const totalToPay = certificateLines.reduce((s, l) => s + l.amountToPay, 0);
  const totalGuild = guildTask ? guildTask.laborCost + guildTask.materialsCost : 0;
  const totalRepercussion = certificateLines.reduce((s, l) => s + l.repercussionPercent, 0);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Certificados de Avance</h2>
          <p className="text-xs text-slate-500 mt-0.5">{obra.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1" /> Exportar PDF</Button>
          <Button variant="outline" size="sm"><Printer className="w-3.5 h-3.5 mr-1" /> Imprimir</Button>
        </div>
      </div>

      {/* Selectores */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 font-medium">Gremio</label>
            <Select value={effectiveGuild} onValueChange={setSelectedGuild}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar gremio" /></SelectTrigger>
              <SelectContent>
                {guilds.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Período desde</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="mt-1 w-full h-9 px-3 border border-slate-200 rounded-md text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Período hasta</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="mt-1 w-full h-9 px-3 border border-slate-200 rounded-md text-sm" />
          </div>
          <div className="flex items-end">
            <Button className="w-full"><FileCheck2 className="w-4 h-4 mr-1" /> Generar certificado</Button>
          </div>
        </div>
      </Card>

      {/* Info del gremio */}
      {guildTask && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <div className="text-xs text-slate-500">Gremio</div>
            <div className="text-lg font-semibold mt-1">{effectiveGuild}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Tarea: {guildTask.name}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-slate-500">Monto total del gremio</div>
            <div className="text-lg font-semibold mt-1">{formatCurrency(totalGuild)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Presupuestado</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-slate-500">% Repercusión distribuido</div>
            <div className="text-lg font-semibold mt-1">{totalRepercussion}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{certificateLines.length} subtareas certificables</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-slate-500">Monto a pagar este período</div>
            <div className="text-lg font-semibold mt-1 text-emerald-700">{formatCurrency(totalToPay)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{format(parseISO(periodStart), "dd MMM", { locale: es })} - {format(parseISO(periodEnd), "dd MMM", { locale: es })}</div>
          </CardContent></Card>
        </div>
      )}

      {/* Tabla de certificados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Detalle del certificado de avance</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {certificateLines.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8">
              No hay subtareas certificables. Asigne % de repercusión a las subtareas del gremio.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-[11px] uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="text-left py-2 px-2">Subtarea</th>
                    <th className="text-center py-2 px-2 w-[80px]">% Reperc.</th>
                    <th className="text-center py-2 px-2 w-[100px]">Avance anterior</th>
                    <th className="text-center py-2 px-2 w-[100px]">Avance actual</th>
                    <th className="text-center py-2 px-2 w-[100px]">Δ Período</th>
                    <th className="text-right py-2 px-2 w-[120px]">Monto total</th>
                    <th className="text-right py-2 px-2 w-[140px]">A pagar este período</th>
                  </tr>
                </thead>
                <tbody>
                  {certificateLines.map(line => (
                    <tr key={line.subtareaId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-2">
                        <button onClick={() => openTaskModal(line.subtareaId)} className="text-xs font-medium text-slate-900 hover:text-orange-600 flex items-center gap-1">
                          {line.subtareaName} <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="outline" className="text-[10px]">{line.repercussionPercent}%</Badge>
                      </td>
                      <td className="py-2 px-2 text-center text-xs text-slate-600">{line.previousProgress}%</td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center gap-1.5">
                          <Progress value={line.currentProgress} className="h-1.5 flex-1" />
                          <span className="text-[11px] font-medium w-8 text-right">{line.currentProgress}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Badge className={cn('text-[10px]', line.periodProgress > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                          +{line.periodProgress}%
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right text-xs text-slate-700">{formatCurrency(line.totalAmount)}</td>
                      <td className="py-2 px-2 text-right text-sm font-semibold text-emerald-700">{formatCurrency(line.amountToPay)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={5} className="py-3 px-2 text-right text-xs uppercase text-slate-600">Total a pagar</td>
                    <td className="py-3 px-2 text-right text-xs text-slate-500">{formatCurrency(certificateLines.reduce((s, l) => s + l.totalAmount, 0))}</td>
                    <td className="py-3 px-2 text-right text-base font-bold text-emerald-700">{formatCurrency(totalToPay)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gremios y responsables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" /> Gremios de la obra
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {guilds.map(g => {
                const gTask = getRootTasks(tasks, obra.id).find(t => t.guild === g);
                const gSubtasks = gTask ? getSubtasks(tasks, gTask.id) : [];
                const gTotal = gTask ? gTask.laborCost + gTask.materialsCost : 0;
                const gProgress = gTask?.progress || 0;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGuild(g)}
                    className={cn('w-full flex items-center gap-3 p-2.5 rounded-md border transition text-left',
                      g === effectiveGuild ? 'border-orange-300 bg-orange-50' : 'border-slate-200 hover:bg-slate-50')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{g}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {gSubtasks.length} subtareas · {formatCurrency(gTotal)} total
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{gProgress}%</Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" /> Resumen de certificados previos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {[
                { period: '2026 Junio - Quincena 2', amount: 187500, status: 'pagado' },
                { period: '2026 Junio - Quincena 1', amount: 165000, status: 'pagado' },
                { period: '2026 Mayo - Quincena 2', amount: 142000, status: 'pagado' },
                { period: '2026 Mayo - Quincena 1', amount: 98000, status: 'pagado' },
              ].map((cert, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-md border border-slate-200">
                  <div>
                    <div className="text-xs font-medium text-slate-900">{cert.period}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Certificado de avance</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{formatCurrency(cert.amount)}</div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{cert.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
