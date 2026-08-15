import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Calendar, BookOpen, Check, Loader2 } from 'lucide-react';
import api from '@/services/api/axios';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

export function Notificacoes() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todas');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      await markAsRead(n.id).catch(() => {});
    }
  };

  const filtered = tab === 'todas' ? notifications : tab === 'nao-lidas' ? notifications.filter(n => !n.isRead) : notifications.filter(n => n.isRead);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTypeIcon = (type: string) => {
    if (type === 'event' || type === 'schedule') return Calendar;
    if (type === 'grade' || type === 'activity') return BookOpen;
    return Bell;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllRead}>
            <Check className="mr-2 h-4 w-4" />Marcar todas como lidas
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todas">Todas ({notifications.length})</TabsTrigger>
          <TabsTrigger value="nao-lidas">Não lidas ({unreadCount})</TabsTrigger>
          <TabsTrigger value="lidas">Lidas</TabsTrigger>
        </TabsList>

        {['todas', 'nao-lidas', 'lidas'].map(t => (
          <TabsContent key={t} value={t}>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[60vh]">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Bell className="w-12 h-12 mb-4 opacity-30" />
                      <p>Nenhuma notificação</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filtered.map(n => {
                        const Icon = getTypeIcon(n.type);
                        return (
                          <div
                            key={n.id}
                            className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-purple-50/50' : ''}`}
                            onClick={() => !n.isRead && markAsRead(n.id)}
                          >
                            <div className={`p-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-purple-100' : 'bg-slate-100'}`}>
                              <Icon className={`w-5 h-5 ${!n.isRead ? 'text-purple-600' : 'text-slate-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-medium ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</p>
                                {!n.isRead && <Badge variant="default" className="text-xs">Nova</Badge>}
                                <Badge variant={getPriorityColor(n.priority) as any} className="text-xs">{n.priority}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString('pt-PT')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
