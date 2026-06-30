'use client';

import { useAppStore, formatCurrency } from '@/lib/store';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Calendar, TrendingUp, MessageSquare, Wallet, FileText, Package,
  Plus, Trash2, Link2, Paperclip, ImageIcon, FileCheck2, Send, Save,
  AlertCircle, Download, Upload, Mail, MessageCircle, Bell
} from 'lucide-react';
import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { computeMaterialScheduledDate } from '@/lib/store';
import type { DependencyType, Document, Material, ProgressMode } from '@/types';

const PRIORITY_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

const STATUS_OPTIONS = [
  { value: 'no_iniciada', label: 'No iniciada' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'finalizada', label: 'Finalizada' },
];

const GUILDS = ['Albañilería', 'Estructura', 'Plomeros', 'Electricistas', 'Terminaciones', 'Topadores', 'Herrería', 'Carpintería', 'Pintura', 'Climatización'];

const DEP_TYPE_LABELS: Record<DependencyType, string> = {
  FS: 'Fin → Inicio',
  SS: 'Inicio → Inicio',
  FF: 'Fin → Fin',
  SF: 'Inicio → Fin',
};

export function TaskEditModal() {
  const {
    isTaskModalOpen, editingTaskId, closeTaskModal, tasks, members, dependencies,
    updateTask, deleteTask, addDependency, deleteDependency, comments, addComment,
    materials, addMaterial, updateMaterial, deleteMaterial, sendMaterialToKanban,
    obras, currentUser,
  } = useAppStore();

  const task = tasks.find(t => t.id === editingTaskId);
  const obra = obras.find(o => o.id === task?.obraId);
  const [activeTab, setActiveTab] = useState('fechas');
  const [newComment, setNewComment] = useState('');

  if (!task || !obra) return null;

  const taskComments = comments.filter(c => c.taskId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const taskMaterials = materials.filter(m => m.taskId === task.id);
  const taskDeps = dependencies.filter(d => d.fromTaskId === task.id || d.toTaskId === task.id);
  const isSubtarea = task.parentId !== null;
  const otherTasks = tasks.filter(t => t.obraId === task.obraId && t.id !== task.id);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment(task.id, newComment.trim());
    setNewComment('');
  };

  return (
    <Dialog open={isTaskModalOpen} onOpenChange={(o) => !o && closeTaskModal()}>
      <DialogContent className="max-w-5xl p-0 gap-0 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">
                  {isSubtarea ? 'Subtarea' : 'Tarea'}
                </Badge>
                {task.guild && <Badge variant="outline" className="text-[10px]">{task.guild}</Badge>}
                {task.repercussionPercent !== undefined && (
                  <Badge variant="outline" className="text-[10px]">{task.repercussionPercent}% cert.</Badge>
                )}
              </div>
              <DialogTitle className="text-lg">{task.name}</DialogTitle>
              <DialogDescription className="text-xs">
                {obra.name} · {format(parseISO(task.startDate), "dd MMM yyyy", { locale: es })} - {format(parseISO(task.endDate), "dd MMM yyyy", { locale: es })}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <Badge className="bg-orange-50 text-orange-700 text-[10px]">{task.progress}%</Badge>
              <Button variant="ghost" size="sm" className="text-red-600 h-8" onClick={() => {
                if (confirm('¿Eliminar tarea?')) { deleteTask(task.id); closeTaskModal(); }
              }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="justify-start bg-transparent border-b border-slate-200 rounded-none px-4 h-auto p-0">
            <TabsTrigger value="fechas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs gap-1.5 py-2.5 px-3">
              <Calendar className="w-3.5 h-3.5" /> Fechas y Deps
            </TabsTrigger>
            <TabsTrigger value="avance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs gap-1.5 py-2.5 px-3">
              <TrendingUp className="w-3.5 h-3.5" /> Avance
            </TabsTrigger>
            <TabsTrigger value="comentarios" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs gap-1.5 py-2.5 px-3">
              <MessageSquare className="w-3.5 h-3.5" /> Comentarios
              {taskComments.length > 0 && <Badge className="bg-slate-200 text-slate-600 text-[9px] px-1 py-0 h-3.5 min-w-3.5 flex items-center justify-center">{taskComments.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="financiera" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs gap-1.5 py-2.5 px-3">
              <Wallet className="w-3.5 h-3.5" /> Financiera
            </TabsTrigger>
            <TabsTrigger value="documentacion" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs gap-1.5 py-2.5 px-3">
              <FileText className="w-3.5 h-3.5" /> Documentación
              {task.documents.length > 0 && <Badge className="bg-slate-200 text-slate-600 text-[9px] px-1 py-0 h-3.5 min-w-3.5 flex items-center justify-center">{task.documents.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="materiales" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs gap-1.5 py-2.5 px-3">
              <Package className="w-3.5 h-3.5" /> Materiales
              {taskMaterials.length > 0 && <Badge className="bg-slate-200 text-slate-600 text-[9px] px-1 py-0 h-3.5 min-w-3.5 flex items-center justify-center">{taskMaterials.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* ================================================================ */}
            {/* TAB: FECHAS Y DEPENDENCIAS */}
            {/* ================================================================ */}
            <TabsContent value="fechas" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Fecha de inicio</Label>
                  <Input
                    type="date"
                    value={task.startDate}
                    onChange={e => {
                      const newStart = e.target.value;
                      const dur = differenceInCalendarDays(parseISO(task.endDate), parseISO(task.startDate));
                      const newEnd = format(addDays(parseISO(newStart), dur), 'yyyy-MM-dd');
                      updateTask(task.id, { startDate: newStart, endDate: newEnd });
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Fecha de finalización</Label>
                  <Input
                    type="date"
                    value={task.endDate}
                    min={task.startDate}
                    onChange={e => updateTask(task.id, { endDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 rounded-lg p-3">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Duración</div>
                  <div className="text-base font-semibold text-slate-900">
                    {differenceInCalendarDays(parseISO(task.endDate), parseISO(task.startDate)) + 1} días
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Días transcurridos</div>
                  <div className="text-base font-semibold text-slate-900">
                    {Math.max(0, Math.min(differenceInCalendarDays(parseISO(task.endDate), parseISO(task.startDate)) + 1,
                      differenceInCalendarDays(new Date(), parseISO(task.startDate)) + 1))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Días restantes</div>
                  <div className="text-base font-semibold text-slate-900">
                    {Math.max(0, differenceInCalendarDays(parseISO(task.endDate), new Date()))}
                  </div>
                </div>
              </div>

              {/* Estado, prioridad, gremio */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={task.status} onValueChange={v => updateTask(task.id, { status: v as any })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Prioridad</Label>
                  <Select value={task.priority} onValueChange={v => updateTask(task.id, { priority: v as any })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Gremio</Label>
                  <Select value={task.guild || 'none'} onValueChange={v => updateTask(task.id, { guild: v === 'none' ? undefined : v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin gremio</SelectItem>
                      {GUILDS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* % de repercusión (solo subtareas con gremio) */}
              {isSubtarea && task.guild && (
                <div>
                  <Label className="text-xs">% Repercusión sobre el gremio (para certificados)</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[task.repercussionPercent || 0]}
                      onValueChange={([v]) => updateTask(task.id, { repercussionPercent: v })}
                      min={0} max={100} step={5}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold w-12 text-right">{task.repercussionPercent || 0}%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Este porcentaje indica qué parte del total del gremio representa esta subtarea en los certificados de avance.
                  </p>
                </div>
              )}

              {/* Responsables */}
              <div>
                <Label className="text-xs">Responsables</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {obra.memberIds.map(mid => {
                    const m = members.find(x => x.id === mid);
                    if (!m) return null;
                    const selected = task.assigneeIds.includes(mid);
                    return (
                      <button
                        key={mid}
                        type="button"
                        onClick={() => updateTask(task.id, {
                          assigneeIds: selected
                            ? task.assigneeIds.filter(x => x !== mid)
                            : [...task.assigneeIds, mid],
                        })}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition',
                          selected ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        )}
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

              {/* Dependencias */}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold">Dependencias</Label>
                  <span className="text-[10px] text-slate-500">{taskDeps.length} dependencias</span>
                </div>
                <AddDependencyForm taskId={task.id} otherTasks={otherTasks} onAdd={addDependency} />

                {taskDeps.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {taskDeps.map(dep => {
                      const isFrom = dep.fromTaskId === task.id;
                      const otherTask = otherTasks.find(t => t.id === (isFrom ? dep.toTaskId : dep.fromTaskId));
                      if (!otherTask) return null;
                      return (
                        <div key={dep.id} className="flex items-center gap-2 p-2 rounded-md bg-slate-50 text-xs">
                          <Link2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-600">
                            {isFrom ? 'Esta tarea' : otherTask.name}
                          </span>
                          <Badge variant="outline" className="text-[10px]">{DEP_TYPE_LABELS[dep.type]}</Badge>
                          {dep.lagDays !== 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`}
                            </Badge>
                          )}
                          <span className="text-slate-600">
                            {isFrom ? otherTask.name : 'esta tarea'}
                          </span>
                          <button
                            onClick={() => deleteDependency(dep.id)}
                            className="ml-auto text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ================================================================ */}
            {/* TAB: AVANCE */}
            {/* ================================================================ */}
            <TabsContent value="avance" className="mt-0 space-y-4">
              <div>
                <Label className="text-xs">Modo de cálculo de avance</Label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => updateTask(task.id, { progressMode: 'time' })}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition',
                      task.progressMode === 'time' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-700" />
                      <span className="text-sm font-medium text-slate-900">Según avance del tiempo</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Calcula automáticamente el % en base a los días transcurridos sobre el total.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTask(task.id, { progressMode: 'manual', manualProgress: task.manualProgress ?? task.progress })}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition',
                      task.progressMode === 'manual' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-700" />
                      <span className="text-sm font-medium text-slate-900">Manual</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Permite ingresar manualmente el % cuando no es proporcional al tiempo.
                    </p>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700">Avance actual</span>
                  <span className="text-2xl font-bold text-slate-900">{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-3" />
                {task.progressMode === 'time' && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    Calculado automáticamente: {differenceInCalendarDays(new Date(), parseISO(task.startDate))} de {differenceInCalendarDays(parseISO(task.endDate), parseISO(task.startDate)) + 1} días transcurridos.
                  </p>
                )}
              </div>

              {task.progressMode === 'manual' && (
                <div>
                  <Label className="text-xs">Ajustar avance manualmente</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Slider
                      value={[task.manualProgress ?? 0]}
                      onValueChange={([v]) => updateTask(task.id, { manualProgress: v })}
                      min={0} max={100} step={5}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={task.manualProgress ?? 0}
                      onChange={e => updateTask(task.id, { manualProgress: Math.max(0, Math.min(100, Number(e.target.value))) })}
                      className="w-20"
                      min={0} max={100}
                    />
                  </div>
                </div>
              )}

              <Card className="p-3 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-2 text-xs text-blue-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>Importante:</strong> Si la tarea tiene subtareas, el avance de la tarea padre puede calcularse como promedio de sus subtareas.
                    Las tareas con modo "tiempo" se actualizan automáticamente cada día.
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* ================================================================ */}
            {/* TAB: COMENTARIOS */}
            {/* ================================================================ */}
            <TabsContent value="comentarios" className="mt-0">
              <div className="flex flex-col h-[400px]">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {taskComments.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-8">
                      No hay comentarios. Inicia la conversación.
                    </div>
                  ) : (
                    taskComments.map(c => {
                      const author = members.find(m => m.id === c.authorId);
                      const isMe = c.authorId === currentUser.id;
                      return (
                        <div key={c.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback style={{ background: author?.avatarColor }} className="text-white text-[10px] font-semibold">
                              {author?.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn('max-w-[75%]', isMe && 'text-right')}>
                            <div className="text-[10px] text-slate-500 mb-0.5">
                              {author?.name} · {format(parseISO(c.createdAt), "dd MMM HH:mm", { locale: es })}
                            </div>
                            <div className={cn(
                              'inline-block px-3 py-2 rounded-lg text-xs',
                              isMe ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-800'
                            )}>
                              {c.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                  <Input
                    placeholder="Escribe un comentario..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                    <Send className="w-3.5 h-3.5 mr-1" /> Enviar
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ================================================================ */}
            {/* TAB: FINANCIERA */}
            {/* ================================================================ */}
            <TabsContent value="financiera" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Presupuestado */}
                <Card className="p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-3">Presupuestado</div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Mano de obra</Label>
                      <Input
                        type="number"
                        value={task.laborCost || ''}
                        onChange={e => updateTask(task.id, { laborCost: Number(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Materiales</Label>
                      <Input
                        type="number"
                        value={task.materialsCost || ''}
                        onChange={e => updateTask(task.id, { materialsCost: Number(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(task.laborCost + task.materialsCost)}</span>
                    </div>
                  </div>
                </Card>

                {/* Real */}
                <Card className="p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-3">Costo real</div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Mano de obra</Label>
                      <Input
                        type="number"
                        value={task.realLaborCost || ''}
                        onChange={e => updateTask(task.id, { realLaborCost: Number(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Materiales</Label>
                      <Input
                        type="number"
                        value={task.realMaterialsCost || ''}
                        onChange={e => updateTask(task.id, { realMaterialsCost: Number(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency((task.realLaborCost || 0) + (task.realMaterialsCost || 0))}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Desviación */}
              <Card className="p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase mb-3">Análisis de desviación</div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">Presupuestado</div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">{formatCurrency(task.laborCost + task.materialsCost)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Real</div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">{formatCurrency((task.realLaborCost || 0) + (task.realMaterialsCost || 0))}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Desviación $</div>
                    {(() => {
                      const planned = task.laborCost + task.materialsCost;
                      const real = (task.realLaborCost || 0) + (task.realMaterialsCost || 0);
                      const dev = real - planned;
                      return (
                        <div className={cn('text-sm font-semibold mt-1', dev > 0 ? 'text-red-600' : dev < 0 ? 'text-emerald-600' : 'text-slate-900')}>
                          {dev > 0 ? '+' : ''}{formatCurrency(dev)}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Desviación %</div>
                    {(() => {
                      const planned = task.laborCost + task.materialsCost;
                      const real = (task.realLaborCost || 0) + (task.realMaterialsCost || 0);
                      const pct = planned > 0 ? ((real - planned) / planned) * 100 : 0;
                      return (
                        <div className={cn('text-sm font-semibold mt-1', pct > 0 ? 'text-red-600' : pct < 0 ? 'text-emerald-600' : 'text-slate-900')}>
                          {pct > 0 ? '+' : ''}{Math.round(pct)}%
                        </div>
                      );
                    })()}
                  </div>
                </div>
                {(() => {
                  const planned = task.laborCost + task.materialsCost;
                  const real = (task.realLaborCost || 0) + (task.realMaterialsCost || 0);
                  const dev = real - planned;
                  if (Math.abs(dev) < 1) return null;
                  return (
                    <div className={cn('mt-3 p-2 rounded-md text-xs flex items-center gap-2',
                      dev > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {dev > 0
                          ? `Esta tarea supera el presupuesto en ${formatCurrency(Math.abs(dev))}.`
                          : `Esta tarea está ${formatCurrency(Math.abs(dev))} por debajo del presupuesto.`}
                      </span>
                    </div>
                  );
                })()}
              </Card>
            </TabsContent>

            {/* ================================================================ */}
            {/* TAB: DOCUMENTACIÓN */}
            {/* ================================================================ */}
            <TabsContent value="documentacion" className="mt-0">
              <DocumentationTab taskId={task.id} documents={task.documents} />
            </TabsContent>

            {/* ================================================================ */}
            {/* TAB: MATERIALES */}
            {/* ================================================================ */}
            <TabsContent value="materiales" className="mt-0">
              <MaterialsTab taskId={task.id} obraId={task.obraId} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={closeTaskModal}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Sub-componente: Agregar dependencia
// ============================================================================
function AddDependencyForm({ taskId, otherTasks, onAdd }: {
  taskId: string;
  otherTasks: any[];
  onAdd: (dep: any) => void;
}) {
  const [depTaskId, setDepTaskId] = useState('');
  const [depType, setDepType] = useState<DependencyType>('FS');
  const [lagDays, setLagDays] = useState(0);

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
      <Link2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <Select value={depTaskId} onValueChange={setDepTaskId}>
        <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Seleccionar tarea..." /></SelectTrigger>
        <SelectContent>
          {otherTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={depType} onValueChange={(v) => setDepType(v as DependencyType)}>
        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="FS">Fin → Inicio</SelectItem>
          <SelectItem value="SS">Inicio → Inicio</SelectItem>
          <SelectItem value="FF">Fin → Fin</SelectItem>
          <SelectItem value="SF">Inicio → Fin</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={lagDays}
        onChange={e => setLagDays(Number(e.target.value))}
        className="h-8 w-20 text-xs"
        placeholder="Lag (d)"
      />
      <Button
        size="sm"
        className="h-8"
        disabled={!depTaskId}
        onClick={() => {
          onAdd({ fromTaskId: taskId, toTaskId: depTaskId, type: depType, lagDays });
          setDepTaskId(''); setDepType('FS'); setLagDays(0);
        }}
      >
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ============================================================================
// Sub-componente: Documentación
// ============================================================================
function DocumentationTab({ taskId, documents }: { taskId: string; documents: Document[] }) {
  const { updateTask, currentUser, tasks } = useAppStore();
  const task = tasks.find(t => t.id === taskId)!;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<Document['type']>('informe');

  const handleAddDoc = () => {
    if (!newDocName.trim()) return;
    const newDoc: Document = {
      id: `d${Date.now()}`,
      name: newDocName,
      type: newDocType,
      url: '#',
      size: Math.floor(Math.random() * 5000000) + 100000,
      uploadedAt: new Date().toISOString(),
      uploadedById: currentUser.id,
    };
    updateTask(taskId, { documents: [...task.documents, newDoc] });
    setNewDocName('');
  };

  const ICONS: Record<Document['type'], any> = {
    plano: FileText, foto: ImageIcon, contrato: FileCheck2, informe: FileText, otro: Paperclip,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
        <Select value={newDocType} onValueChange={(v) => setNewDocType(v as any)}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="plano">Plano</SelectItem>
            <SelectItem value="foto">Foto</SelectItem>
            <SelectItem value="contrato">Contrato</SelectItem>
            <SelectItem value="informe">Informe</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Nombre del documento (ej: Plano estructura.pdf)"
          value={newDocName}
          onChange={e => setNewDocName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddDoc()}
          className="flex-1 h-8 text-xs"
        />
        <Button size="sm" className="h-8" onClick={handleAddDoc} disabled={!newDocName.trim()}>
          <Upload className="w-3.5 h-3.5 mr-1" /> Agregar
        </Button>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" />

      {documents.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-8">
          No hay documentación cargada para esta tarea.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {documents.map(doc => {
            const Icon = ICONS[doc.type];
            const uploader = useAppStore.getState().members.find(m => m.id === doc.uploadedById);
            return (
              <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-md border border-slate-200 hover:border-slate-300 transition">
                <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-900 truncate">{doc.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {doc.type} · {(doc.size / 1024 / 1024).toFixed(1)} MB · {format(parseISO(doc.uploadedAt), "dd MMM yyyy", { locale: es })}
                  </div>
                </div>
                <button
                  onClick={() => updateTask(taskId, { documents: task.documents.filter(d => d.id !== doc.id) })}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-componente: Materiales (con scheduling + kanban + notificaciones)
// ============================================================================
function MaterialsTab({ taskId, obraId }: { taskId: string; obraId: string }) {
  const { materials, addMaterial, updateMaterial, deleteMaterial, sendMaterialToKanban, members, tasks, obras, currentUser } = useAppStore();
  const task = tasks.find(t => t.id === taskId)!;
  const obra = obras.find(o => o.id === obraId)!;
  const taskMaterials = materials.filter(m => m.taskId === taskId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', quantity: 1, unit: 'unidad', unitCost: 0,
    supplier: '', scheduleMode: 'relative' as 'specific' | 'relative',
    scheduledDate: '', relativeOffsetDays: -30,
    channels: ['app'] as ('app' | 'email' | 'whatsapp')[],
    notifyMemberIds: [] as string[],
  });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addMaterial({
      ...form,
      taskId,
      obraId,
      quantity: Number(form.quantity) || 0,
      unitCost: Number(form.unitCost) || 0,
      totalCost: (Number(form.quantity) || 0) * (Number(form.unitCost) || 0),
    });
    setForm({
      name: '', description: '', quantity: 1, unit: 'unidad', unitCost: 0,
      supplier: '', scheduleMode: 'relative', scheduledDate: '', relativeOffsetDays: -30,
      channels: ['app'], notifyMemberIds: [],
    });
    setShowForm(false);
  };

  const toggleChannel = (ch: 'app' | 'email' | 'whatsapp') => {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }));
  };

  const toggleMember = (id: string) => {
    setForm(f => ({
      ...f,
      notifyMemberIds: f.notifyMemberIds.includes(id) ? f.notifyMemberIds.filter(x => x !== id) : [...f.notifyMemberIds, id],
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {taskMaterials.length} materiales · Total: {formatCurrency(taskMaterials.reduce((s, m) => s + m.totalCost, 0))}
        </p>
        <Button size="sm" variant={showForm ? 'outline' : 'default'} onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> {showForm ? 'Cancelar' : 'Agregar material'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 border-orange-200 bg-orange-50/30 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Nombre del material *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Ladrillo común 18x18x35" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Proveedor</Label>
              <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Cantidad</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Unidad</Label>
              <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="unidad, m2, kg..." className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Costo unitario</Label>
              <Input type="number" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: Number(e.target.value) })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Total</Label>
              <div className="h-8 flex items-center text-sm font-semibold">
                {formatCurrency((Number(form.quantity) || 0) * (Number(form.unitCost) || 0))}
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="border-t border-slate-200 pt-3">
            <Label className="text-xs font-semibold">Programación del pedido</Label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <button
                type="button"
                onClick={() => setForm({ ...form, scheduleMode: 'relative' })}
                className={cn('p-2.5 rounded-md border-2 text-left transition',
                  form.scheduleMode === 'relative' ? 'border-orange-400 bg-white' : 'border-slate-200 hover:border-slate-300')}
              >
                <div className="text-xs font-medium">Relativo a la tarea</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Ej: 1 mes antes del inicio. Se ajusta si se mueve la tarea.</p>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, scheduleMode: 'specific' })}
                className={cn('p-2.5 rounded-md border-2 text-left transition',
                  form.scheduleMode === 'specific' ? 'border-orange-400 bg-white' : 'border-slate-200 hover:border-slate-300')}
              >
                <div className="text-xs font-medium">Fecha específica</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Una fecha fija en el calendario.</p>
              </button>
            </div>
            {form.scheduleMode === 'specific' ? (
              <div className="mt-2">
                <Label className="text-xs">Fecha del pedido</Label>
                <Input type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} className="h-8 text-xs mt-1" />
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <Label className="text-xs whitespace-nowrap">Offset (días)</Label>
                <Input type="number" value={form.relativeOffsetDays} onChange={e => setForm({ ...form, relativeOffsetDays: Number(e.target.value) })} className="h-8 w-24 text-xs" />
                <span className="text-xs text-slate-500">
                  {form.relativeOffsetDays < 0
                    ? `${Math.abs(form.relativeOffsetDays)} días antes del inicio de la tarea (${format(parseISO(task.startDate), "dd MMM yyyy", { locale: es })})`
                    : form.relativeOffsetDays === 0
                      ? 'El día del inicio de la tarea'
                      : `${form.relativeOffsetDays} días después del inicio`}
                </span>
              </div>
            )}
          </div>

          {/* Notificaciones */}
          <div className="border-t border-slate-200 pt-3">
            <Label className="text-xs font-semibold">Notificaciones</Label>
            <div className="flex items-center gap-2 mt-1.5">
              {[
                { id: 'app' as const, label: 'App', icon: Bell },
                { id: 'email' as const, label: 'Email', icon: Mail },
                { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle },
              ].map(ch => {
                const Icon = ch.icon;
                const sel = form.channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition',
                      sel ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-600')}
                  >
                    <Icon className="w-3 h-3" /> {ch.label}
                  </button>
                );
              })}
            </div>
            <Label className="text-xs mt-3 block">Destinatarios</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {obra.memberIds.map(mid => {
                const m = members.find(x => x.id === mid);
                if (!m) return null;
                const sel = form.notifyMemberIds.includes(mid);
                return (
                  <button
                    key={mid}
                    type="button"
                    onClick={() => toggleMember(mid)}
                    className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border transition',
                      sel ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-600')}
                  >
                    <span className="w-4 h-4 rounded-full text-white text-[8px] font-semibold flex items-center justify-center" style={{ background: m.avatarColor }}>
                      {m.initials}
                    </span>
                    {m.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleAdd} disabled={!form.name.trim()}>
              <Save className="w-3.5 h-3.5 mr-1" /> Guardar material
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de materiales existentes */}
      {taskMaterials.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-8">
          No hay materiales cargados para esta tarea.
        </div>
      ) : (
        <div className="space-y-2">
          {taskMaterials.map(m => {
            const schedDate = computeMaterialScheduledDate(m, task);
            return (
              <Card key={m.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-900">{m.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{m.kanbanStatus}</Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {m.quantity} {m.unit} × {formatCurrency(m.unitCost)} = <span className="font-semibold text-slate-700">{formatCurrency(m.totalCost)}</span>
                      {m.supplier && <span> · {m.supplier}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                      <Bell className="w-3 h-3 text-orange-500" />
                      <span className="text-slate-600">
                        {m.scheduleMode === 'specific'
                          ? `Pedido programado: ${schedDate ? format(parseISO(schedDate), "dd MMM yyyy", { locale: es }) : 'sin fecha'}`
                          : `${Math.abs(m.relativeOffsetDays || 0)} días antes del inicio de la tarea · ${schedDate ? format(parseISO(schedDate), "dd MMM yyyy", { locale: es }) : ''}`}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">
                        Notificar: {m.channels.join(', ')} → {m.notifyMemberIds.length} personas
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {m.kanbanStatus === 'pendiente' && m.sentToKanbanAt === undefined && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => sendMaterialToKanban(m.id)}
                      >
                        <Bell className="w-3 h-3 mr-1" /> Enviar al Kanban
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-red-600"
                      onClick={() => deleteMaterial(m.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
