// ============================================================================
// Sync layer — puente entre Zustand (UI state) y Supabase (fuente de verdad)
// ============================================================================
// Estrategia:
// - On login: fetchAll() carga todo desde Supabase → populando el store
// - On mutation: el store llama a syncX() que escribe a Supabase (optimistic)
// - Realtime: subscriptions actualizan el store cuando otros usuarios cambian datos
// ============================================================================

import { supabase } from '@/lib/supabase';
import type {
  Obra, Task, Dependency, Material, Comment, ChatMessage,
  TaskPhoto, VoiceNote, AppNotification, CACEntry, ID
} from '@/types';

// ============================================================================
// MAPEOS: snake_case (DB) ↔ camelCase (TS)
// ============================================================================
const obraToDB = (o: Partial<Obra>) => ({
  name: o.name,
  client: o.client,
  address: o.address,
  start_date: o.startDate,
  end_date: o.endDate,
  budget: o.budget,
  color: o.color,
  description: o.description,
  status: o.status,
  progress: o.progress,
});

export const obraFromDB = (r: any): Obra => ({
  id: r.id,
  name: r.name,
  client: r.client || '',
  address: r.address || '',
  startDate: r.start_date,
  endDate: r.end_date,
  budget: Number(r.budget || 0),
  color: r.color || '#f97316',
  description: r.description,
  memberIds: r.member_ids || [],
  progress: Number(r.progress || 0),
  status: r.status,
});

const taskToDB = (t: Partial<Task>) => ({
  obra_id: t.obraId,
  parent_id: t.parentId,
  name: t.name,
  description: t.description,
  start_date: t.startDate,
  end_date: t.endDate,
  type: t.type || 'tarea',
  progress: t.progress,
  progress_mode: t.progressMode,
  manual_progress: t.manualProgress,
  guild: t.guild,
  labor_cost: t.laborCost,
  materials_cost: t.materialsCost,
  real_labor_cost: t.realLaborCost,
  real_materials_cost: t.realMaterialsCost,
  priority: t.priority,
  status: t.status,
  color: t.color,
  payment_type: t.paymentType,
  pactado_amount: t.pactadoAmount,
  equipment_cost: t.equipmentCost,
  paid_amount: t.paidAmount,
  cac_enabled: t.cacEnabled,
  cac_base_month: t.cacBaseMonth,
  repercussion_percent: t.repercussionPercent,
  sort_order: t.sortOrder,
});

export const taskFromDB = (r: any): Task => ({
  id: r.id,
  obraId: r.obra_id,
  parentId: r.parent_id,
  name: r.name,
  description: r.description,
  startDate: r.start_date,
  endDate: r.end_date,
  type: r.type || 'tarea',
  progress: Number(r.progress || 0),
  progressMode: r.progress_mode || 'time',
  manualProgress: r.manual_progress,
  assigneeIds: r.assignee_ids || r.task_assignees?.map((a: any) => a.user_id) || [],
  guild: r.guild,
  laborCost: Number(r.labor_cost || 0),
  materialsCost: Number(r.materials_cost || 0),
  realLaborCost: Number(r.real_labor_cost || 0),
  realMaterialsCost: Number(r.real_materials_cost || 0),
  documents: [],
  color: r.color,
  priority: r.priority || 'media',
  status: r.status || 'no_iniciada',
  createdAt: r.created_at,
  sortOrder: r.sort_order,
  paymentType: r.payment_type,
  pactadoAmount: r.pactado_amount ? Number(r.pactado_amount) : undefined,
  equipmentCost: Number(r.equipment_cost || 0),
  paidAmount: Number(r.paid_amount || 0),
  cacEnabled: r.cac_enabled,
  cacBaseMonth: r.cac_base_month,
  repercussionPercent: r.repercussion_percent ? Number(r.repercussion_percent) : undefined,
  photos: r.task_photos?.map((p: any) => photoFromDB(p)) || [],
  voiceNotes: r.task_voice_notes?.map((v: any) => voiceFromDB(v)) || [],
});

