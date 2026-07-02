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

export default function Home() {
  const { activeView, selectedObraId } = useAppStore();

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

