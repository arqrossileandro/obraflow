'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import {
  obraFromDB, taskFromDB, materialFromDB, depFromDB, cacFromDB,
  fetchAllData,
} from '@/lib/sync';

// ============================================================================
// RealtimeSync — suscribe a cambios en Supabase y actualiza el store Zustand
// ============================================================================
// Se monta después del login. Cada tabla tiene su canal de realtime.
// ============================================================================

export function RealtimeSync() {
  const { user, profile } = useAuth();
  const store = useAppStore();

  useEffect(() => {
    if (!user) return;

    // 1. Cargar datos iniciales
    (async () => {
      const data = await fetchAllData(user.id);
      if (data) {
        store.hydrateFromServer(data);
      }
    })();

    // 2. Suscripción realtime a obras
    const obrasChannel = supabase
      .channel('obras-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'obras' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          store.upsertObraLocal(obraFromDB(payload.new));
        } else if (payload.eventType === 'UPDATE') {
          store.upsertObraLocal(obraFromDB(payload.new));
        } else if (payload.eventType === 'DELETE') {
          store.removeObraLocal(payload.old.id);
        }
      })
      .subscribe();

    // 3. Tareas
    const tasksChannel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Traer la tarea completa con sus relaciones
          supabase.from('tasks').select('*, task_photos(*), task_voice_notes(*), task_assignees(user_id)')
            .eq('id', payload.new.id).single()
            .then(({ data }) => { if (data) store.upsertTaskLocal(taskFromDB(data)); });
        } else if (payload.eventType === 'UPDATE') {
          supabase.from('tasks').select('*, task_photos(*), task_voice_notes(*), task_assignees(user_id)')
            .eq('id', payload.new.id).single()
            .then(({ data }) => { if (data) store.upsertTaskLocal(taskFromDB(data)); });
        } else if (payload.eventType === 'DELETE') {
          store.removeTaskLocal(payload.old.id);
        }
      })
      .subscribe();

    // 4. Dependencias
    const depsChannel = supabase
      .channel('deps-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dependencies' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          store.upsertDependencyLocal(depFromDB(payload.new));
        } else if (payload.eventType === 'DELETE') {
          store.removeDependencyLocal(payload.old.id);
        }
      })
      .subscribe();

    // 5. Materiales
    const matChannel = supabase
      .channel('materials-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          store.upsertMaterialLocal(materialFromDB(payload.new));
        } else if (payload.eventType === 'DELETE') {
          store.removeMaterialLocal(payload.old.id);
        }
      })
      .subscribe();

    // 6. Photos
    const photosChannel = supabase
      .channel('photos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_photos' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          // Cargar URL firmada
          const { data: urlData } = await supabase.storage
            .from('task-photos')
            .createSignedUrl(payload.new.storage_path, 3600);
          store.upsertPhotoLocal({
            id: payload.new.id,
            taskId: payload.new.task_id,
            dataUrl: urlData?.signedUrl || '',
            takenAt: payload.new.taken_at,
            takenById: payload.new.taken_by,
            caption: payload.new.caption,
            progressAtCapture: payload.new.progress_at_capture,
            geo: payload.new.geo_lat ? { lat: Number(payload.new.geo_lat), lng: Number(payload.new.geo_lng) } : undefined,
          });
        } else if (payload.eventType === 'DELETE') {
          store.removePhotoLocal(payload.old.task_id, payload.old.id);
        }
      })
      .subscribe();

    // 7. Voice notes
    const voiceChannel = supabase
      .channel('voice-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_voice_notes' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data: urlData } = await supabase.storage
            .from('voice-notes')
            .createSignedUrl(payload.new.storage_path, 3600);
          store.upsertVoiceNoteLocal({
            id: payload.new.id,
            taskId: payload.new.task_id,
            dataUrl: urlData?.signedUrl || '',
            durationSec: Number(payload.new.duration_sec || 0),
            takenAt: payload.new.taken_at,
            takenById: payload.new.taken_by,
          });
        } else if (payload.eventType === 'DELETE') {
          store.removeVoiceNoteLocal(payload.old.task_id, payload.old.id);
        }
      })
      .subscribe();

    // 8. Comments
    const commentsChannel = supabase
      .channel('comments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          store.upsertCommentLocal({
            id: payload.new.id,
            taskId: payload.new.task_id,
            authorId: payload.new.author_id,
            text: payload.new.text,
            createdAt: payload.new.created_at,
          });
        }
      })
      .subscribe();

    // 9. Chat messages
    const chatChannel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          store.upsertChatMessageLocal({
            id: payload.new.id,
            obraId: payload.new.obra_id,
            authorId: payload.new.author_id,
            text: payload.new.text,
            createdAt: payload.new.created_at,
          });
        }
      })
      .subscribe();

    // 10. CAC data
    const cacChannel = supabase
      .channel('cac-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cac_data' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          store.upsertCacLocal(cacFromDB(payload.new));
        } else if (payload.eventType === 'DELETE') {
          store.removeCacLocal(payload.old.month);
        }
      })
      .subscribe();

    // 11. Notifications
    const notifChannel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          store.upsertNotificationLocal({
            id: payload.new.id,
            obraId: payload.new.obra_id,
            taskId: payload.new.task_id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            createdAt: payload.new.created_at,
            read: payload.new.read,
            severity: payload.new.severity,
          });
        } else if (payload.eventType === 'UPDATE') {
          store.upsertNotificationLocal({
            id: payload.new.id,
            obraId: payload.new.obra_id,
            taskId: payload.new.task_id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            createdAt: payload.new.created_at,
            read: payload.new.read,
            severity: payload.new.severity,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(obrasChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(depsChannel);
      supabase.removeChannel(matChannel);
      supabase.removeChannel(photosChannel);
      supabase.removeChannel(voiceChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(cacChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [user]);

  return null;
}
