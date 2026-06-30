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
import { useAppStore } from '@/lib/store';
import { formatISO, addDays } from 'date-fns';

const COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#64748b'];

const iso = (d: Date) => formatISO(d, { representation: 'complete' }).slice(0, 10);

export function AddObraDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addObra, members, setSelectedObra } = useAppStore();
  const [form, setForm] = useState({
    name: '', client: '', address: '', description: '',
    startDate: iso(new Date()), endDate: iso(addDays(new Date(), 180)),
    budget: 0, color: COLORS[0],
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const id = `o${Date.now()}`;
    addObra({
      ...form,
      memberIds: [members[0].id],
      budget: Number(form.budget) || 0,
    });
    setSelectedObra(id);
    setForm({
      name: '', client: '', address: '', description: '',
      startDate: iso(new Date()), endDate: iso(addDays(new Date(), 180)),
      budget: 0, color: COLORS[0],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva obra</DialogTitle>
          <DialogDescription>Complete los datos básicos de la nueva obra.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Edificio Residencial..." />
          </div>
          <div>
            <Label htmlFor="client">Cliente</Label>
            <Input id="client" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startDate">Inicio</Label>
              <Input id="startDate" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="endDate">Fin estimado</Label>
              <Input id="endDate" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="budget">Presupuesto (ARS)</Label>
            <Input id="budget" type="number" value={form.budget || ''} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-1.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition ${form.color === c ? 'border-slate-900 scale-110' : 'border-white'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="desc">Descripción</Label>
            <Textarea id="desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()}>Crear obra</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
