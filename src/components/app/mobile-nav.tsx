'use client';

import { useAppStore } from '@/lib/store';
import type { ViewKey } from '@/types';
import { cn } from '@/lib/utils';
import {
  Calendar, Lock, GitBranch, GanttChartSquare, HardHat, Bell,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const MOBILE_NAV_ITEMS: { key: ViewKey; label: string; icon: any }[] = [
  { key: 'mobile_today',     label: 'Hoy',       icon: Calendar },
  { key: 'mobile_blockers',  label: 'Bloqueos',  icon: Lock },
  { key: 'mobile_sequence',  label: 'Secuencia', icon: GitBranch },
  { key: 'gantt',            label: 'Gantt',     icon: GanttChartSquare },
];

export function MobileBottomNav() {
  const { activeView, setActiveView, notifications } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border grid grid-cols-4 z-40 pb-[env(safe-area-inset-bottom)]">
      {MOBILE_NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const active = activeView === item.key;
        return (
          <button
            key={item.key}
            onClick={() => setActiveView(item.key)}
            className={cn(
              'flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('w-5 h-5', active && 'scale-110')} />
            <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
              {item.label}
            </span>
            {item.key === 'mobile_blockers' && unreadCount > 0 && (
              <span className="absolute top-1 right-1/2 mr-3 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {active && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-b-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function MobileTopBar() {
  const { obras, selectedObraId, setSelectedObra, notifications, markAllNotificationsRead } = useAppStore();
  const selectedObra = obras.find(o => o.id === selectedObraId);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-card border-b border-border px-3 py-2 sticky top-0 z-30 flex items-center gap-2">
      {/* Logo */}
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
        <HardHat className="w-5 h-5" />
      </div>

      {/* Selector de obra */}
      <div className="flex-1 min-w-0">
        <Select value={selectedObraId} onValueChange={(v) => setSelectedObra(v as any)}>
          <SelectTrigger className="h-8 text-sm border-0 px-1 focus:ring-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {selectedObra && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: selectedObra.color }} />
              )}
              <SelectValue placeholder="Seleccionar obra" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {obras.map(o => (
              <SelectItem key={o.id} value={o.id}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />
                  <span className="truncate">{o.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ThemeToggle />

      {/* Notificaciones */}
      <Button
        variant="ghost"
        size="icon"
        className="relative w-9 h-9 shrink-0"
        onClick={() => {
          if (unreadCount > 0) markAllNotificationsRead();
        }}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    </header>
  );
}
