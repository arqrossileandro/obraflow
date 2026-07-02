'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings, Building2, Bell, Palette, Shield, Database, Mail,
  MessageCircle, Globe, Trash2, Download, Info
} from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export function SettingsView() {
  const { obras, deleteObra, currentUser } = useAppStore();
  const [deleteObraId, setDeleteObraId] = useState<string | null>(null);
  const [notifApp, setNotifApp] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(false);

  const notifications = [
    { id: 'app', label: 'Notificaciones dentro de la app', desc: 'Recibir alertas internas de pedidos, dependencias y atrasos', enabled: notifApp, setter: setNotifApp, icon: Bell },
    { id: 'email', label: 'Notificaciones por email', desc: 'Recibir un resumen diario por correo electrónico', enabled: notifEmail, setter: setNotifEmail, icon: Mail },
    { id: 'whatsapp', label: 'Notificaciones por WhatsApp', desc: 'Mensajes al WhatsApp para pedidos urgentes', enabled: notifWhatsapp, setter: setNotifWhatsapp, icon: MessageCircle },
  ];

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Configuración</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Gestiona las preferencias de la aplicación</p>
      </div>

      {/* Notificaciones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" /> Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {notifications.map(n => {
            const Icon = n.icon;
            return (
              <div key={n.id} className="flex items-center justify-between p-3 rounded-md border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{n.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{n.desc}</div>
                  </div>
                </div>
                <Switch checked={n.enabled} onCheckedChange={n.setter} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Preferencias de visualización */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" /> Preferencias de visualización
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Escala por defecto del Gantt</Label>
              <Select defaultValue="semana">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semana">Semanal</SelectItem>
                  <SelectItem value="quincena">Quincenal</SelectItem>
                  <SelectItem value="mes">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Período por defecto de cash flow</Label>
              <Select defaultValue="quincena">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semana">Semanal</SelectItem>
                  <SelectItem value="quincena">Quincenal</SelectItem>
                  <SelectItem value="mes">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-md border border-border">
            <div>
              <div className="text-sm font-medium text-foreground">Modo oscuro</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Cambiar la apariencia de la interfaz</div>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Obras gestionadas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" /> Obras gestionadas
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
        </CardContent>
      </Card>

      {/* Datos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" /> Datos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="flex items-center justify-between p-3 rounded-md border border-border">
            <div>
              <div className="text-sm font-medium text-foreground">Exportar datos</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Descargar todas las obras, tareas y configuraciones</div>
            </div>
            <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1" /> Exportar JSON</Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-md border border-destructive/30 bg-destructive/10">
            <div>
              <div className="text-sm font-medium text-red-900">Reiniciar todos los datos</div>
              <div className="text-[11px] text-destructive mt-0.5">Restablecer a los datos de demostración (no se puede deshacer)</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/20"
              onClick={() => {
                if (confirm('¿Reiniciar todos los datos? Esta acción no se puede deshacer.')) {
                  localStorage.removeItem('obras-store');
                  window.location.reload();
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Reiniciar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
            <div>
              <strong>ObraFlow v1.0</strong> · Demo de gestión de obras para constructora.
              <br />Esta es una versión demostrativa. Los datos se guardan localmente en su navegador.
              Para implementación en producción se requiere autenticación, base de datos centralizada y sincronización en tiempo real.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmar eliminar obra */}
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
