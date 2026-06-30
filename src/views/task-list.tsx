'use client';

import { useAppStore, getRootTasks, getSubtasks, formatCurrency } from '@/lib/store';
import type { Task } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus, ChevronDown, ChevronRight, Filter, Search, Calendar, User,
  Pencil, Trash2, ArrowUpDown
} from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState, useMemo, Fragment } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { AddTaskDialog } from '@/components/app/add-task-dialog';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  no_iniciada: { label: 'No iniciada', cls: 'bg-slate-100 text-slate-700' },
  en_curso: { label: 'En curso', cls: 'bg-emerald-100 text-emerald-700' },
  pausada: { label: 'Pausada', cls: 'bg-amber-100 text-amber-700' },
  finalizada: { label: 'Finalizada', cls: 'bg-slate-100 text-slate-500' },
};

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  baja: { label: 'Baja', cls: 'bg-slate-100 text-slate-600' },
  media: { label: 'Media', cls: 'bg-sky-100 text-sky-700' },
  alta: { label: 'Alta', cls: 'bg-orange-100 text-orange-700' },
  critica: { label: 'Crítica', cls: 'bg-red-100 text-red-700' },
};

export function TaskListView() {
  const { obras, tasks, members, selectedObraId, openTaskModal, deleteTask, dependencies, materials } = useAppStore();
  const obra = obras.find(o => o.id === selectedObraId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [guildFilter, setGuildFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'progress' | 'priority'>('date');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!obra) return null;

  const guilds = Array.from(new Set(tasks.filter(t => t.obraId === obra.id && t.guild).map(t => t.guild!)));

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  // Filtrar tareas raíz
  let rootTasks = getRootTasks(tasks, obra.id);
  rootTasks = rootTasks.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (guildFilter !== 'all' && t.guild !== guildFilter) return false;
    if (assigneeFilter !== 'all' && !t.assigneeIds.includes(assigneeFilter)) return false;
    return true;
  });

  // Sort
  const priorityOrder = { critica: 0, alta: 1, media: 2, baja: 3 };
  rootTasks.sort((a, b) => {
    if (sortBy === 'date') return parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'progress') return b.progress - a.progress;
    if (sortBy === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority];
    return 0;
  });

  // Expandir todos por defecto si hay búsqueda
  const effectiveExpanded = search ? new Set(rootTasks.map(t => t.id)) : expanded;

  const getDepCount = (id: string) => dependencies.filter(d => d.fromTaskId === id || d.toTaskId === id).length;
  const getMatCount = (id: string) => materials.filter(m => m.taskId === id).length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Listado de Tareas</h2>
          <p className="text-xs text-slate-500 mt-0.5">{rootTasks.length} tareas · {obra.name}</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nueva tarea
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar tarea..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="no_iniciada">No iniciada</SelectItem>
              <SelectItem value="en_curso">En curso</SelectItem>
              <SelectItem value="pausada">Pausada</SelectItem>
              <SelectItem value="finalizada">Finalizada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={guildFilter} onValueChange={setGuildFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Gremio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los gremios</SelectItem>
              {guilds.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los responsables</SelectItem>
              {members.filter(m => obra.memberIds.includes(m.id)).map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" /> Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('date')}>Por fecha</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('name')}>Por nombre</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('progress')}>Por avance</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('priority')}>Por prioridad</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-semibold">
              <tr>
                <th className="text-left py-2.5 px-3 w-[40px]"></th>
                <th className="text-left py-2.5 px-3">Tarea</th>
                <th className="text-left py-2.5 px-3 w-[140px]">Período</th>
                <th className="text-left py-2.5 px-3 w-[120px]">Avance</th>
                <th className="text-left py-2.5 px-3 w-[100px]">Gremio</th>
                <th className="text-left py-2.5 px-3 w-[120px]">Responsables</th>
                <th className="text-left py-2.5 px-3 w-[110px]">Costo total</th>
                <th className="text-left py-2.5 px-3 w-[110px]">Estado</th>
                <th className="text-left py-2.5 px-3 w-[100px]">Prioridad</th>
                <th className="text-left py-2.5 px-3 w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {rootTasks.map(task => {
                const subtasks = getSubtasks(tasks, task.id);
                const isExpanded = effectiveExpanded.has(task.id);
                const totalCost = task.laborCost + task.materialsCost;
                return (
                  <Fragment key={task.id}>
                    <tr
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => openTaskModal(task.id)}
                    >
                      <td className="py-2 px-3">
                        {subtasks.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggle(task.id); }}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-1 h-5 rounded-full" style={{ background: obra.color }} />
                          <div>
                            <div className="font-medium text-slate-900">{task.name}</div>
                            {task.description && (
                              <div className="text-[11px] text-slate-500 truncate max-w-md">{task.description}</div>
                            )}
                          </div>
                          {getDepCount(task.id) > 0 && (
                            <Badge variant="outline" className="text-[10px] text-slate-500">{getDepCount(task.id)} deps</Badge>
                          )}
                          {getMatCount(task.id) > 0 && (
                            <Badge variant="outline" className="text-[10px] text-slate-500">{getMatCount(task.id)} mat</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-600">
                        {format(parseISO(task.startDate), "dd MMM", { locale: es })} - {format(parseISO(task.endDate), "dd MMM", { locale: es })}
                        <div className="text-[10px] text-slate-400">
                          {differenceInCalendarDays(parseISO(task.endDate), parseISO(task.startDate)) + 1} días
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Progress value={task.progress} className="h-1.5 flex-1" />
                          <span className="text-[11px] font-medium text-slate-700 w-8 text-right">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {task.guild ? <Badge variant="outline" className="text-[10px]">{task.guild}</Badge> : <span className="text-[11px] text-slate-400">-</span>}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex -space-x-1.5">
                          {task.assigneeIds.slice(0, 3).map(id => {
                            const m = members.find(x => x.id === id);
                            if (!m) return null;
                            return (
                              <Avatar key={id} className="w-6 h-6 border-2 border-white">
                                <AvatarFallback style={{ background: m.avatarColor }} className="text-white text-[9px] font-semibold">
                                  {m.initials}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })}
                          {task.assigneeIds.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-[9px] font-semibold text-slate-600 flex items-center justify-center">
                              +{task.assigneeIds.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs font-medium text-slate-700">
                        {formatCurrency(totalCost)}
                        <div className="text-[10px] text-slate-400">
                          MO: {formatCurrency(task.laborCost)} · Mat: {formatCurrency(task.materialsCost)}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={cn('text-[10px]', STATUS_LABELS[task.status].cls)}>
                          {STATUS_LABELS[task.status].label}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={cn('text-[10px]', PRIORITY_LABELS[task.priority].cls)}>
                          {PRIORITY_LABELS[task.priority].label}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => e.stopPropagation()}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openTaskModal(task.id)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(task.id)} className="text-red-600">Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {isExpanded && subtasks.map(st => {
                      const stCost = st.laborCost + st.materialsCost;
                      return (
                        <tr
                          key={st.id}
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer bg-slate-50/30"
                          onClick={() => openTaskModal(st.id)}
                        >
                          <td className="py-2 px-3"></td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2 pl-6">
                              <span className="text-slate-300 text-xs">└</span>
                              <span className="text-slate-700">{st.name}</span>
                              {st.repercussionPercent !== undefined && (
                                <Badge variant="outline" className="text-[10px] text-slate-500">{st.repercussionPercent}% cert.</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-500">
                            {format(parseISO(st.startDate), "dd MMM", { locale: es })} - {format(parseISO(st.endDate), "dd MMM", { locale: es })}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <Progress value={st.progress} className="h-1.5 flex-1" />
                              <span className="text-[11px] font-medium text-slate-600 w-8 text-right">{st.progress}%</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {st.guild ? <Badge variant="outline" className="text-[10px]">{st.guild}</Badge> : <span className="text-[11px] text-slate-400">-</span>}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex -space-x-1.5">
                              {st.assigneeIds.slice(0, 3).map(id => {
                                const m = members.find(x => x.id === id);
                                if (!m) return null;
                                return (
                                  <Avatar key={id} className="w-6 h-6 border-2 border-white">
                                    <AvatarFallback style={{ background: m.avatarColor }} className="text-white text-[9px] font-semibold">
                                      {m.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-600">{formatCurrency(stCost)}</td>
                          <td className="py-2 px-3">
                            <Badge className={cn('text-[10px]', STATUS_LABELS[st.status].cls)}>
                              {STATUS_LABELS[st.status].label}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <Badge className={cn('text-[10px]', PRIORITY_LABELS[st.priority].cls)}>
                              {PRIORITY_LABELS[st.priority].label}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openTaskModal(st.id); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
              {rootTasks.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-slate-400">
                    No se encontraron tareas con los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddTaskDialog open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la tarea, sus subtareas, dependencias, materiales y comentarios asociados. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteId) deleteTask(deleteId); setDeleteId(null); }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
