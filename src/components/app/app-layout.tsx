'use client';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import { LoginScreen } from '@/components/app/login-screen';
import { RealtimeSync } from '@/components/app/realtime-sync';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/types';

// ============================================================================
// Inner component that has access to both Auth and Store
// ============================================================================
function AppInner({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const { synced, setCurrentUserFromAuth, setSynced } = useAppStore();

  // Cuando el usuario se loguea, propagarlo al store como currentUser (Member)
  useEffect(() => {
    if (user && profile) {
      const member: Member = {
        id: user.id,
        name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role as any,
        avatarColor: profile.avatar_color,
        initials: profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
      };
      setCurrentUserFromAuth(member);
    }
  }, [user, profile, setCurrentUserFromAuth]);

  // Cuando se desloguea, marcar como no sincronizado
  useEffect(() => {
    if (!user) {
      setSynced(false);
    }
  }, [user, setSynced]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Cargando ObraFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <>
      {synced && <RealtimeSync />}
      {children}
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppInner>{children}</AppInner>
    </AuthProvider>
  );
}
