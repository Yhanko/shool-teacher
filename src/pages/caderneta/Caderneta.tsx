import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, BookOpen, Users, CalendarDays, ClipboardCheck, Edit3 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FaltasTab } from './FaltasTab';
import { AcTab } from './AcTab';
import { SumariosTab } from './SumariosTab';

// Interfaces
interface Student {
  id: string;
  name: string;
  email: string;
  code?: string;
}

interface ClassInfo {
  id: string;
  name: string;
  academicLevel: string;
  course?: string;
  roomName: string;
  students?: Student[];
}

interface Subject {
  id: string;
  name: string;
}

export function Caderneta() {
  const user = useAuthStore((state) => state.user);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [term, setTerm] = useState('first');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClass) fetchSubjects();
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const res = await api.get(`/classes/teacher/${user!.id}`);
      const data = res.data || [];
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get(`/classes/${selectedClass!.id}/subjects`);
      const subs = res.data.map((cs: any) => cs.subject);
      setSubjects(subs);
      if (subs.length > 0) {
        setSelectedSubject(subs[0].id);
      } else {
        setSelectedSubject('');
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-purple-600" />
            Caderneta do Professor
          </h1>
          <p className="text-muted-foreground">O seu documento oficial de controlo pedagógico</p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <Label>Turma</Label>
          <select 
            value={selectedClass?.id || ''} 
            onChange={e => setSelectedClass(classes.find(c => c.id === e.target.value) || null)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="" disabled>Selecione a turma</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label>Disciplina</Label>
          <select 
            value={selectedSubject} 
            onChange={e => setSelectedSubject(e.target.value)}
            disabled={subjects.length === 0}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          >
            {subjects.length === 0 && <option value="">Sem disciplinas</option>}
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="w-48">
          <Label>Trimestre</Label>
          <select 
            value={term} 
            onChange={e => setTerm(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="first">1º Trimestre</option>
            <option value="second">2º Trimestre</option>
            <option value="third">3º Trimestre</option>
          </select>
        </div>
      </div>

      {!selectedClass ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma turma atribuída a si.</CardContent></Card>
      ) : !selectedSubject ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Esta turma não tem disciplinas associadas.</CardContent></Card>
      ) : (
        <Tabs defaultValue="identificacao" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="identificacao" className="text-sm"><Users className="w-4 h-4 mr-2" /> Identificação</TabsTrigger>
            <TabsTrigger value="faltas" className="text-sm"><CalendarDays className="w-4 h-4 mr-2" /> Registo de Faltas</TabsTrigger>
            <TabsTrigger value="avaliacoes" className="text-sm"><ClipboardCheck className="w-4 h-4 mr-2" /> Avaliações Contínuas</TabsTrigger>
            <TabsTrigger value="sumarios" className="text-sm"><Edit3 className="w-4 h-4 mr-2" /> Sumários</TabsTrigger>
          </TabsList>
          
          <TabsContent value="identificacao" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Identificação da Turma e Alunos</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Nº</TableHead>
                      <TableHead>Nome do Aluno</TableHead>
                      <TableHead>Email / Contacto</TableHead>
                      <TableHead>Código (Matrícula)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedClass.students && selectedClass.students.length > 0 ? (
                      selectedClass.students.map((student, index) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-bold">{index + 1}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.code || 'N/D'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Sem alunos registados nesta turma.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="faltas" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <FaltasTab classInfo={selectedClass} subjectId={selectedSubject} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="avaliacoes" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <AcTab classInfo={selectedClass} subjectId={selectedSubject} term={term} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sumarios" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <SumariosTab classInfo={selectedClass} subjectId={selectedSubject} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
