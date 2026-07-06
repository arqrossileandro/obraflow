'use client';

import { useAppStore } from '@/lib/store';
import { Sidebar, Topbar } from '@/components/app/sidebar';
import { DashboardView } from '@/views/dashboard';
import { GanttView } from '@/views/gantt';
import { TaskListView } from '@/views/task-list';
import { CalendarView } from '@/views/calendar-view';
import { DocumentosView } from '@/views/documentos';
import { CertificadosView } from '@/views/certificados';
import { FinanzasView } from '@/views/finanzas';
import { ChatView } from '@/views/chat';
import { KanbanView } from '@/views/kanban';
import { MembersView } from '@/views/members';
import { SettingsView } from '@/views/settings';
import { TaskEditModal } from '@/components/app/task-edit-modal';
import { OverviewView } from '@/views/overview';
import { MobileTodayView } from '@/views/mobile-today';
import { MobileBlockersView } from '@/views/mobile-blockers';
import { MobileSequenceView } from '@/views/mobile-sequence';
import { MobileBottomNav, MobileTopBar } from '@/components/app/mobile-nav';
import { AppLayout } from '@/components/app/app-layout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect } from 'react';

function HomeInner() {
  const { activeView, selectedObraId, setActiveView } = useAppStore();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile && selectedObraId !== 'all') {
      const mobileViews = ['mobile_today', 'mobile_blockers', 'mobile_sequence', 'settings', 'members', 'chat'];
      const desktopOnlyViews = ['dashboard', 'gantt', 'task_list', 'calendar', 'documentos', 'certificados', 'finanzas', 'kanban'];
      if (desktopOnlyViews.includes(activeView) && !mobileViews.includes(activeView)) {
        if (activeView !== 'gantt') {
          setActiveView('mobile_today');
        }
      }
    }
  }, [isMobile, activeView, selectedObraId, setActiveView]);

  // MOBILE LAYOUT
  if (isMobile && selectedObraId !== 'all') {
    const isMobileView = ['mobile_today', 'mobile_blockers', 'mobile_sequence'].includes(activeView);
    const isOtherViewAllowed = ['gantt', 'settings', 'members', 'chat'].includes(activeView);

    if (isMobileView || isOtherViewAllowed) {
      return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <MobileTopBar />
          <main className="flex-1 overflow-y-auto pb-16">
            {activeView === 'mobile_today' && <MobileTodayView />}
            {activeView === 'mobile_blockers' && <MobileBlockersView />}
            {activeView === 'mobile_sequence' && <MobileSequenceView />}
            {activeView === 'gantt' && <GanttView />}
            {activeView === 'chat' && <ChatView />}
            {activeView === 'settings' && <SettingsView />}
            {activeView === 'members' && <MembersView />}
          </main>
          <MobileBottomNav />
          <TaskEditModal />
        </div>
      );
    }
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto pb-16">
          <MobileTodayView />
        </main>
        <MobileBottomNav />
        <TaskEditModal />
      </div>
    );
  }

  // DESKTOP LAYOUT
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-x-hidden">
          {selectedObraId === 'all' && activeView !== 'settings' && activeView !== 'members' ? (
            <OverviewView />
          ) : (
            <>
              {activeView === 'dashboard' && <DashboardView />}
              {activeView === 'gantt' && <GanttView />}
              {activeView === 'task_list' && <TaskListView />}
              {activeView === 'calendar' && <CalendarView />}
              {activeView === 'documentos' && <DocumentosView />}
              {activeView === 'certificados' && <CertificadosView />}
              {activeView === 'finanzas' && <FinanzasView />}
              {activeView === 'chat' && <ChatView />}
              {activeView === 'kanban' && <KanbanView />}
              {activeView === 'members' && <MembersView />}
              {activeView === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>
      <TaskEditModal />
    </div>
  );
}

export default function Home() {
  return (
    <AppLayout>
      <HomeInner />
    </AppLayout>
  );
}
