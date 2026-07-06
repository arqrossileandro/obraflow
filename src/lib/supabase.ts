// ============================================================================
// Supabase client singleton
// ============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan variables de entorno de Supabase. Verificá .env.local');
}

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
    });
  }
  return _client;
}

export const supabase = getSupabase();

// ============================================================================
// Tipos de permisos disponibles
// ============================================================================
export const PERMISSIONS = [
  { key: 'view_all_obras', label: 'Ver todas las obras', desc: 'Acceso a todas las obras del sistema' },
  { key: 'edit_obras', label: 'Editar obras', desc: 'Crear, modificar y eliminar obras' },
  { key: 'edit_tasks', label: 'Editar tareas', desc: 'Crear, modificar y eliminar tareas y dependencias' },
  { key: 'edit_progress', label: 'Editar avances', desc: 'Actualizar % de avance de tareas asignadas' },
  { key: 'edit_documents', label: 'Editar documentación', desc: 'Subir, borrar y actualizar documentos y fotos' },
  { key: 'edit_kanban', label: 'Editar kanban de materiales', desc: 'Mover pedidos de materiales entre estados' },
  { key: 'edit_finances', label: 'Editar finanzas', desc: 'Modificar costos reales y presupuestos' },
  { key: 'view_finances', label: 'Ver finanzas', desc: 'Acceso a la pestaña de finanzas' },
  { key: 'manage_users', label: 'Gestionar usuarios', desc: 'Invitar usuarios y asignar permisos' },
] as const;

export type PermissionKey = typeof PERMISSIONS[number]['key'];

// ============================================================================
// Roles con permisos por defecto
// ============================================================================
export const ROLE_DEFAULTS: Record<string, PermissionKey[]> = {
  director: ['view_all_obras', 'edit_obras', 'edit_tasks', 'edit_progress', 'edit_documents', 'edit_kanban', 'edit_finances', 'view_finances', 'manage_users'],
  admin: ['view_all_obras', 'edit_obras', 'edit_tasks', 'edit_progress', 'edit_documents', 'edit_kanban', 'edit_finances', 'view_finances', 'manage_users'],
  capataz: ['edit_progress', 'edit_documents'],
  oficina_tecnica: ['view_all_obras', 'edit_documents', 'edit_tasks'],
  abastecimiento: ['view_all_obras', 'edit_kanban'],
};

export const ROLE_LABELS: Record<string, string> = {
  director: 'Director de obra',
  admin: 'Administrador',
  capataz: 'Capataz',
  oficina_tecnica: 'Oficina técnica',
  abastecimiento: 'Abastecimiento',
};
