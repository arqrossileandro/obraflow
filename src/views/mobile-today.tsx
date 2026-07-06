'use client';

import { useAppStore } from '@/lib/store';
import { getTodayTasks, URGENCY_STYLES, getTaskUrgency, formatRelativeDate } from '@/lib/workday';
import type { Task } from '@/types';
import { useState, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Camera, Mic, MicOff, X, AlertCircle, CheckCircle2, Lock, Clock,
  Image as ImageIcon, Trash2, Send, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const QUICK_VALUES = [25, 50, 75, 100];

export function MobileTodayView() {
  const {
    tasks, dependencies, selectedObraId, members, currentUser,
    setTaskProgressMobile, addTaskPhoto, deleteTaskPhoto, addVoiceNote,
    setActiveView,
  } = useAppStore();

  const todayTasks = getTodayTasks(tasks, dependencies, selectedObraId as string);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState<Record<string, string>>({});

  // Agrupar por gremio
  const byGuild = todayTasks.reduce<Record<string, typeof todayTasks>>((acc, t) => {
    const g = t.task.guild || 'Sin gremio';
    if (!acc[g]) acc[g] = [];
    acc[g].push(t);
    return acc;
  }, {});

  if (todayTasks.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        <div>
          <h3 className="text-base font-semibold text-foreground">Sin tareas activas hoy</h3>
          <p className="text-xs text-muted-foreground mt-1">
            No hay tareas en ejecución para hoy. Revisá el Gantt o el listado para ver próximas.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setActiveView('gantt')}>
          Ver Gantt
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-3 py-3 bg-card border-b border-border sticky top-0 z-10">
        <h2 className="text-base font-bold text-foreground">Hoy</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {todayTasks.length} tareas activas · {todayTasks.filter(t => t.isOverdue).length} atrasadas
        </p>
      </div>

      {Object.entries(byGuild).map(([guild, items]) => (
        <div key={guild} className="mb-4">
          <div className="px-3 py-1.5 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide sticky top-[64px] z-5">
            {guild} · {items.length}
          </div>
          <div className="space-y-2 p-3 pt-2">
            {items.map(({ task, blockers, isOverdue, daysLate, isReadyToStart }) => (
              <TaskCard
                key={task.id}
                task={task}
                isOverdue={isOverdue}
                daysLate={daysLate}
                isReadyToStart={isReadyToStart}
                blockers={blockers}
                expanded={expandedTaskId === task.id}
                onToggle={() => setExpandedTaskId(prev => prev === task.id ? null : task.id)}
                onProgress={(p) => setTaskProgressMobile(task.id, p)}
                onPhoto={(dataUrl, geo) => {
                  addTaskPhoto(task.id, {
                    dataUrl,
                    takenAt: new Date().toISOString(),
                    takenById: currentUser.id,
                    takenByName: currentUser.name,
                    geo,
                    progressAtCapture: task.progress,
                    caption: photoCaption[task.id],
                  });
                  setPhotoCaption(prev => ({ ...prev, [task.id]: '' }));
                }}
                onDeletePhoto={(pid) => deleteTaskPhoto(task.id, pid)}
                onVoiceNote={(dataUrl, durationSec) => {
                  addVoiceNote(task.id, {
                    dataUrl,
                    durationSec,
                    takenAt: new Date().toISOString(),
                    takenById: currentUser.id,
                  });
                }}
                members={members}
                captionValue={photoCaption[task.id] || ''}
                onCaptionChange={(v) => setPhotoCaption(prev => ({ ...prev, [task.id]: v }))}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// TaskCard — tarjeta expandible con slider, quick buttons, foto, voz
// ============================================================================
interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  daysLate: number;
  isReadyToStart: boolean;
  blockers: { blockingTask: Task; dep: any }[];
  expanded: boolean;
  onToggle: () => void;
  onProgress: (p: number) => void;
  onPhoto: (dataUrl: string, geo?: { lat: number; lng: number }) => void;
  onDeletePhoto: (pid: string) => void;
  onVoiceNote: (dataUrl: string, durationSec: number) => void;
  members: any[];
  captionValue: string;
  onCaptionChange: (v: string) => void;
}

function TaskCard({
  task, isOverdue, daysLate, isReadyToStart, blockers,
  expanded, onToggle, onProgress, onPhoto, onDeletePhoto, onVoiceNote,
  captionValue, onCaptionChange,
}: TaskCardProps) {
  const urgency = isOverdue ? 'overdue' : blockers.length > 0 ? 'blocked' : 'today';
  const style = URGENCY_STYLES[urgency];

  return (
    <div className={cn('rounded-xl border-2 overflow-hidden', style.border, style.bg)}>
      {/* Header siempre visible */}
      <button
        onClick={onToggle}
        className="w-full p-3 text-left active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start gap-2">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0',
            isOverdue ? 'bg-red-500' : isReadyToStart ? 'bg-emerald-500' : 'bg-amber-500'
          )} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground leading-tight">
              {task.name}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
              <span className={cn('font-medium', style.text)}>
                {isOverdue ? `Atrasada ${daysLate}d` : isReadyToStart ? 'Lista para arrancar' : `${blockers.length} bloqueo${blockers.length > 1 ? 's' : ''}`}
              </span>
              <span>·</span>
              <span>Vence {formatRelativeDate(parseISO(task.endDate))}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-foreground leading-none">{task.progress}%</div>
          </div>
        </div>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
          {/* Bloqueos */}
          {blockers.length > 0 && (
            <div className="rounded-lg bg-amber-100 dark:bg-amber-950/40 p-2 space-y-1">
              <div className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Falta terminar:
              </div>
              {blockers.map(({ blockingTask }) => (
                <div key={blockingTask.id} className="flex items-center gap-2 text-[11px]">
                  <span className="text-amber-700 dark:text-amber-300 truncate flex-1">↳ {blockingTask.name}</span>
                  <span className="font-medium text-amber-800 dark:text-amber-200">{blockingTask.progress}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Barra de progreso actual */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-medium text-foreground">Avance actual</span>
              <span className="text-muted-foreground">Tocá un valor para actualizar</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all rounded-full',
                  task.progress >= 100 ? 'bg-emerald-500' : task.progress >= 50 ? 'bg-sky-500' : 'bg-amber-500'
                )}
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>

          {/* Quick buttons */}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_VALUES.map(v => (
              <button
                key={v}
                onClick={() => onProgress(v)}
                className={cn(
                  'py-3 rounded-lg text-sm font-bold transition-all active:scale-95',
                  task.progress === v
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : 'bg-card border border-border text-foreground hover:border-primary/50'
                )}
              >
                {v}%
              </button>
            ))}
          </div>

          {/* Slider fino */}
          <div>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={task.progress}
              onChange={(e) => onProgress(Number(e.target.value))}
              className="w-full h-8 accent-primary cursor-pointer"
              style={{ touchAction: 'pan-y' }}
            />
            <div className="flex justify-between text-[9px] text-muted-foreground -mt-1">
              {[0, 25, 50, 75, 100].map(v => <span key={v}>{v}</span>)}
            </div>
          </div>

          {/* Foto + Voz */}
          <div className="grid grid-cols-2 gap-2">
            <PhotoButton onPhoto={onPhoto} />
            <VoiceButton onVoiceNote={onVoiceNote} />
          </div>

          {/* Caption para próxima foto */}
          {captionValue !== undefined && (
            <input
              type="text"
              value={captionValue}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Descripción para próxima foto (opcional)"
              className="w-full text-xs px-2 py-1.5 rounded-md border border-border bg-card"
            />
          )}

          {/* Fotos existentes */}
          {task.photos && task.photos.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Fotos de avance ({task.photos.length})
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {task.photos.map(photo => (
                  <div key={photo.id} className="relative group aspect-square rounded-md overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.dataUrl} alt={photo.caption || 'Avance'} className="w-full h-full object-cover" />
                    <button
                      onClick={() => onDeletePhoto(photo.id)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Eliminar foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {photo.progressAtCapture !== undefined && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5 text-[8px] text-white font-semibold">
                        {photo.progressAtCapture}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice notes existentes */}
          {task.voiceNotes && task.voiceNotes.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Notas de voz ({task.voiceNotes.length})
              </div>
              <div className="space-y-1">
                {task.voiceNotes.map(vn => (
                  <audio key={vn.id} controls src={vn.dataUrl} className="w-full h-8" />
                ))}
              </div>
            </div>
          )}

          {/* Footer informativo */}
          <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/30">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(task.startDate), "dd MMM", { locale: es })} - {format(parseISO(task.endDate), "dd MMM", { locale: es })}
            </span>
            {task.priority === 'critica' && (
              <span className="text-red-600 font-semibold flex items-center gap-0.5">
                <AlertCircle className="w-3 h-3" /> Crítica
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PhotoButton — botón grande que abre la cámara
// ============================================================================
function PhotoButton({ onPhoto }: { onPhoto: (dataUrl: string, geo?: { lat: number; lng: number }) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [taking, setTaking] = useState(false);

  const handleFile = async (file: File) => {
    setTaking(true);
    try {
      // Redimensionar a max 1024x1024 para no reventar localStorage
      const dataUrl = await resizeImage(file, 1024);
      let geo: { lat: number; lng: number } | undefined;
      try {
        geo = await getCurrentPosition();
      } catch {
        // Geo denegado — la foto se guarda igual
      }
      onPhoto(dataUrl, geo);
    } catch (e) {
      console.error('Error procesando foto:', e);
    } finally {
      setTaking(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={taking}
        className="py-3 rounded-lg bg-card border border-border flex items-center justify-center gap-2 text-xs font-medium text-foreground active:scale-95 transition disabled:opacity-50"
      >
        <Camera className="w-4 h-4" />
        {taking ? 'Procesando...' : 'Foto'}
      </button>
    </>
  );
}

// ============================================================================
// VoiceButton — graba nota de voz con MediaRecorder
// ============================================================================
function VoiceButton({ onVoiceNote }: { onVoiceNote: (dataUrl: string, durationSec: number) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const dataUrl = await blobToBase64(blob);
        const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        onVoiceNote(dataUrl, durationSec);
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mr.start();
      mediaRecorderRef.current = mr;
      startTimeRef.current = Date.now();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= 60) {
            stop();
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      console.error('Error accediendo al micrófono:', e);
      alert('No se pudo acceder al micrófono. Verificá los permisos.');
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      onClick={recording ? stop : start}
      className={cn(
        'py-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-medium active:scale-95 transition',
        recording
          ? 'bg-red-500 text-white border-red-500'
          : 'bg-card border-border text-foreground'
      )}
    >
      {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      {recording ? `Grabando ${seconds}s` : 'Nota voz'}
    </button>
  );
}

// ============================================================================
// Utilidades
// ============================================================================
function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas no disponible'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // JPEG 0.7 — balance tamaño/calidad
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation no disponible'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}
