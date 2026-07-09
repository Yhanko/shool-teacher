import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Calendar, Clock, MapPin, CalendarDays, Info } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Schedule {
  id: string;
  dayOfWeek: string | number;
  startTime: string;
  endTime: string;
  subject?: string;
  classId?: string;
  className?: string;
}

interface ClassInfo {
  id: string;
  name: string;
}

interface EventInfo {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: string;
}

const DAYS_PT: Record<string, string> = {
  MONDAY: 'Segunda-feira', TUESDAY: 'Terça-feira', WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira', FRIDAY: 'Sexta-feira', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
  '0': 'Domingo', '1': 'Segunda-feira', '2': 'Terça-feira', '3': 'Quarta-feira',
  '4': 'Quinta-feira', '5': 'Sexta-feira', '6': 'Sábado',
};

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', '1', '2', '3', '4', '5', '6'];

export function CalendarView() {
  const user = useAuthStore((state) => state.user);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [schedLoading, setSchedLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClasses();
      fetchEvents();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) fetchSchedules(selectedClass);
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const res = await api.get(`/classes/teacher/${user!.id}`);
      const data = res.data || [];
      setClasses(data);
      if (data.length) setSelectedClass(data[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchSchedules = async (classId: string) => {
    setSchedLoading(true);
    try {
      const res = await api.get(`/schedules/class/${classId}`);
      setSchedules(res.data || []);
    } catch (e) {
      console.error(e);
      setSchedules([]);
    } finally {
      setSchedLoading(false);
    }
  };

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await api.get(`/events`);
      setEvents(res.data || []);
    } catch (e) {
      console.error('Failed to fetch events', e);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  // Group schedules by day
  const grouped = schedules.reduce((acc, s) => {
    const day = String(s.dayOfWeek);
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {} as Record<string, Schedule[]>);

  const sortedDays = Object.keys(grouped).sort((a, b) => {
    const ai = DAY_ORDER.indexOf(a);
    const bi = DAY_ORDER.indexOf(b);
    return ai - bi;
  });

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Horários & Calendário</h1>
          <p className="text-muted-foreground">Gerencie suas aulas e veja os eventos da escola</p>
        </div>
      </div>

      <Tabs defaultValue="horarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="horarios">Horários de Aulas</TabsTrigger>
          <TabsTrigger value="eventos">Eventos da Escola</TabsTrigger>
        </TabsList>

        <TabsContent value="horarios" className="space-y-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="w-64">
              <Label>Turma</Label>
              <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>Selecionar turma</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {schedLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : sortedDays.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum horário definido para esta turma.</p>
                <p className="text-sm mt-1">O administrador pode criar horários em Gestão → Horários.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedDays.map(day => (
                <Card key={day} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 py-3">
                    <CardTitle className="text-white text-sm font-semibold">
                      {DAYS_PT[day] || day}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(s => (
                      <div key={s.id} className="flex items-start gap-3 p-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {(typeof s.subject === 'object' && s.subject !== null ? (s.subject as any).name : s.subject) || classes.find(c => c.id === s.classId)?.name || 'Aula'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {s.startTime} — {s.endTime}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{s.startTime}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="eventos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-5 w-5" />
                Calendário Global da Instituição
              </CardTitle>
              <CardDescription>
                Provas globais, atividades extracurriculares, feriados e reuniões.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum evento agendado para a instituição.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()).map(event => {
                    const eventDate = new Date(event.date);
                    const isValidDate = !isNaN(eventDate.getTime());
                    
                    return (
                    <div key={event.id} className="p-4 rounded-xl border flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-slate-50 transition-colors">
                      <div className="flex-shrink-0 bg-blue-100 text-blue-700 p-3 rounded-lg flex flex-col items-center justify-center min-w-[80px]">
                        <span className="text-sm font-bold uppercase">{isValidDate ? format(eventDate, 'MMM', { locale: ptBR }) : '---'}</span>
                        <span className="text-2xl font-black">{isValidDate ? format(eventDate, 'dd') : '--'}</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{event.title}</h3>
                          <Badge variant="secondary">{event.type}</Badge>
                        </div>
                        {event.description && (
                          <p className="text-muted-foreground text-sm mb-2">{event.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <div className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {isValidDate ? format(eventDate, 'HH:mm') : '--:--'}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}