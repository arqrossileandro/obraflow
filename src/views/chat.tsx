'use client';

import { useAppStore, getChatMessagesByObra } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Paperclip, Smile, Search, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function ChatView() {
  const { obras, selectedObraId, chatMessages, members, currentUser, sendChatMessage } = useAppStore();
  const obra = obras.find(o => o.id === selectedObraId);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const obraMessages = obra ? getChatMessagesByObra(chatMessages, obra.id) : [];
  const filtered = search
    ? obraMessages.filter(m => m.text.toLowerCase().includes(search.toLowerCase()))
    : obraMessages;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [obraMessages.length]);

  if (!obra) return null;

  const handleSend = () => {
    if (!message.trim()) return;
    sendChatMessage(obra.id, message.trim());
    setMessage('');
  };

  const groupByDay = (messages: typeof obraMessages) => {
    const groups: Record<string, typeof obraMessages> = {};
    messages.forEach(m => {
      const day = m.createdAt.slice(0, 10);
      if (!groups[day]) groups[day] = [];
      groups[day].push(m);
    });
    return groups;
  };

  const grouped = groupByDay(filtered);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Chat interno del equipo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{obra.name} · {obra.memberIds.length} miembros</p>
        </div>
        <Badge variant="outline" className="text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" /> {obra.memberIds.length} conectados
        </Badge>
      </div>

      <Card className="flex flex-col h-[calc(100vh-12rem)] overflow-hidden">
        {/* Header del chat */}
        <div className="border-b border-border p-3 flex items-center gap-2 bg-muted/30">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Canal general de obra</span>
          <div className="ml-auto relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
            <Input
              placeholder="Buscar mensajes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-7 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(grouped).map(([day, msgs]) => (
            <div key={day}>
              <div className="text-center my-3">
                <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {format(parseISO(day + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="space-y-3">
                {msgs.map((m, idx) => {
                  const author = members.find(x => x.id === m.authorId);
                  const isMe = m.authorId === currentUser.id;
                  const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                  const showAvatar = !prevMsg || prevMsg.authorId !== m.authorId;
                  return (
                    <div key={m.id} className={cn('flex gap-2.5', isMe && 'flex-row-reverse')}>
                      <div className="w-8 shrink-0">
                        {showAvatar && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback style={{ background: author?.avatarColor }} className="text-white text-[10px] font-semibold">
                              {author?.initials}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className={cn('max-w-[70%]', isMe && 'text-right')}>
                        {showAvatar && (
                          <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-2">
                            <span className="font-medium">{isMe ? 'Tú' : author?.name}</span>
                            <span>{format(parseISO(m.createdAt), "HH:mm")}</span>
                          </div>
                        )}
                        <div className={cn(
                          'inline-block px-3 py-2 rounded-lg text-sm',
                          isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'
                        )}>
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground/70 py-12">
              {search ? 'No se encontraron mensajes.' : 'No hay mensajes aún. Inicia la conversación!'}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 flex items-center gap-2 bg-card">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Input
            placeholder={`Escribir mensaje a ${obra.name}...`}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            className="flex-1"
          />
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Smile className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button onClick={handleSend} disabled={!message.trim()} size="sm">
            <Send className="w-3.5 h-3.5 mr-1" /> Enviar
          </Button>
        </div>
      </Card>
    </div>
  );
}
