'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore, getRootTasks } from '@/lib/store';
import { formatISO, addDays } from 'date-fns';
import type { Task } from '@/types';

const iso = (d: Date) => formatISO(d, { representation: 'complete' }).slice(0, 10);

const PRIORITIES = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

const GUILDS = ['Albañilería', 'Estructura', 'Plomeros', 'Electricistas', 'Terminaciones', 'Topadores', 'Herrería', 'Carpintería', 'Pintura', 'Climatización'];

export function AddTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addTask, selectedObraId, tasks, members, obras } = useAppStore();
  const obra = obras.find(o => o.id === selectedObraId);

  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: iso(new Date()),
    endDate: iso(addDays(new Date(), 30)),
    guild: '',
    priority: 'media' as Task['priority'],
    parentId: '',
    assigneeIds: [] as string[],
    laborCost: 0,
    materialsCost: 0,
  });

  if (!obra) return null;

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    addTask({
      obraId: obra.id,
      parentId: form.parentId || null,
      name: form.name,
      description: form.description,
      startDate: form.startDate,
      endDate: form.endDate,
      guild: form.guild || undefined,
      priority: form.priority,
      assigneeIds: form.assigneeIds,
      laborCost: Number(form.laborCost) || 0,
      materialsCost: Number(form.materialsCost) || 0,
    });
    setForm({
      name: '', description: '',
      startDate: iso(new Date()), endDate: iso(addDays(new Date(), 30)),
      guild: '', priority: 'media', parentId: '', assigneeIds: [], laborCost: 0, materialsCost: 0,
    });
    onOpenChange(false);
  };

  const rootTasks = getRootTasks(tasks, obra.id);

  const toggleAssignee = (id: string) => {
    setForm(f => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter(x => x !== id)
        : [...f.assigneeIds, id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>Cree una nueva tarea o subtarea en {obra.name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label htmlFor="t-name">Nombre *</Label>
            <Input id="t-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Mampostería PB" />
          </div>
          <div>
            <Label htmlFor="t-desc">Descripción</Label>
            <Textarea id="t-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-start">Fecha de inicio</Label>
              <Input id="t-start" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="t-end">Fecha de finalización</Label>
              <Input id="t-end" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-parent">Tarea padre (opcional)</Label>
              <Select value={form.parentId} onValueChange={v => setForm({ ...form, parentId: v === 'none' ? '' : v })}>
                <SelectTrigger id="t-parent"><SelectValue placeholder="Tarea raíz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin padre (tarea raíz)</SelectItem>
                  {rootTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="t-guild">Gremio</Label>
              <Select value={form.guild} onValueChange={v => setForm({ ...form, guild: v === 'none' ? '' : v })}>
                <SelectTrigger id="t-guild"><SelectValue placeholder="Sin gremio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin gremio</SelectItem>
                  {GUILDS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-priority">Prioridad</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as any })}>
                <SelectTrigger id="t-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="t-status">Estado inicial</Label>
              <Input value="No iniciada" disabled />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-labor">Costo mano de obra (ARS)</Label>
              <Input id="t-labor" type="number" value={form.laborCost || ''} onChange={e => setForm({ ...form, laborCost: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="t-mat">Costo materiales (ARS)</Label>
              <Input id="t-mat" type="number" value={form.materialsCost || ''} onChange={e => setForm({ ...form, materialsCost: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Responsables</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {obra.memberIds.map(mid => {
                const m = members.find(x => x.id === mid);
                if (!m) return null;
                const selected = form.assigneeIds.includes(mid);
                return (
                  <button
                    key={mid}
                    type="button"
                    onClick={() => toggleAssignee(mid)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition ${
                      selected ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full text-white text-[8px] font-semibold flex items-center justify-center" style={{ background: m.avatarColor }}>
                      {m.initials}
                    </span>
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()}>Crear tarea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
