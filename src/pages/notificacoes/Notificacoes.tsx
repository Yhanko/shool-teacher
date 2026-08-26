import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Calendar, BookOpen, Check, Loader2, ExternalLink } from 'lucide-react';
import api from '@/services/api/axios';

interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: string;
  priority?: string;
  isRead: boolean;
  createdAt: string;
  
  // Scraper only fields
  isScraped?: boolean;
  sourceUrl?: string;
  sourceName?: string;
}

export function Notificacoes() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todas');
  const [typeFilter, setTypeFilter] = useState<string>('todos');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [localRes, scraperRes] = await Promise.all([
        api.get('/notifications').catch(() => ({ data: [] })),
        api.get('/scraper-notifications').catch(() => ({ data: { data: [] } }))
      ]);

      const localNotes: AppNotification[] = (localRes.data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        type: n.type,
        priority: n.priority,
        isRead: n.isRead,
        createdAt: n.createdAt,
        isScraped: false
      }));

      const scraperNotes: AppNotification[] = (scraperRes.data?.data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        description: n.summary,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.publishedAt || new Date().toISOString(),
        isScraped: true,
        sourceUrl: n.sourceUrl,
        sourceName: n.sourceName
      }));

      const combined = [...localNotes, ...scraperNotes].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(combined);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (n: AppNotification) => {
    try {
      if (n.isScraped) {
        await api.patch(`/scraper-notifications/${n.id}/read`);
        if (n.sourceUrl) window.open(n.sourceUrl, '_blank');
      } else {
        await api.patch(`/notifications/${n.id}/read`);
      }
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      if (n.isScraped) {
        await api.patch(`/scraper-notifications/${n.id}/read`).catch(() => {});
      } else {
        await api.patch(`/notifications/${n.id}/read`).catch(() => {});
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const filtered = notifications.filter(n => {
    if (tab === 'nao-lidas' && n.isRead) return false;
    if (tab === 'lidas' && !n.isRead) return false;
    if (typeFilter !== 'todos' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTypeIcon = (type: string) => {
    if (type === 'event' || type === 'schedule' || type === 'SEMINARIO') return Calendar;
    if (type === 'grade' || type === 'activity' || type === 'CONCURSO') return BookOpen;
    return Bell;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'event': return 'Evento';
      case 'schedule': return 'Horário';
      case 'grade': return 'Nota';
      case 'activity': return 'Actividade';
      case 'NOTICIA': return 'Notícia';
      case 'CONCURSO': return 'Concurso';
      case 'SEMINARIO': return 'Seminário';
      case 'COMUNICADO': return 'Comunicado';
      default: return type;
    }
  };

  const getPriorityColor = (priority?: string) => {
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
        <div className="flex gap-2 items-center">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de publicação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="NOTICIA">Notícias</SelectItem>
              <SelectItem value="CONCURSO">Concursos</SelectItem>
              <SelectItem value="SEMINARIO">Seminários</SelectItem>
              <SelectItem value="COMUNICADO">Comunicados</SelectItem>
              <SelectItem value="event">Eventos da Escola</SelectItem>
              <SelectItem value="grade">Notas e Avaliações</SelectItem>
              <SelectItem value="schedule">Horários</SelectItem>
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button onClick={markAllRead}>
              <Check className="mr-2 h-4 w-4" />Marcar lidas
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100 p-1 flex space-x-1 rounded-lg h-auto">
          <TabsTrigger value="todas" className="px-4 py-2 rounded-md font-medium transition-all data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-600 hover:bg-slate-200">
            Todas ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="nao-lidas" className="px-4 py-2 rounded-md font-medium transition-all data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-600 hover:bg-slate-200">
            Não lidas ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="lidas" className="px-4 py-2 rounded-md font-medium transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-slate-600 hover:bg-slate-200">
            Lidas
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Bell className="w-12 h-12 mb-4 opacity-30" />
                    <p>Nenhuma publicação encontrada</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filtered.map(n => {
                      const Icon = getTypeIcon(n.type);
                      return (
                        <div
                          key={n.id}
                          className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-purple-50/50' : ''}`}
                          onClick={() => markAsRead(n)}
                        >
                          <div className={`p-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-purple-100' : 'bg-slate-100'}`}>
                            <Icon className={`w-5 h-5 ${!n.isRead ? 'text-purple-600' : 'text-slate-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-medium ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</p>
                              {!n.isRead && <Badge variant="default" className="text-xs">Nova</Badge>}
                              <Badge variant={getPriorityColor(n.priority) as any} className="text-xs">{getTypeLabel(n.type)}</Badge>
                              {n.isScraped && <Badge variant="secondary" className="text-xs">{n.sourceName}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.description}</p>
                            <p className="text-xs text-muted-foreground mt-2 font-medium">
                              {new Date(n.createdAt).toLocaleDateString('pt-PT')}
                              {n.isScraped && (
                                <span className="inline-flex items-center ml-4 text-indigo-600 hover:underline">
                                  Ler original <ExternalLink className="w-3 h-3 ml-1" />
                                </span>
                              )}
                            </p>
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
      </Tabs>
    </div>
  );
}
