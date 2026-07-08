'use client';

import { useAppStore } from '@/lib/store';
import type { ViewKey } from '@/types';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, GanttChartSquare, ListTodo, CalendarDays,
  FileCheck2, Wallet, MessageSquare, KanbanSquare,
  Users, Settings, HardHat, Plus, Building2, Bell,
  Pencil, Trash2, Copy, FolderOpen, Layers
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { AddObraDialog } from './add-obra-dialog';
import { AddTaskDialog } from './add-task-dialog';
import { TemplateDialog } from './template-dialog';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV_ITEMS: { key: ViewKey; label: string; icon: any; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'principal' },
  { key: 'gantt', label: 'Gantt', icon: GanttChartSquare, group: 'principal' },
  { key: 'task_list', label: 'Listado', icon: ListTodo, group: 'principal' },
  { key: 'calendar', label: 'Calendario', icon: CalendarDays, group: 'principal' },
  { key: 'documentos', label: 'Documentación', icon: FolderOpen, group: 'principal' },
  { key: 'certificados', label: 'Certificados', icon: FileCheck2, group: 'control' },
  { key: 'finanzas', label: 'Finanzas', icon: Wallet, group: 'control' },
  { key: 'kanban', label: 'Kanban', icon: KanbanSquare, group: 'control' },
  { key: 'chat', label: 'Chat', icon: MessageSquare, group: 'comunicacion' },
];

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  planificada: { label: 'Planificada', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  en_curso: { label: 'En curso', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  pausada: { label: 'Pausada', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  finalizada: { label: 'Finalizada', cls: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

export function Sidebar() {
  const {
    obras, selectedObraId, setSelectedObra, activeView, setActiveView, tasks, materials,
    deleteObra, addObra, updateObra,
  } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const selectedObra = obras.find(o => o.id === selectedObraId);
  const taskCount = selectedObraId === 'all'
    ? tasks.length
    : tasks.filter(t => t.obraId === selectedObraId).length;
  const pendingMaterials = (selectedObraId === 'all' ? materials : materials.filter(m => m.obraId === selectedObraId))
    .filter(m => m.kanbanStatus === 'pendiente').length;

  const handleDuplicate = (obraId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const original = obras.find(o => o.id === obraId);
    if (!original) return;
    addObra({
      name: `${original.name} (copia)`,
      client: original.client,
      address: original.address,
      startDate: original.startDate,
      endDate: original.endDate,
      budget: original.budget,
      color: original.color,
      description: original.description,
      memberIds: original.memberIds,
      status: 'planificada',
    });
  };

  const handleDelete = (obraId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta obra y todas sus tareas, materiales y mensajes?')) {
      deleteObra(obraId);
    }
  };

  const handleEdit = (obraId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedObra(obraId);
    setActiveView('settings');
  };

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
          <HardHat className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-foreground leading-none text-sm">ObraFlow</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Gestión de Obras</div>
        </div>
      </div>

      {/* Selector de Obra con acciones */}
      <div className="px-3 py-3 border-b border-border">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block px-1">
          Obra seleccionada
        </label>
        <Select
          value={selectedObraId}
          onValueChange={(v) => setSelectedObra(v as any)}
        >
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue placeholder="Seleccionar obra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Vista general (todas)</span>
              </div>
            </SelectItem>
            {obras.map(o => (
              <SelectItem key={o.id} value={o.id}>
                <div className="flex items-center gap-2 w-full">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />
                  <span className="truncate max-w-[180px] flex-1">{o.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1.5 text-xs text-muted-foreground justify-start h-7"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Nueva obra
        </Button>
      </div>

      {/* Info de obra + Acciones rápidas */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        {selectedObra ? (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground truncate" title={selectedObra.name}>{selectedObra.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{selectedObra.client}</div>
              <div className="flex items-center justify-between mt-2">
                <Badge variant="outline" className={cn('text-[10px] py-0 px-1.5', STATUS_LABELS[selectedObra.status].cls)}>
                  {STATUS_LABELS[selectedObra.status].label}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{taskCount} tareas</span>
              </div>
            </div>
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => handleEdit(selectedObra.id, {} as any)}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                title="Editar obra"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleDuplicate(selectedObra.id, e)}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                title="Duplicar obra"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleDelete(selectedObra.id, e)}
                className="p-1 hover:bg-destructive/10 rounded text-destructive"
                title="Eliminar obra"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs font-semibold text-foreground">Vista general</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{obras.length} obras activas · {tasks.length} tareas</div>
          </>
        )}
      </div>

      {/* Botón crear tarea (visible cuando hay obra seleccionada) */}
      {selectedObra && (
        <div className="px-3 py-2 border-b border-border space-y-1.5">
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setAddTaskOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Crear tarea
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            onClick={() => setTemplateOpen(true)}
          >
            <Layers className="w-3.5 h-3.5 mr-1" /> Usar plantilla
          </Button>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {(['principal', 'control', 'comunicacion'] as const).map(group => (
          <div key={group} className="mb-3">
            <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wide px-3 mb-1">
              {group === 'principal' ? 'Principal' : group === 'control' ? 'Control' : 'Comunicación'}
            </div>
            {NAV_ITEMS.filter(i => i.group === group).map(item => {
              const Icon = item.icon;
              const active = activeView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.key === 'kanban' && pendingMaterials > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">{pendingMaterials}</Badge>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Settings y Members en la parte inferior */}
        <div className="border-t border-border mt-3 pt-2 space-y-1">
          <button
            onClick={() => setActiveView('members')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              activeView === 'members' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <Users className={cn('w-4 h-4', activeView === 'members' ? 'text-primary' : 'text-muted-foreground')} />
            <span className="flex-1 text-left">Miembros</span>
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              activeView === 'settings' ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <Settings className={cn('w-4 h-4', activeView === 'settings' ? 'text-primary' : 'text-muted-foreground')} />
            <span className="flex-1 text-left">Configuración</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground/70 text-center">
        ObraFlow v1.1 · Demo
      </div>

      <AddObraDialog open={addOpen} onOpenChange={setAddOpen} />
      <AddTaskDialog open={addTaskOpen} onOpenChange={setAddTaskOpen} />
      <TemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} />
    </aside>
  );
}

export function Topbar() {
  const { obras, selectedObraId, currentUser } = useAppStore();
  const obra = obras.find(o => o.id === selectedObraId);

  return (
    <header className="h-14 border-b border-border bg-card px-5 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">
          {obra ? obra.name : 'Vista General de Obras'}
        </h1>
        {obra && (
          <Badge variant="outline" className="text-xs text-muted-foreground hidden md:inline-flex">
            {obra.address}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Toggle de tema */}
        <ThemeToggle />

        {/* Notificaciones */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative w-9 h-9">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <div className="text-xs font-medium">Material por vencer</div>
              <div className="text-[11px] text-muted-foreground">3 pedidos programados para esta semana</div>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <div className="text-xs font-medium">Desviación financiera</div>
              <div className="text-[11px] text-muted-foreground">La tarea "Fundaciones" supera el presupuesto en 5%</div>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <div className="text-xs font-medium">Tarea atrasada</div>
              <div className="text-[11px] text-muted-foreground">"Vigas de fundación" está retrasada 3 días</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent rounded-md pl-1 pr-2 py-1 transition">
              <Avatar className="w-8 h-8">
                <AvatarFallback style={{ background: currentUser.avatarColor }} className="text-white text-xs font-semibold">
                  {currentUser.initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium text-foreground leading-none">{currentUser.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">{currentUser.role.replace(/_/g, ' ')}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Perfil</DropdownMenuItem>
            <DropdownMenuItem>Preferencias</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
