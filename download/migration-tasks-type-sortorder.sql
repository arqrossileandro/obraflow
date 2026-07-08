-- ============================================================================
-- Migración: agregar type y sort_order a la tabla tasks
-- ============================================================================
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Agregar columna type (tarea | hito)
alter table public.tasks add column if not exists type text default 'tarea';

-- Agregar columna sort_order (para reordenar manualmente)
alter table public.tasks add column if not exists sort_order numeric default 0;

-- Inicializar sort_order con created_at (para que las tareas existentes queden ordenadas por fecha de creación)
update public.tasks
set sort_order = extract(epoch from created_at) * 1000
where sort_order = 0 or sort_order is null;

-- Crear índice para ordenar eficientemente
create index if not exists idx_tasks_sort_order on public.tasks(sort_order);