const photoFromDB = (r: any): TaskPhoto => ({
  id: r.id,
  taskId: r.task_id,
  dataUrl: r.storage_path, // en v2 esto es un path, se carga on-demand
  takenAt: r.taken_at,
  takenById: r.taken_by,
  takenByName: r.taken_by_profile?.full_name,
  geo: r.geo_lat ? { lat: Number(r.geo_lat), lng: Number(r.geo_lng) } : undefined,
  caption: r.caption,
  progressAtCapture: r.progress_at_capture ? Number(r.progress_at_capture) : undefined,
});

const voiceFromDB = (r: any): VoiceNote => ({
  id: r.id,
  taskId: r.task_id,
  dataUrl: r.storage_path,
  durationSec: Number(r.duration_sec || 0),
  takenAt: r.taken_at,
  takenById: r.taken_by,
  transcript: r.transcript,
});

const materialToDB = (m: Partial<Material>) => ({
  task_id: m.taskId,
  obra_id: m.obraId,
  name: m.name,
  description: m.description,
  quantity: m.quantity,
  unit: m.unit,
  unit_cost: m.unitCost,
  total_cost: m.totalCost,
  supplier: m.supplier,
  schedule_mode: m.scheduleMode,
  scheduled_date: m.scheduledDate,
  relative_offset_days: m.relativeOffsetDays,
  channels: m.channels,
  kanban_status: m.kanbanStatus,
  sent_to_kanban_at: m.sentToKanbanAt,
});

export const materialFromDB = (r: any): Material => ({
  id: r.id,
  taskId: r.task_id,
  obraId: r.obra_id,
  name: r.name,
  description: r.description,
  quantity: Number(r.quantity || 0),
  unit: r.unit || 'unidad',
  unitCost: Number(r.unit_cost || 0),
  totalCost: Number(r.total_cost || 0),
  supplier: r.supplier,
  scheduleMode: r.schedule_mode || 'relative',
  scheduledDate: r.scheduled_date,
  relativeOffsetDays: Number(r.relative_offset_days || -30),
  channels: r.channels || ['app'],
  notifyMemberIds: [],
  kanbanStatus: r.kanban_status || 'pendiente',
  sentToKanbanAt: r.sent_to_kanban_at,
});

export const depFromDB = (r: any): Dependency => ({
  id: r.id,
  fromTaskId: r.from_task_id,
  toTaskId: r.to_task_id,
  type: r.type || 'FS',
  lagDays: Number(r.lag_days || 0),
});

export const cacFromDB = (r: any): CACEntry => ({
  month: r.month,
  value: Number(r.value),
});

