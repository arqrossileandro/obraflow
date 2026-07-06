'use client';

import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { supabase, PERMISSIONS, ROLE_DEFAULTS, ROLE_LABELS } from '@/lib/supabase';
import * as sync from '@/lib/sync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Settings, Building2, Bell, Palette, Shield, Database, Mail,
  MessageCircle, Trash2, Download, Info, Users, Lock, Plus, UserCog, ChevronDown, ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string;
  avatar_color: string;
  is_active: boolean;
  permissions: string[];
  obra_ids: string[];
}

export function SettingsView() {
  const { obras, deleteObra, currentUser, cacData, addCacEntry, deleteCacEntry } = useAppStore();
  const { profile, signOut } = useAuth();
  const [deleteObraId, setDeleteObraId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('capataz');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [newCacMonth, setNewCacMonth] = useState('');
  const [newCacValue, setNewCacValue] = useState('');

  const canManageUsers = profile?.role === 'director' || profile?.role === 'admin' || (profile?.permissions.has('manage_users') ?? false);

  // Cargar usuarios
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const [{ data: profilesData }, { data: permsData }, { data: membersData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('is_active', true),
        supabase.from('user_permissions').select('user_id, permission, granted'),
        supabase.from('obra_members').select('user_id, obra_id'),
      ]);
      const usersList: UserRow[] = (profilesData || []).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        phone: p.phone || '',
        avatar_color: p.avatar_color || '#64748b',
        is_active: p.is_active,
        permissions: (permsData || []).filter(pp => pp.user_id === p.id && pp.granted).map(pp => pp.permission),
        obra_ids: (membersData || []).filter(m => m.user_id === p.id).map(m => m.obra_id),
      }));
      setUsers(usersList);
    } catch (e) {
      console.error('Error cargando usuarios:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (canManageUsers) loadUsers();
  }, [canManageUsers]);

  const handleInvite = async () => {
    setInviteError(null);
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError('Completá nombre y email');
      return;
    }
    // Generar link de signup (no podemos crear usuario directamente sin service_role)
    // En su lugar, mostramos un link para que el usuario se registre
    const signupUrl = `${window.location.origin}/?invite=${encodeURIComponent(inviteEmail)}&name=${encodeURIComponent(inviteName)}&role=${inviteRole}`;
    alert(
      `Para invitar a ${inviteName} (${inviteEmail}):\n\n` +
      `1. Compartí este link con la persona:\n${signupUrl}\n\n` +
      `2. Cuando se registre con ese email, aparecerá acá automaticamente como "${ROLE_LABELS[inviteRole]}".\n\n` +
      `3. Vas a poder ajustar sus permisos con los checkboxes de abajo.`
    );
    setInviteEmail('');
    setInviteName('');
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Actualizar rol
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { alert('Error: ' + error.message); return; }
    // Aplicar permisos por defecto del rol
    const defaults = ROLE_DEFAULTS[newRole] || [];
    // Borrar permisos actuales
    await supabase.from('user_permissions').delete().eq('user_id', userId);
    // Insertar nuevos
    if (defaults.length > 0) {
      await supabase.from('user_permissions').insert(
        defaults.map(p => ({ user_id: userId, permission: p, granted: true }))
      );
    }
    loadUsers();
  };

  const handlePermissionToggle = async (userId: string, permission: string, granted: boolean) => {
    await sync.dbSetPermission(userId, permission, granted);
    loadUsers();
  };

  const handleObraAccessToggle = async (userId: string, obraId: string, has: boolean) => {
    if (has) {
      await sync.dbRemoveObraMember(obraId, userId);
    } else {
      await sync.dbAddObraMember(obraId, userId);
    }
    loadUsers();
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('¿Desactivar este usuario? Ya no podrá iniciar sesión.')) return;
    await sync.dbDeleteMember(userId);
    loadUsers();
  };

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Configuración</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Gestiona las preferencias y usuarios</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Cerrar sesión
        </Button>
      </div>

      {/* ===== Gestión de usuarios ===== */}
      {canManageUsers && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" /> Usuarios y permisos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Invitar usuario */}
            <div className="rounded-md border border-border p-3 bg-muted/20">
              <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Invitar nuevo usuario
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <Input placeholder="Nombre completo" value={inviteName} onChange={e => setInviteName(e.target.value)} className="text-xs h-8" />
                <Input placeholder="email@constructora.com" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="text-xs h-8" />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {inviteError && <div className="text-xs text-destructive mb-2">{inviteError}</div>}
              <Button size="sm" className="w-full h-8 text-xs" onClick={handleInvite}>
                Generar link de invitación
              </Button>
            </div>

            {/* Lista de usuarios */}
            {loadingUsers ? (
              <div className="text-xs text-muted-foreground text-center py-4">Cargando usuarios...</div>
            ) : (
              <div className="space-y-2">
                {users.map(u => {
                  const expanded = expandedUserId === u.id;
                  const isSelf = u.id === profile?.id;
                  return (
                    <div key={u.id} className="rounded-md border border-border overflow-hidden">
                      <button
                        onClick={() => setExpandedUserId(expanded ? null : u.id)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition"
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: u.avatar_color }}>
                          {u.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-medium text-foreground truncate">
                            {u.full_name} {isSelf && <span className="text-[10px] text-muted-foreground">(vos)</span>}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[u.role] || u.role}</Badge>
                        <Badge variant="outline" className="text-[10px]">{u.permissions.length} permisos</Badge>
                        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </button>

                      {expanded && (
                        <div className="border-t border-border p-3 space-y-3 bg-muted/10">
                          {/* Rol */}
                          <div>
                            <Label className="text-xs mb-1.5 block">Rol</Label>
                            <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)} disabled={isSelf}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isSelf && <p className="text-[10px] text-muted-foreground mt-1">No podés cambiar tu propio rol</p>}
                          </div>

                          {/* Permisos granulares */}
                          <div>
                            <Label className="text-xs mb-1.5 block flex items-center gap-1.5">
                              <Lock className="w-3 h-3" /> Permisos específicos
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {PERMISSIONS.map(p => {
                                const granted = u.permissions.includes(p.key);
                                return (
                                  <label key={p.key} className="flex items-start gap-2 p-2 rounded border border-border bg-card cursor-pointer hover:bg-muted/30">
                                    <Checkbox
                                      checked={granted}
                                      onCheckedChange={(v) => handlePermissionToggle(u.id, p.key, !!v)}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-foreground">{p.label}</div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Acceso a obras */}
                          <div>
                            <Label className="text-xs mb-1.5 block flex items-center gap-1.5">
                              <Building2 className="w-3 h-3" /> Acceso a obras
                            </Label>
                            <div className="space-y-1.5">
                              {obras.map(o => {
                                const has = u.obra_ids.includes(o.id);
                                return (
                                  <label key={o.id} className="flex items-center gap-2 p-2 rounded border border-border bg-card cursor-pointer hover:bg-muted/30">
                                    <Checkbox
                                      checked={has}
                                      onCheckedChange={(v) => handleObraAccessToggle(u.id, o.id, has)}
                                    />
                                    <span className="w-2 h-2 rounded-full" style={{ background: o.color }} />
                                    <span className="text-xs text-foreground flex-1 truncate">{o.name}</span>
                                  </label>
                                );
                              })}
                              {obras.length === 0 && <p className="text-[11px] text-muted-foreground">No hay obras creadas</p>}
                            </div>
                          </div>

                          {/* Desactivar */}
                          {!isSelf && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                              onClick={() => handleDeactivate(u.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Desactivar usuario
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== Índice CAC ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" /> Índice CAC (Cámara Argentina de la Construcción)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Índice mensual usado para ajustar costos por inflación. Compartido entre todas las obras.
          </p>
          <div className="flex gap-2">
            <Input
              type="month"
              value={newCacMonth}
              onChange={e => setNewCacMonth(e.target.value)}
              className="text-xs h-8"
            />
            <Input
              type="number"
              step="0.1"
              placeholder="Valor (ej: 110.5)"
              value={newCacValue}
              onChange={e => setNewCacValue(e.target.value)}
              className="text-xs h-8"
            />
            <Button
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => {
                if (newCacMonth && newCacValue) {
                  addCacEntry(newCacMonth, parseFloat(newCacValue));
                  setNewCacMonth('');
                  setNewCacValue('');
                }
              }}
            >
              <Plus className="w-3 h-3 mr-1" /> Agregar
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-md p-2">
            {cacData.slice().reverse().map(entry => (
              <div key={entry.month} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/30">
                <span className="font-mono text-foreground">{entry.month}</span>
                <span className="text-muted-foreground">{entry.value.toFixed(1)}</span>
                <button
                  onClick={() => deleteCacEntry(entry.month)}
                  className="text-destructive hover:bg-destructive/10 rounded p-1"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {cacData.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">Sin datos CAC</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Obras gestionadas ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" /> Obras
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {obras.map(o => (
            <div key={o.id} className="flex items-center gap-3 p-3 rounded-md border border-border">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ background: o.color }}>
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{o.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{o.client} · {o.address}</div>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">{o.status.replace(/_/g, ' ')}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive"
                onClick={() => setDeleteObraId(o.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {obras.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">No hay obras creadas. Creá una desde la sidebar.</div>
          )}
        </CardContent>
      </Card>

      {/* ===== Info ===== */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
            <div>
              <strong>ObraFlow v2.0</strong> · Sincronizado en la nube con Supabase.
              <br />Los datos se guardan en la base de datos central y se sincronizan en tiempo real entre todos los dispositivos.
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteObraId} onOpenChange={(o) => !o && setDeleteObraId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar obra?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la obra con todas sus tareas, materiales, dependencias, comentarios y mensajes de chat. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-red-700"
              onClick={() => { if (deleteObraId) deleteObra(deleteObraId); setDeleteObraId(null); }}
            >
              Eliminar obra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
