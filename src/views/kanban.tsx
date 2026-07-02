'use client';

import { useAppStore, formatCurrency, computeMaterialScheduledDate } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  KanbanSquare, Package, Bell, Mail, MessageCircle, ArrowRight, Clock
} from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Material } from '@/types';

const COLUMNS: { key: Material['kanbanStatus']; label: string; color: string; icon: any }[] = [
  { key: 'pendiente', label: 'Pendientes', color: 'border-t-slate-400 bg-muted/30', icon: Clock },
  { key: 'pedido', label: 'Pedidos', color: 'border-t-sky-500 bg-sky-50', icon: Bell },
  { key: 'en_transito', label: 'En tránsito', color: 'border-t-amber-500 bg-amber-50', icon: Package },
  { key: 'entregado', label: 'Entregados', color: 'border-t-emerald-500 bg-emerald-50', icon: Package },
];

export function KanbanView() {
  const { obras, materials, tasks, members, selectedObraId, setMaterialKanbanStatus, openTaskModal } = useAppStore();
  const obra = obras.find(o => o.id === selectedObraId);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  if (!obra) return null;

  const obraMaterials = materials.filter(m => m.obraId === obra.id);
  const now = new Date();

  const getMaterialInfo = (m: Material) => {
    const task = tasks.find(t => t.id === m.taskId);
    const schedDate = computeMaterialScheduledDate(m, task);
    const daysToSched = schedDate ? differenceInCalendarDays(parseISO(schedDate), now) : null;
    return { task, schedDate, daysToSched };
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Kanban de Pedidos de Materiales</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{obra.name} · {obraMaterials.length} materiales cargados</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <KanbanSquare className="w-4 h-4" />
          <span>Arrastra las tarjetas entre columnas para actualizar el estado</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colMaterials = obraMaterials.filter(m => m.kanbanStatus === col.key);
          const colTotal = colMaterials.reduce((s, m) => s + m.totalCost, 0);
          const Icon = col.icon;
          return (
            <div
              key={col.key}
              className={cn('rounded-lg border-t-4 border border-border', col.color)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedId) {
                  setMaterialKanbanStatus(draggedId, col.key);
                  setDraggedId(null);
                }
              }}
            >
              <div className="p-3 border-b border-border bg-card rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{colMaterials.length}</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{formatCurrency(colTotal)}</div>
              </div>

              <div className="p-2 space-y-2 min-h-[200px]">
                {colMaterials.length === 0 ? (
                  <div className="text-center text-[10px] text-muted-foreground/70 py-8">
                    Sin materiales en esta columna
                  </div>
                ) : (
                  colMaterials.map(m => {
                    const { task, schedDate, daysToSched } = getMaterialInfo(m);
                    return (
                      <div
                        key={m.id}
                        draggable
                        onDragStart={() => setDraggedId(m.id)}
                        onDragEnd={() => setDraggedId(null)}
                        className={cn(
                          'bg-card border border-border rounded-md p-3 cursor-move hover:shadow-md transition',
                          draggedId === m.id && 'opacity-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate" title={m.name}>{m.name}</div>
                            {m.supplier && <div className="text-[10px] text-muted-foreground mt-0.5">{m.supplier}</div>}
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">{m.quantity} {m.unit}</Badge>
                        </div>

                        <div className="text-xs font-semibold text-foreground mt-1.5">{formatCurrency(m.totalCost)}</div>

                        {/* Tarea asociada */}
                        {task && (
                          <button
                            onClick={() => openTaskModal(task.id)}
                            className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition w-full text-left"
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: obra.color }} />
                            <span className="truncate">{task.name}</span>
                            <ArrowRight className="w-2.5 h-2.5 ml-auto shrink-0" />
                          </button>
                        )}

                        {/* Fecha programada */}
                        {schedDate && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                            <Clock className="w-3 h-3 text-orange-500" />
                            <span className="text-muted-foreground">
                              {format(parseISO(schedDate), "dd MMM yyyy", { locale: es })}
                            </span>
                            {daysToSched !== null && daysToSched >= 0 && (
                              <Badge className={cn('ml-auto text-[9px]',
                                daysToSched <= 3 ? 'bg-red-100 text-destructive' :
                                daysToSched <= 7 ? 'bg-amber-100 text-amber-700' :
                                'bg-muted text-muted-foreground')}>
                                en {daysToSched}d
                              </Badge>
                            )}
                            {daysToSched !== null && daysToSched < 0 && (
                              <Badge className="ml-auto bg-red-100 text-destructive text-[9px]">
                                {Math.abs(daysToSched)}d atrasado
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Canales de notificación */}
                        {m.channels.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 pt-2 border-t border-border/50">
                            <span className="text-[9px] text-muted-foreground/70">Notif:</span>
                            {m.channels.includes('app') && <Bell className="w-3 h-3 text-muted-foreground" />}
                            {m.channels.includes('email') && <Mail className="w-3 h-3 text-sky-500" />}
                            {m.channels.includes('whatsapp') && <MessageCircle className="w-3 h-3 text-emerald-500" />}
                            <div className="ml-auto flex -space-x-1">
                              {m.notifyMemberIds.slice(0, 2).map(id => {
                                const mem = members.find(x => x.id === id);
                                if (!mem) return null;
                                return (
                                  <Avatar key={id} className="w-4 h-4 border border-white">
                                    <AvatarFallback style={{ background: mem.avatarColor }} className="text-white text-[7px] font-semibold">
                                      {mem.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                              {m.notifyMemberIds.length > 2 && (
                                <div className="w-4 h-4 rounded-full bg-slate-200 border border-white text-[7px] font-semibold text-muted-foreground flex items-center justify-center">
                                  +{m.notifyMemberIds.length - 2}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {COLUMNS.map(col => {
            const colMaterials = obraMaterials.filter(m => m.kanbanStatus === col.key);
            const colTotal = colMaterials.reduce((s, m) => s + m.totalCost, 0);
            return (
              <div key={col.key}>
                <div className="text-xs text-muted-foreground">{col.label}</div>
                <div className="text-lg font-bold text-foreground mt-1">{colMaterials.length}</div>
                <div className="text-[10px] text-muted-foreground">{formatCurrency(colTotal)}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