// ============================================================================
// FETCH ALL — cargar todo al iniciar sesión
// ============================================================================
export async function fetchAllData(userId: string): Promise<{
  obras: Obra[];
  tasks: Task[];
  dependencies: Dependency[];
  materials: Material[];
  comments: Comment[];
  chatMessages: ChatMessage[];
  notifications: AppNotification[];
  cacData: CACEntry[];
  members: any[];
} | null> {
  try {
    // 1. Obras a las que tengo acceso
    const { data: obraMembers } = await supabase
      .from('obra_members')
      .select('obra_id')
      .eq('user_id', userId);
    const myObraIds = (obraMembers || []).map(om => om.obra_id);

    // Si no tiene view_all_obras, filtramos. Pero para simplicidad, traemos todas
    // y dejamos que RLS haga el filtrado (si el usuario no tiene acceso, RLS bloquea)
    const { data: obrasRaw, error: e1 } = await supabase
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false });
    if (e1) throw e1;
    const obras = (obrasRaw || []).map(obraFromDB);

    // 2. Tareas (con photos, voice_notes, assignees)
    const { data: tasksRaw, error: e2 } = await supabase
      .from('tasks')
      .select(`
        *,
        task_photos (*),
        task_voice_notes (*),
        task_assignees (user_id)
      `)
      .order('created_at', { ascending: true });
    if (e2) throw e2;
    const tasks = (tasksRaw || []).map(taskFromDB);

    // 3. Dependencias
    const { data: depsRaw } = await supabase.from('dependencies').select('*');
    const dependencies = (depsRaw || []).map(depFromDB);

    // 4. Materiales
    const { data: matRaw } = await supabase.from('materials').select('*');
    const materials = (matRaw || []).map(materialFromDB);

    // 5. Perfiles (members)
    const { data: profilesRaw } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true);
    const members = (profilesRaw || []).map((p: any) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      phone: p.phone,
      role: p.role,
      avatarColor: p.avatar_color || '#64748b',
      initials: (p.full_name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
    }));

    // 6. Comentarios
    const { data: commentsRaw } = await supabase
      .from('comments')
      .select('*, author:profiles(full_name)')
      .order('created_at', { ascending: true });
    const comments: Comment[] = (commentsRaw || []).map((c: any) => ({
      id: c.id,
      taskId: c.task_id,
      authorId: c.author_id,
      text: c.text,
      createdAt: c.created_at,
    }));

    // 7. Chat messages
    const { data: chatRaw } = await supabase
      .from('chat_messages')
      .select('*, author:profiles(full_name, avatar_color)')
      .order('created_at', { ascending: true });
    const chatMessages: ChatMessage[] = (chatRaw || []).map((c: any) => ({
      id: c.id,
      obraId: c.obra_id,
      authorId: c.author_id,
      text: c.text,
      createdAt: c.created_at,
    }));

    // 8. Notificaciones (solo mías)
    const { data: notifRaw } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    const notifications: AppNotification[] = (notifRaw || []).map((n: any) => ({
      id: n.id,
      obraId: n.obra_id,
      taskId: n.task_id,
      type: n.type,
      title: n.title,
      message: n.message,
      createdAt: n.created_at,
      read: n.read,
      severity: n.severity,
    }));

    // 9. CAC data
    const { data: cacRaw } = await supabase
      .from('cac_data')
      .select('*')
      .order('month', { ascending: true });
    const cacData: CACEntry[] = (cacRaw || []).map(cacFromDB);

    return {
      obras, tasks, dependencies, materials, comments, chatMessages,
      notifications, cacData, members,
    };
  } catch (e) {
    console.error('Error en fetchAllData:', e);
    return null;
  }
}

// ============================================================================
// CRUD — operaciones individuales (optimistic, fire-and-forget)
// ============================================================================

// --- Obras ---
export async function dbInsertObra(obra: Obra, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('obras')
    .insert({ ...obraToDB(obra), id: obra.id, created_by: userId })
    .select('id')
    .single();
  if (error) { console.error('dbInsertObra:', error); return null; }
  // Agregar al creator como miembro
  await supabase.from('obra_members').insert({ obra_id: data.id, user_id: userId });
  return data.id;
}

export async function dbUpdateObra(id: ID, patch: Partial<Obra>): Promise<void> {
  const { error } = await supabase.from('obras').update(obraToDB(patch)).eq('id', id);
  if (error) console.error('dbUpdateObra:', error);
}

export async function dbDeleteObra(id: ID): Promise<void> {
  const { error } = await supabase.from('obras').delete().eq('id', id);
  if (error) console.error('dbDeleteObra:', error);
}

// --- Tasks ---
export async function dbInsertTask(task: Task): Promise<void> {
  const { id, assigneeIds, ...rest } = task;
  const { error } = await supabase
    .from('tasks')
    .insert({ ...taskToDB(rest), id });
  if (error) { console.error('dbInsertTask:', error); return; }
  // Asignados
  if (assigneeIds && assigneeIds.length > 0) {
    await supabase.from('task_assignees')
      .insert(assigneeIds.map(uid => ({ task_id: id, user_id: uid })));
  }
}

