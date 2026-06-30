'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  UserPlus, Mail, Phone, Pencil, Trash2, Search, Users, X
} from 'lucide-react';
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'jefe_de_obra', label: 'Jefe de obra' },
  { value: 'capataz', label: 'Capataz' },
  { value: 'colaborador', label: 'Colaborador' },
];

const COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#64748b'];

export function MembersView() {
  const { members, obras, tasks, addMember, updateMember, deleteMember, currentUser } = useAppStore();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'colaborador' as string, color: COLORS[0],
  });

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addMember({
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role as any,
      avatarColor: form.color,
    });
    setForm({ name: '', email: '', phone: '', role: 'colaborador', color: COLORS[0] });
    setAddOpen(false);
  };

  const getMemberStats = (id: string) => {
    const assignedTasks = tasks.filter(t => t.assigneeIds.includes(id));
    const obrasCount = new Set(assignedTasks.map(t => t.obraId)).size;
    return { tasks: assignedTasks.length, obras: obrasCount };
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Miembros del equipo</h2>
          <p className="text-xs text-slate-500 mt-0.5">{members.length} miembros registrados</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1" /> Agregar miembro
        </Button>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(m => {
          const stats = getMemberStats(m.id);
          const isMe = m.id === currentUser.id;
          const isEditing = editingId === m.id;
          return (
            <Card key={m.id} className={cn('overflow-hidden', isMe && 'border-orange-300')}>
              <div className="h-1.5" style={{ background: m.avatarColor }} />
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback style={{ background: m.avatarColor }} className="text-white text-sm font-semibold">
                      {m.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-slate-900 truncate">{m.name}</div>
                      {isMe && <Badge className="text-[9px] bg-orange-100 text-orange-700">Tú</Badge>}
                    </div>
                    <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                      {ROLES.find(r => r.value === m.role)?.label}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  {m.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{m.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{stats.tasks}</div>
                    <div className="text-[10px] text-slate-500">tareas asignadas</div>
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-900">{stats.obras}</div>
                    <div className="text-[10px] text-slate-500">obras activas</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => setEditingId(isEditing ? null : m.id)}
                  >
                    <Pencil className="w-3 h-3 mr-1" /> {isEditing ? 'Cerrar' : 'Editar'}
                  </Button>
                  {!isMe && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-600"
                      onClick={() => confirm('¿Eliminar miembro?') && deleteMember(m.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div>
                      <Label className="text-[10px]">Nombre</Label>
                      <Input value={m.name} onChange={e => updateMember(m.id, { name: e.target.value })} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Email</Label>
                      <Input value={m.email} onChange={e => updateMember(m.id, { email: e.target.value })} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Teléfono</Label>
                      <Input value={m.phone || ''} onChange={e => updateMember(m.id, { phone: e.target.value })} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Rol</Label>
                      <Select value={m.role} onValueChange={v => updateMember(m.id, { role: v as any })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Color</Label>
                      <div className="flex gap-1 mt-1">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => updateMember(m.id, { avatarColor: c })}
                            className={cn('w-5 h-5 rounded-full border-2', m.avatarColor === c ? 'border-slate-900 scale-110' : 'border-white')}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal agregar miembro */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar miembro</DialogTitle>
            <DialogDescription>Complete los datos del nuevo miembro del equipo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre completo</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+54 11 5555-0000" />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color de avatar</Label>
              <div className="flex gap-2 mt-1.5">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={cn('w-7 h-7 rounded-full border-2', form.color === c ? 'border-slate-900 scale-110' : 'border-white')}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim()}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
