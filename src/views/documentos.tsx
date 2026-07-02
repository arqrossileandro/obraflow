'use client';

import { useAppStore, formatCurrency } from '@/lib/store';
import type { Document, Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FolderOpen, FileText, ImageIcon, FileCheck2, Paperclip, Download,
  Trash2, Search, ArrowUpDown, Calendar, User, Folder
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

type SortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'type' | 'task';
type FilterType = 'all' | Document['type'];

const DOC_ICONS: Record<Document['type'], any> = {
  plano: FileText,
  foto: ImageIcon,
  contrato: FileCheck2,
  informe: FileText,
  otro: Paperclip,
};

const DOC_TYPE_LABELS: Record<Document['type'], string> = {
  plano: 'Plano',
  foto: 'Foto',
  contrato: 'Contrato',
  informe: 'Informe',
  otro: 'Otro',
};

const DOC_TYPE_COLORS: Record<Document['type'], string> = {
  plano: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  foto: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  contrato: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  informe: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  otro: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function DocumentosView() {
  const { obras, tasks, selectedObraId, openTaskModal, updateTask, members, currentUser } = useAppStore();
  const obra = obras.find(o => o.id === selectedObraId);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date_desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterTask, setFilterTask] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'task' | 'type' | 'month'>('none');

  // Recopilar todos los documentos de las tareas de la obra
  const allDocs = useMemo(() => {
    if (!obra) return [];
    const result: Array<{ doc: Document; task: Task }> = [];
    tasks
      .filter(t => t.obraId === obra.id)
      .forEach(t => {
        t.documents.forEach(d => result.push({ doc: d, task: t }));
      });
    return result;
  }, [tasks, obra]);

  // Filtrar
  let filtered = allDocs.filter(({ doc, task }) => {
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'all' && doc.type !== filterType) return false;
    if (filterTask !== 'all' && task.id !== filterTask) return false;
    return true;
  });

  // Ordenar
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'date_desc') return b.doc.uploadedAt.localeCompare(a.doc.uploadedAt);
    if (sortBy === 'date_asc') return a.doc.uploadedAt.localeCompare(b.doc.uploadedAt);
    if (sortBy === 'name_asc') return a.doc.name.localeCompare(b.doc.name);
    if (sortBy === 'name_desc') return b.doc.name.localeCompare(a.doc.name);
    if (sortBy === 'type') return a.doc.type.localeCompare(b.doc.type);
    if (sortBy === 'task') return a.task.name.localeCompare(b.task.name);
    return 0;
  });

  // Agrupar
  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'Todos', items: filtered }];
    const map = new Map<string, typeof filtered>();
    filtered.forEach(item => {
      let key = '';
      if (groupBy === 'task') key = item.task.name;
      else if (groupBy === 'type') key = DOC_TYPE_LABELS[item.doc.type];
      else if (groupBy === 'month') key = format(parseISO(item.doc.uploadedAt), "MMMM yyyy", { locale: es });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [filtered, groupBy]);

  // Stats por tipo
  const stats = useMemo(() => {
    const map: Record<string, number> = {};
    allDocs.forEach(({ doc }) => {
      map[doc.type] = (map[doc.type] || 0) + 1;
    });
    return map;
  }, [allDocs]);

  if (!obra) return null;

  const handleDeleteDoc = (taskId: string, docId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    updateTask(taskId, { documents: task.documents.filter(d => d.id !== docId) });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Documentación</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{obra.name} · {allDocs.length} archivos en total</p>
        </div>
      </div>

      {/* Stats por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['plano', 'foto', 'contrato', 'informe', 'otro'] as const).map(type => {
          const Icon = DOC_ICONS[type];
          return (
            <Card key={type}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', DOC_TYPE_COLORS[type])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{stats[type] || 0}</div>
                  <div className="text-[10px] text-muted-foreground">{DOC_TYPE_LABELS[type]}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar archivo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="plano">Planos</SelectItem>
              <SelectItem value="foto">Fotos</SelectItem>
              <SelectItem value="contrato">Contratos</SelectItem>
              <SelectItem value="informe">Informes</SelectItem>
              <SelectItem value="otro">Otros</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTask} onValueChange={setFilterTask}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Tarea" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las tareas</SelectItem>
              {tasks.filter(t => t.obraId === obra.id && t.documents.length > 0).map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Más recientes primero</SelectItem>
              <SelectItem value="date_asc">Más antiguos primero</SelectItem>
              <SelectItem value="name_asc">Nombre A-Z</SelectItem>
              <SelectItem value="name_desc">Nombre Z-A</SelectItem>
              <SelectItem value="type">Por tipo</SelectItem>
              <SelectItem value="task">Por tarea</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Agrupar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin agrupar</SelectItem>
              <SelectItem value="task">Agrupar por tarea</SelectItem>
              <SelectItem value="type">Agrupar por tipo</SelectItem>
              <SelectItem value="month">Agrupar por mes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Lista de documentos */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <div className="text-sm font-medium text-foreground">No hay documentos</div>
            <div className="text-xs text-muted-foreground mt-1">
              {allDocs.length === 0
                ? 'Los documentos que cargues en las tareas aparecerán aquí.'
                : 'No se encontraron documentos con los filtros aplicados.'}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.key}>
              {groupBy !== 'none' && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{group.key}</span>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">{group.items.length}</Badge>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map(({ doc, task }) => {
                  const Icon = DOC_ICONS[doc.type];
                  const uploader = members.find(m => m.id === doc.uploadedById);
                  return (
                    <Card key={`${task.id}-${doc.id}`} className="hover:shadow-md transition-shadow group">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', DOC_TYPE_COLORS[doc.type])}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate" title={doc.name}>{doc.name}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge className={cn('text-[9px]', DOC_TYPE_COLORS[doc.type])}>{DOC_TYPE_LABELS[doc.type]}</Badge>
                              <span className="text-[10px] text-muted-foreground">{(doc.size / 1024 / 1024).toFixed(1)} MB</span>
                            </div>
                            <button
                              onClick={() => openTaskModal(task.id)}
                              className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition"
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.color || obra.color }} />
                              <span className="truncate">{task.name}</span>
                            </button>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {format(parseISO(doc.uploadedAt), "dd MMM yyyy", { locale: es })}
                              </span>
                              {uploader && (
                                <span className="flex items-center gap-1">
                                  <User className="w-2.5 h-2.5" />
                                  {uploader.name.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 text-xs flex-1">
                            <Download className="w-3 h-3 mr-1" /> Descargar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleDeleteDoc(task.id, doc.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
