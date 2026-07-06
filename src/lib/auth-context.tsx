'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Tipo del perfil de usuario (extiende auth.users con datos de la app)
// ============================================================================
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  avatar_color: string;
  is_active: boolean;
  permissions: Set<string>;
  obra_ids: string[]; // obras a las que tiene acceso
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar perfil desde Supabase
  const loadProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      // Traer profile + permisos + obras en paralelo
      const [profileRes, permsRes, obrasRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_permissions').select('permission, granted').eq('user_id', userId),
        supabase.from('obra_members').select('obra_id').eq('user_id', userId),
      ]);

      if (profileRes.error || !profileRes.data) {
        console.error('Error cargando perfil:', profileRes.error);
        return null;
      }

      const permissions = new Set<string>();
      if (permsRes.data) {
        permsRes.data.forEach(p => {
          if (p.granted) permissions.add(p.permission);
        });
      }

      const obra_ids = obrasRes.data ? obrasRes.data.map(o => o.obra_id) : [];

      return {
        ...profileRes.data,
        permissions,
        obra_ids,
      };
    } catch (e) {
      console.error('Error cargando perfil:', e);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await loadProfile(user.id);
      setProfile(p);
    }
  }, [user, loadProfile]);

  // Listener de cambios de sesión
  useEffect(() => {
    let mounted = true;

    // Cargar sesión inicial
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await loadProfile(s.user.id);
        if (mounted) setProfile(p);
      }
      if (mounted) setLoading(false);
    });

    // Suscribirse a cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          const p = await loadProfile(s.user.id);
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Suscripción realtime a cambios en el propio perfil (permisos, rol)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_permissions', filter: `user_id=eq.${user.id}` },
        () => { refreshProfile(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'obra_members', filter: `user_id=eq.${user.id}` },
        () => { refreshProfile(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => { refreshProfile(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshProfile]);

  // === Acciones de auth ===
  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'No se pudo crear el usuario' };
    // El trigger handle_new_user crea el profile automáticamente
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  };

  const value: AuthContextValue = {
    session,
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

// ============================================================================
// Helper: ¿el usuario actual tiene un permiso?
// ============================================================================
export function useHasPermission(permission: string): boolean {
  const { profile } = useAuth();
  if (!profile) return false;
  // El director y admin siempre tienen todos los permisos
  if (profile.role === 'director' || profile.role === 'admin') return true;
  return profile.permissions.has(permission);
}
