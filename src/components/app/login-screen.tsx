'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, Mail, Lock, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setError(error.includes('Invalid login credentials')
            ? 'Email o contraseña incorrectos'
            : error);
        }
      } else {
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email.trim(), password, fullName.trim() || email.split('@')[0]);
        if (error) {
          setError(error);
        } else {
          setError(null);
          setMode('login');
          alert('Cuenta creada. Iniciá sesión con tu email y contraseña.');
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg mb-4">
            <HardHat className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ObraFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de obras en tiempo real</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl p-6 space-y-5">
          {/* Tabs login/signup */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-md transition',
                mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-md transition',
                mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@constructora.com"
                  className="pl-10"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
              ) : (
                <>
                  {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {mode === 'signup' && (
            <p className="text-[10px] text-muted-foreground text-center">
              El primer usuario creado se convierte automáticamente en <strong>Director</strong> con todos los permisos. Los demás se crean como <strong>Capataz</strong> y vos les asignás permisos desde Configuración.
            </p>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          ObraFlow v2.0 · Sincronizado en la nube
        </p>
      </div>
    </div>
  );
}
