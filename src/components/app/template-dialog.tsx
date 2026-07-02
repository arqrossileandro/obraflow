'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TASK_TEMPLATES, useAppStore, formatCurrency } from '@/lib/store';
import type { TaskTemplate } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Search, Clock, Plus, Check, Layers } from 'lucide-react';
import { format, parseISO, addDays, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';

const iso = (d: Date) => formatISO(d, { representation: 'complete' }).slice(0, 10);

export function TemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { selectedObraId, addTaskFromTemplate } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedTpl, setSelectedTpl] = useState<TaskTemplate | null>(null);
  const [startDate, setStartDate] = useState(iso(new Date()));

  const categories = Array.from(new Set(TASK_TEMPLATES.map(t => t.category)));

  const filtered = TASK_TEMPLATES.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.subtasks.some(st => st.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = () => {
    if (!selectedTpl || selectedObraId === 'all') return;
    addTaskFromTemplate(selectedTpl.id, selectedObraId as string, startDate);
    setSelectedTpl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[90vw] !w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Crear tarea desde plantilla
          </DialogTitle>
          <DialogDescription>
            Seleccioná una plantilla para crear una tarea con sus subtareas, costos y gremio preconfigurados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Lista de plantillas */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar plantilla o subtarea..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {categories.map(cat => {
                const catTemplates = filtered.filter(t => t.category === cat);
                if (catTemplates.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                      {cat}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {catTemplates.map(tpl => {
                        const isSelected = selectedTpl?.id === tpl.id;
                        const totalCost = tpl.subtasks.reduce((s, st) => s + (st.laborCost || 0) + (st.materialsCost || 0), 0);
                        return (
                          <button
                            key={tpl.id}
                            onClick={() => setSelectedTpl(tpl)}
                            className={cn(
                              'text-left p-3 rounded-lg border-2 transition-all',
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border hover:border-primary/40 hover:bg-muted/30'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-2xl shrink-0">{tpl.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground truncate">{tpl.name}</span>
                                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <Badge variant="outline" className="text-[9px]">
                                    <Clock className="w-2.5 h-2.5 mr-0.5" />
                                    {tpl.defaultDurationDays}d
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px]">
                                    {tpl.subtasks.length} subtareas
                                  </Badge>
                                  {tpl.guild && (
                                    <Badge variant="outline" className="text-[9px]" style={{ color: tpl.color, borderColor: tpl.color + '40' }}>
                                      {tpl.guild}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-[9px]">
                                    {formatCurrency(totalCost)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No se encontraron plantillas con "{search}"
                </div>
              )}
            </div>
          </div>

          {/* Panel de detalle de la plantilla seleccionada */}
          {selectedTpl && (
            <aside className="w-80 shrink-0 border-l border-border pl-4 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-3xl">{selectedTpl.icon}</span>
                <div>
                  <div className="text-sm font-bold text-foreground">{selectedTpl.name}</div>
                  <div className="text-[11px] text-muted-foreground">{selectedTpl.category}</div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">{selectedTpl.description}</p>

              <div className="mb-3">
                <Label className="text-xs">Fecha de inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Duración total: {selectedTpl.defaultDurationDays} días · Finaliza el{' '}
                  {format(addDays(parseISO(startDate), selectedTpl.defaultDurationDays), "dd MMM yyyy", { locale: es })}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto -mr-2 pr-2">
                <div className="text-xs font-semibold text-foreground mb-2">Subtareas que se crearán:</div>
                <div className="space-y-1.5">
                  {selectedTpl.subtasks.map((st, i) => {
                    const stStart = addDays(parseISO(startDate), st.offsetDays);
                    const totalCost = (st.laborCost || 0) + (st.materialsCost || 0);
                    return (
                      <div key={i} className="p-2 rounded-md border border-border bg-muted/20">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground">{st.name}</span>
                          {st.repercussionPercent !== undefined && (
                            <Badge variant="outline" className="text-[9px] shrink-0">{st.repercussionPercent}%</Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {format(stStart, "dd MMM", { locale: es })} · {st.durationDays}d
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {formatCurrency(totalCost)}
                          {st.guild && <span> · {st.guild}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 p-2 rounded-md bg-muted/40 border border-border">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total mano de obra:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(selectedTpl.subtasks.reduce((s, st) => s + (st.laborCost || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Total materiales:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(selectedTpl.subtasks.reduce((s, st) => s + (st.materialsCost || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mt-1 pt-1 border-t border-border">
                    <span className="font-semibold text-foreground">Total:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(selectedTpl.subtasks.reduce((s, st) => s + (st.laborCost || 0) + (st.materialsCost || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!selectedTpl || selectedObraId === 'all'}>
            <Plus className="w-4 h-4 mr-1" />
            {selectedTpl ? `Crear "${selectedTpl.name}" con ${selectedTpl.subtasks.length} subtareas` : 'Seleccioná una plantilla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