export async function dbUpdateTask(id: ID, patch: Partial<Task>): Promise<void> {
  const { assigneeIds, photos, voiceNotes, ...rest } = patch as any;
  const { error } = await supabase.from('tasks').update(taskToDB(rest)).eq('id', id);
  if (error) console.error('dbUpdateTask:', error);
  // Si cambiaron assignees, sincronizar
  if (assigneeIds) {
    await supabase.from('task_assignees').delete().eq('task_id', id);
    if (assigneeIds.length > 0) {
      await supabase.from('task_assignees')
        .insert(assigneeIds.map((uid: string) => ({ task_id: id, user_id: uid })));
    }
  }
}

export async function dbDeleteTask(id: ID): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) console.error('dbDeleteTask:', error);
}

// --- Dependencies ---
export async function dbInsertDependency(dep: Dependency): Promise<void> {
  const { error } = await supabase.from('dependencies').insert({
    id: dep.id,
    from_task_id: dep.fromTaskId,
    to_task_id: dep.toTaskId,
    type: dep.type,
    lag_days: dep.lagDays,
  });
  if (error) console.error('dbInsertDependency:', error);
}

export async function dbDeleteDependency(id: ID): Promise<void> {
  const { error } = await supabase.from('dependencies').delete().eq('id', id);
  if (error) console.error('dbDeleteDependency:', error);
}

// --- Materials ---
export async function dbInsertMaterial(mat: Material): Promise<void> {
  const { error } = await supabase.from('materials')
    .insert({ ...materialToDB(mat), id: mat.id });
  if (error) console.error('dbInsertMaterial:', error);
}

export async function dbUpdateMaterial(id: ID, patch: Partial<Material>): Promise<void> {
  const { error } = await supabase.from('materials').update(materialToDB(patch)).eq('id', id);
  if (error) console.error('dbUpdateMaterial:', error);
}

export async function dbDeleteMaterial(id: ID): Promise<void> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) console.error('dbDeleteMaterial:', error);
}

// --- Comments ---
export async function dbInsertComment(c: Comment): Promise<void> {
  const { error } = await supabase.from('comments').insert({
    id: c.id, task_id: c.taskId, author_id: c.authorId, text: c.text, created_at: c.createdAt,
  });
  if (error) console.error('dbInsertComment:', error);
}

// --- Chat ---
export async function dbInsertChatMessage(m: ChatMessage): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert({
    id: m.id, obra_id: m.obraId, author_id: m.authorId, text: m.text, created_at: m.createdAt,
  });
  if (error) console.error('dbInsertChatMessage:', error);
}

// --- Photos ---
export async function dbInsertPhoto(taskId: string, file: Blob, meta: {
  takenById: string;
  caption?: string;
  progressAtCapture?: number;
  geo?: { lat: number; lng: number };
}): Promise<TaskPhoto | null> {
  const photoId = crypto.randomUUID();
  const ext = file.type.split('/')[1] || 'jpg';
  const path = `${taskId}/${photoId}.${ext}`;

  // Subir a Storage
  const { error: upErr } = await supabase.storage
    .from('task-photos')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) { console.error('upload photo:', upErr); return null; }

  // Insertar metadatos
  const { data, error } = await supabase.from('task_photos').insert({
    id: photoId,
    task_id: taskId,
    storage_path: path,
    taken_by: meta.takenById,
    caption: meta.caption,
    progress_at_capture: meta.progressAtCapture,
    geo_lat: meta.geo?.lat,
    geo_lng: meta.geo?.lng,
  }).select().single();
  if (error) { console.error('insert photo meta:', error); return null; }

  // Obtener URL firmada
  const { data: urlData } = await supabase.storage
    .from('task-photos')
    .createSignedUrl(path, 3600); // 1 hora

  return {
    id: data.id,
    taskId,
    dataUrl: urlData?.signedUrl || '',
    takenAt: data.taken_at,
    takenById: data.taken_by,
    caption: data.caption,
    progressAtCapture: data.progress_at_capture,
    geo: meta.geo,
  };
}

export async function dbDeletePhoto(photoId: string, storagePath: string): Promise<void> {
  // Borrar archivo
  const path = storagePath.includes('/') ? storagePath : `${storagePath}`;
  await supabase.storage.from('task-photos').remove([path]);
  // Borrar registro
  const { error } = await supabase.from('task_photos').delete().eq('id', photoId);
  if (error) console.error('dbDeletePhoto:', error);
}

