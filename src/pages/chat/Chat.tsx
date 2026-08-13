import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Search, Loader2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/axios';

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender?: { name: string; role: string };
  receiverId?: string;
  receiver?: { name: string };
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
  lastMessage?: string;
  hasUnread?: boolean;
  unreadCount?: number;
}

export function Chat() {
  const user = useAuthStore((state) => state.user);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<'contacts' | 'chat'>('contacts');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContacts();
  }, [user]);

  useEffect(() => {
    if (selected) fetchMessages(selected.id);
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/messages/contacts');
      const raw: any[] = res.data || [];
      // Backend returns: { id, nome, tipo, ultimaMensagem, hora, naoLidas, online }
      // Map to Contact interface
      const mapped: Contact[] = raw.map((c) => ({
        id: c.id,
        name: c.nome ?? c.name ?? '(sem nome)',
        role: (c.tipo ?? c.role ?? '').toUpperCase(),
        lastMessage: c.ultimaMensagem ?? c.lastMessage ?? '',
        hasUnread: (c.naoLidas ?? 0) > 0,
        unreadCount: c.naoLidas ?? 0,
      }));
      setContacts(mapped);
    } catch (e) {
      console.error('Erro ao carregar contactos:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const res = await api.get(`/messages/conversation/${contactId}`);
      const fetchedMessages = res.data || [];
      setMessages(fetchedMessages);
      
      // Marcar mensagens não lidas como lidas
      const unread = fetchedMessages.filter((m: any) => m.senderId === contactId && !m.read);
      if (unread.length > 0) {
        await Promise.all(unread.map((m: any) => api.patch(`/messages/${m.id}/read`)));
        
        // Remover o ponto vermelho localmente
        setContacts(prev => prev.map(c => 
          c.id === contactId ? { ...c, hasUnread: false } : c
        ));
      }
    } catch {
      try {
        const res = await api.get('/messages');
        const filtered = (res.data || []).filter((m: Message) =>
          (m.senderId === user?.id && m.receiverId === contactId) ||
          (m.senderId === contactId && m.receiverId === user?.id)
        );
        setMessages(filtered);
      } catch (e) { console.error(e); }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selected) return;
    setSending(true);
    try {
      await api.post('/messages', {
        content: newMessage.trim(),
        receiverId: selected.id,
      });
      setNewMessage('');
      fetchMessages(selected.id);
    } catch (e) {
      alert('Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  // Group contacts by role category
  const grouped = {
    students: filteredContacts.filter(c => c.role === 'STUDENT'),
    parents:  filteredContacts.filter(c => c.role === 'PARENT'),
    staff:    filteredContacts.filter(c => ['ADMIN','SUPER_ADMIN','SECRETARY','TEACHER'].includes(c.role)),
  };

  const getRolePT = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: 'Diretor', TEACHER: 'Professor', STUDENT: 'Aluno',
      PARENT: 'Encarregado', SECRETARY: 'Secretário', SUPER_ADMIN: 'Super Admin'
    };
    return map[role] || role;
  };

  const getAvatarClass = (role: string) => {
    const map: Record<string, string> = {
      STUDENT:    'bg-gradient-to-br from-emerald-500 to-teal-600',
      PARENT:     'bg-gradient-to-br from-orange-500 to-amber-600',
      ADMIN:      'bg-gradient-to-br from-purple-500 to-indigo-600',
      SUPER_ADMIN:'bg-gradient-to-br from-purple-500 to-indigo-600',
      SECRETARY:  'bg-gradient-to-br from-blue-400 to-cyan-500',
      TEACHER:    'bg-gradient-to-br from-blue-500 to-indigo-600',
    };
    return map[role] || 'bg-gradient-to-br from-slate-400 to-slate-600';
  };

  const ContactItem = ({ c }: { c: Contact }) => (
    <div
      key={c.id}
      onClick={() => {
        setSelected(c);
        setMobileView('chat');
      }}
      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors border-b ${selected?.id === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
    >
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarFallback className={`${getAvatarClass(c.role)} text-white text-sm font-bold`}>
          {c.name?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className="font-medium text-sm truncate">{c.name}</p>
          {(c.unreadCount ?? 0) > 0 && (
            <span className="flex-shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {c.unreadCount}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{getRolePT(c.role)}</p>
        {c.lastMessage && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{c.lastMessage}</p>
        )}
      </div>
    </div>
  );

  const GroupSection = ({ title, items }: { title: string; items: Contact[] }) => {
    if (items.length === 0) return null;
    return (
      <>
        <div className="px-3 py-1.5 bg-slate-50 border-b">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        </div>
        {items.map(c => <ContactItem key={c.id} c={c} />)}
      </>
    );
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)] flex gap-0 sm:gap-4">
      {/* Contacts sidebar — hidden on mobile when in chat view */}
      <Card className={`
        flex-col
        w-full sm:w-80 sm:flex-shrink-0
        ${mobileView === 'contacts' ? 'flex' : 'hidden'}
        sm:flex
      `}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />Mensagens
            {contacts.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0) > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                {contacts.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0)}
              </span>
            )}
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Pesquisar contacto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {filteredContacts.length === 0 ? (
              <p className="text-center text-muted-foreground p-6 text-sm">Nenhum contacto encontrado</p>
            ) : (
              <>
                <GroupSection title="Alunos" items={grouped.students} />
                <GroupSection title="Encarregados de Educação" items={grouped.parents} />
                <GroupSection title="Direção & Secretariado" items={grouped.staff} />
              </>
            )}
          </ScrollArea>
        </CardContent>

      </Card>

      {/* Chat area — hidden on mobile when in contacts view */}
      <Card className={`
        flex-col overflow-hidden
        w-full
        ${mobileView === 'chat' ? 'flex' : 'hidden'}
        sm:flex sm:flex-1
      `}>
        {selected ? (
          <>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center gap-3">
                {/* Back button — mobile only */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => setMobileView('contacts')}
                  aria-label="Voltar aos contactos"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar>
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold">
                    {selected.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{getRolePT(selected.role)}</p>
                </div>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-3 sm:p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                  <p>Nenhuma mensagem ainda. Diga olá! 👋</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(m => {
                    const isMine = m.senderId === user?.id;
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 ${isMine ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                          <p className="text-sm">{m.content}</p>
                          <p className={`text-xs mt-1 ${isMine ? 'text-blue-200' : 'text-muted-foreground'}`}>
                            {new Date(m.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </ScrollArea>
            <div className="p-3 sm:p-4 border-t">
              <form onSubmit={sendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !newMessage.trim()} size="icon" className="bg-blue-600 flex-shrink-0">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-slate-50/50">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-medium text-slate-800 mb-2">Bem-vindo ao Chat</h3>
            <p className="max-w-md">Selecione um contacto na barra lateral para ver as mensagens ou iniciar uma nova conversa.</p>
          </div>
        )}
      </Card>
    </div>
  );
}