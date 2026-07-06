-- ============================================================================
-- ObraFlow — Esquema completo de base de datos
-- ============================================================================
-- INSTRUCCIONES (leer antes de ejecutar):
-- 1. Ir a Supabase Dashboard → SQL Editor → New query
-- 2. Pegar TODO este archivo
-- 3. Tocar "Run"
-- 4. Listo. Verificar que no haya errores en la salida.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- 2. TABLA PROFILES (extiende auth.users con datos de la app)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default 'Usuario',
  role text not null default 'capataz', -- admin | director | capataz | oficina_tecnica | abastecimiento
  phone text,
  avatar_color text default '#64748b',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- 3. TABLA OBRAS
-- ============================================================================
create table if not exists public.obras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text default '',
  address text default '',
  start_date date not null default current_date,
  end_date date not null default current_date + interval '30 days',
  budget numeric default 0,
  color text default '#f97316',
  description text,
  status text default 'planificada', -- planificada | en_curso | pausada | finalizada
  progress numeric default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- 4. TABLA OBRA_MEMBERS (qué usuarios tienen acceso a qué obras)
-- ============================================================================
create table if not exists public.obra_members (
  obra_id uuid references public.obras(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (obra_id, user_id)
);

-- ============================================================================
-- 5. TABLA USER_PERMISSIONS (permisos granulares por usuario)
-- ============================================================================
create table if not exists public.user_permissions (
  user_id uuid references public.profiles(id) on delete cascade,
  permission text not null,
  granted boolean default true,
  primary key (user_id, permission)
);

-- ============================================================================
-- 6. TABLA TASKS
-- ============================================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete cascade not null,
  parent_id uuid references public.tasks(id) on delete cascade,
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  progress numeric default 0,
  progress_mode text default 'time', -- time | manual
  manual_progress numeric,
  guild text,
  labor_cost numeric default 0,
  materials_cost numeric default 0,
  real_labor_cost numeric default 0,
  real_materials_cost numeric default 0,
  priority text default 'media', -- baja | media | alta | critica
  status text default 'no_iniciada', -- no_iniciada | en_curso | pausada | finalizada
  color text,
  payment_type text, -- certificado | pactado | jornalizado
  pactado_amount numeric,
  equipment_cost numeric default 0,
  paid_amount numeric default 0,
  cac_enabled boolean default false,
  cac_base_month text,
  repercussion_percent numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tasks_obra on public.tasks(obra_id);
create index if not exists idx_tasks_parent on public.tasks(parent_id);

-- ============================================================================
-- 7. TABLA TASK_ASSIGNEES (qué usuarios están asignados a qué tarea)
-- ============================================================================
create table if not exists public.task_assignees (
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

-- ============================================================================
-- 8. TABLA DEPENDENCIES
-- ============================================================================
create table if not exists public.dependencies (
  id uuid primary key default gen_random_uuid(),
  from_task_id uuid references public.tasks(id) on delete cascade not null,
  to_task_id uuid references public.tasks(id) on delete cascade not null,
  type text default 'FS', -- FS | SS | FF | SF
  lag_days numeric default 0,
  created_at timestamptz default now()
);

-- ============================================================================
-- 9. TABLA MATERIALS
-- ============================================================================
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  obra_id uuid references public.obras(id) on delete cascade not null,
  name text not null,
  description text,
  quantity numeric default 0,
  unit text default 'unidad',
  unit_cost numeric default 0,
  total_cost numeric default 0,
  supplier text,
  schedule_mode text default 'relative', -- specific | relative
  scheduled_date date,
  relative_offset_days numeric default -30,
  channels text[] default '{app}',
  kanban_status text default 'pendiente', -- pendiente | pedido | en_transito | entregado
  sent_to_kanban_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================================
-- 10. TABLA TASK_PHOTOS (metadatos; el binario va a Storage)
-- ============================================================================
create table if not exists public.task_photos (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  storage_path text not null,
  taken_at timestamptz default now(),
  taken_by uuid references public.profiles(id),
  caption text,
  progress_at_capture numeric,
  geo_lat numeric,
  geo_lng numeric
);

-- ============================================================================
-- 11. TABLA TASK_VOICE_NOTES
-- ============================================================================
create table if not exists public.task_voice_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  storage_path text not null,
  duration_sec numeric default 0,
  taken_at timestamptz default now(),
  taken_by uuid references public.profiles(id),
  transcript text
);

-- ============================================================================
-- 12. TABLA COMMENTS
-- ============================================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  author_id uuid references public.profiles(id),
  text text not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- 13. TABLA CHAT_MESSAGES
-- ============================================================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete cascade not null,
  author_id uuid references public.profiles(id),
  text text not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- 14. TABLA CAC_DATA (índice CAC, compartido)
-- ============================================================================
create table if not exists public.cac_data (
  month text primary key, -- YYYY-MM
  value numeric not null,
  updated_at timestamptz default now()
);

-- ============================================================================
-- 15. TABLA NOTIFICATIONS
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  obra_id uuid references public.obras(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  type text not null, -- task_unblocked | task_blocked | task_overdue | material_due | payment_due | mention
  title text not null,
  message text,
  severity text default 'info', -- info | warning | critical
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);

-- ============================================================================
-- 16. SEED CAC_DATA inicial
-- ============================================================================
insert into public.cac_data (month, value) values
  ('2025-01', 92.5), ('2025-02', 93.1), ('2025-03', 94.0), ('2025-04', 95.2),
  ('2025-05', 96.1), ('2025-06', 97.0), ('2025-07', 97.8), ('2025-08', 98.5),
  ('2025-09', 99.2), ('2025-10', 99.6), ('2025-11', 99.8), ('2025-12', 100.0),
  ('2026-01', 101.5), ('2026-02', 103.2), ('2026-03', 104.8), ('2026-04', 106.5),
  ('2026-05', 108.3), ('2026-06', 110.1)
on conflict (month) do nothing;

-- ============================================================================
-- 17. TRIGGER: crear profile automáticamente cuando un usuario se registra
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- El primer usuario registrado se convierte en director (admin)
  -- Los siguientes son capataz por defecto
  declare
    user_count integer;
    user_role text;
  begin
    select count(*) into user_count from public.profiles;
    if user_count = 0 then
      user_role := 'director';
    else
      user_role := 'capataz';
    end if;

    insert into public.profiles (id, email, full_name, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      user_role
    );

    -- Darle todos los permisos si es director
    if user_role = 'director' then
      insert into public.user_permissions (user_id, permission, granted)
      values
        (new.id, 'view_all_obras', true),
        (new.id, 'edit_obras', true),
        (new.id, 'edit_tasks', true),
        (new.id, 'edit_progress', true),
        (new.id, 'edit_documents', true),
        (new.id, 'edit_kanban', true),
        (new.id, 'edit_finances', true),
        (new.id, 'manage_users', true),
        (new.id, 'view_finances', true);
    end if;

    return new;
  end;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 18. UPDATED_AT TRIGGERS
-- ============================================================================
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at_obras on public.obras;
create trigger set_updated_at_obras before update on public.obras
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at_tasks on public.tasks;
create trigger set_updated_at_tasks before update on public.tasks
  for each row execute function public.update_updated_at();

-- ============================================================================
-- 19. RLS (Row Level Security) — POLÍTICAS DE ACCESO
-- ============================================================================

-- Habilitar RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.obras enable row level security;
alter table public.obra_members enable row level security;
alter table public.user_permissions enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.dependencies enable row level security;
alter table public.materials enable row level security;
alter table public.task_photos enable row level security;
alter table public.task_voice_notes enable row level security;
alter table public.comments enable row level security;
alter table public.chat_messages enable row level security;
alter table public.cac_data enable row level security;
alter table public.notifications enable row level security;

-- PROFILES: cada usuario puede ver todos los perfiles, editar solo el suyo
-- (los admins/directores editan todos via función has_permission)
create or replace function public.has_permission(p_user_id uuid, p_permission text)
returns boolean language sql security definer set search_path = public as $$
  select coalesce(
    (select granted from public.user_permissions
     where user_id = p_user_id and permission = p_permission),
    false
  );
$$;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_update_admin" on public.profiles
  for update using (public.has_permission(auth.uid(), 'manage_users'));

-- USER_PERMISSIONS: ver todos, editar solo admin
create policy "user_perms_select_all" on public.user_permissions
  for select using (true);

create policy "user_perms_manage_admin" on public.user_permissions
  for all using (public.has_permission(auth.uid(), 'manage_users'))
  with check (public.has_permission(auth.uid(), 'manage_users'));

-- OBRAS: ver si es miembro o si tiene view_all_obras
create or replace function public.can_access_obra(p_user_id uuid, p_obra_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select
    public.has_permission(p_user_id, 'view_all_obras')
    or exists (
      select 1 from public.obra_members
      where obra_id = p_obra_id and user_id = p_user_id
    )
    or exists (
      select 1 from public.obras where id = p_obra_id and created_by = p_user_id
    );
$$;

create policy "obras_select" on public.obras
  for select using (public.can_access_obra(auth.uid(), id));

create policy "obras_insert" on public.obras
  for insert with check (
    public.has_permission(auth.uid(), 'edit_obras')
    or auth.uid() is not null
  );

create policy "obras_update" on public.obras
  for update using (
    public.has_permission(auth.uid(), 'edit_obras')
    or created_by = auth.uid()
  );

create policy "obras_delete" on public.obras
  for delete using (
    public.has_permission(auth.uid(), 'edit_obras')
    or created_by = auth.uid()
  );

-- OBRA_MEMBERS: ver si puede acceder a la obra, editar si es admin
create policy "obra_members_select" on public.obra_members
  for select using (
    user_id = auth.uid()
    or public.can_access_obra(auth.uid(), obra_id)
  );

create policy "obra_members_manage" on public.obra_members
  for all using (public.has_permission(auth.uid(), 'manage_users'))
  with check (public.has_permission(auth.uid(), 'manage_users'));

-- TASKS: ver si puede acceder a la obra de la tarea
create policy "tasks_select" on public.tasks
  for select using (public.can_access_obra(auth.uid(), obra_id));

create policy "tasks_insert" on public.tasks
  for insert with check (
    public.can_access_obra(auth.uid(), obra_id)
    and public.has_permission(auth.uid(), 'edit_tasks')
  );

create policy "tasks_update" on public.tasks
  for update using (
    public.can_access_obra(auth.uid(), obra_id)
    and (
      public.has_permission(auth.uid(), 'edit_tasks')
      or public.has_permission(auth.uid(), 'edit_progress')
      or exists (
        select 1 from public.task_assignees
        where task_id = id and user_id = auth.uid()
      )
    )
  );

create policy "tasks_delete" on public.tasks
  for delete using (
    public.can_access_obra(auth.uid(), obra_id)
    and public.has_permission(auth.uid(), 'edit_tasks')
  );

-- TASK_ASSIGNEES
create policy "task_assignees_select" on public.task_assignees
  for select using (true);

create policy "task_assignees_manage" on public.task_assignees
  for all using (public.has_permission(auth.uid(), 'edit_tasks'))
  with check (public.has_permission(auth.uid(), 'edit_tasks'));

-- DEPENDENCIES
create policy "deps_select" on public.dependencies
  for select using (true);

create policy "deps_insert" on public.dependencies
  for insert with check (public.has_permission(auth.uid(), 'edit_tasks'));

create policy "deps_delete" on public.dependencies
  for delete using (public.has_permission(auth.uid(), 'edit_tasks'));

-- MATERIALS
create policy "materials_select" on public.materials
  for select using (public.can_access_obra(auth.uid(), obra_id));

create policy "materials_insert" on public.materials
  for insert with check (public.can_access_obra(auth.uid(), obra_id));

create policy "materials_update" on public.materials
  for update using (
    public.can_access_obra(auth.uid(), obra_id)
    and (
      public.has_permission(auth.uid(), 'edit_kanban')
      or public.has_permission(auth.uid(), 'edit_tasks')
    )
  );

create policy "materials_delete" on public.materials
  for delete using (
    public.can_access_obra(auth.uid(), obra_id)
    and public.has_permission(auth.uid(), 'edit_tasks')
  );

-- PHOTOS: ver si puede acceder a la obra de la tarea
create policy "photos_select" on public.task_photos
  for select using (true);

create policy "photos_insert" on public.task_photos
  for insert with check (true);

create policy "photos_delete" on public.task_photos
  for delete using (
    taken_by = auth.uid()
    or public.has_permission(auth.uid(), 'edit_documents')
  );

-- VOICE_NOTES
create policy "voice_select" on public.task_voice_notes
  for select using (true);

create policy "voice_insert" on public.task_voice_notes
  for insert with check (true);

create policy "voice_delete" on public.task_voice_notes
  for delete using (taken_by = auth.uid());

-- COMMENTS
create policy "comments_select" on public.comments
  for select using (true);

create policy "comments_insert" on public.comments
  for insert with check (auth.uid() is not null);

create policy "comments_delete" on public.comments
  for delete using (author_id = auth.uid());

-- CHAT_MESSAGES
create policy "chat_select" on public.chat_messages
  for select using (public.can_access_obra(auth.uid(), obra_id));

create policy "chat_insert" on public.chat_messages
  for insert with check (
    public.can_access_obra(auth.uid(), obra_id)
    and author_id = auth.uid()
  );

-- CAC_DATA: ver todos, editar si manage_users
create policy "cac_select" on public.cac_data
  for select using (true);

create policy "cac_manage" on public.cac_data
  for all using (public.has_permission(auth.uid(), 'manage_users'))
  with check (public.has_permission(auth.uid(), 'manage_users'));

-- NOTIFICATIONS: cada usuario ve solo las suyas
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());

create policy "notifications_insert" on public.notifications
  for insert with check (true); -- sistema puede insertar para cualquier usuario

-- ============================================================================
-- 20. STORAGE BUCKETS
-- ============================================================================
-- Crear buckets públicos-privados para fotos y notas de voz
-- (también se puede hacer desde Dashboard → Storage)

insert into storage.buckets (id, name, public)
values ('task-photos', 'task-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

-- Policies de Storage: usuarios autenticados pueden subir, solo dueño puede borrar
create policy "photos_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'task-photos' and auth.uid() is not null
  );

create policy "photos_storage_select" on storage.objects
  for select using (
    bucket_id = 'task-photos' and auth.uid() is not null
  );

create policy "photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'task-photos'
    and (owner = auth.uid() or public.has_permission(auth.uid(), 'edit_documents'))
  );

create policy "voice_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'voice-notes' and auth.uid() is not null
  );

create policy "voice_storage_select" on storage.objects
  for select using (
    bucket_id = 'voice-notes' and auth.uid() is not null
  );

create policy "voice_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'voice-notes' and owner = auth.uid()
  );

-- ============================================================================
-- 21. REALTIME — habilitar para tablas críticas
-- ============================================================================
alter publication supabase_realtime add table public.obras;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.dependencies;
alter publication supabase_realtime add table public.materials;
alter publication supabase_realtime add table public.task_photos;
alter publication supabase_realtime add table public.task_voice_notes;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.user_permissions;
alter publication supabase_realtime add table public.obra_members;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.cac_data;

-- ============================================================================
-- FIN
-- ============================================================================
-- Verificar que se ejecutó correctamente:
-- Deberías ver "Success. No rows returned." al final.
-- Si hay algún error, copiar el mensaje y enviárselo al asistente.
-- ============================================================================