// --- Voice notes ---
export async function dbInsertVoiceNote(taskId: string, blob: Blob, durationSec: number, takenById: string): Promise<VoiceNote | null> {
  const noteId = crypto.randomUUID();
  const path = `${taskId}/${noteId}.webm`;

  const { error: upErr } = await supabase.storage
    .from('voice-notes')
    .upload(path, blob, { contentType: 'audio/webm' });
  if (upErr) { console.error('upload voice:', upErr); return null; }

  const { data, error } = await supabase.from('task_voice_notes').insert({
    id: noteId,
    task_id: taskId,
    storage_path: path,
    duration_sec: durationSec,
    taken_by: takenById,
  }).select().single();
  if (error) { console.error('insert voice meta:', error); return null; }

  const { data: urlData } = await supabase.storage
    .from('voice-notes')
    .createSignedUrl(path, 3600);

  return {
    id: data.id,
    taskId,
    dataUrl: urlData?.signedUrl || '',
    durationSec,
    takenAt: data.taken_at,
    takenById: data.taken_by,
  };
}

export async function dbDeleteVoiceNote(noteId: string, storagePath: string): Promise<void> {
  await supabase.storage.from('voice-notes').remove([storagePath]);
  const { error } = await supabase.from('task_voice_notes').delete().eq('id', noteId);
  if (error) console.error('dbDeleteVoiceNote:', error);
}

// --- Notifications ---
export async function dbMarkNotificationRead(id: ID): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) console.error('dbMarkNotificationRead:', error);
}

export async function dbMarkAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) console.error('dbMarkAllNotificationsRead:', error);
}

// --- CAC ---
export async function dbInsertCacEntry(month: string, value: number): Promise<void> {
  const { error } = await supabase.from('cac_data')
    .upsert({ month, value, updated_at: new Date().toISOString() });
  if (error) console.error('dbInsertCacEntry:', error);
}

export async function dbDeleteCacEntry(month: string): Promise<void> {
  const { error } = await supabase.from('cac_data').delete().eq('month', month);
  if (error) console.error('dbDeleteCacEntry:', error);
}

// --- Members ---
export async function dbUpdateMember(id: ID, patch: any): Promise<void> {
  const { error } = await supabase.from('profiles').update({
    full_name: patch.name,
    phone: patch.phone,
    role: patch.role,
    avatar_color: patch.avatarColor,
  }).eq('id', id);
  if (error) console.error('dbUpdateMember:', error);
}

export async function dbDeleteMember(id: ID): Promise<void> {
  // En realidad no borramos, marcamos como inactivo
  const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id);
  if (error) console.error('dbDeleteMember:', error);
}

// --- Permissions ---
export async function dbSetPermission(userId: string, permission: string, granted: boolean): Promise<void> {
  if (granted) {
    const { error } = await supabase.from('user_permissions')
      .upsert({ user_id: userId, permission, granted: true });
    if (error) console.error('dbSetPermission:', error);
  } else {
    const { error } = await supabase.from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission', permission);
    if (error) console.error('dbSetPermission (delete):', error);
  }
}

// --- Obra members ---
export async function dbAddObraMember(obraId: ID, userId: ID): Promise<void> {
  const { error } = await supabase.from('obra_members')
    .insert({ obra_id: obraId, user_id: userId });
  if (error && !error.message.includes('duplicate')) console.error('dbAddObraMember:', error);
}

export async function dbRemoveObraMember(obraId: ID, userId: ID): Promise<void> {
  const { error } = await supabase.from('obra_members')
    .delete()
    .eq('obra_id', obraId)
    .eq('user_id', userId);
  if (error) console.error('dbRemoveObraMember:', error);
}

// ============================================================================
// Helper para refrescar URLs firmadas de fotos (expiran en 1h)
// ============================================================================
export async function refreshPhotoUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('task-photos')
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl || null;
}

export async function refreshVoiceUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('voice-notes')
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl || null;
}
