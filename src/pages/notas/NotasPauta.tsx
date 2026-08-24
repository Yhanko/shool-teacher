import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Plus, Send, Download, Loader2, Edit, GraduationCap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/axios';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface ClassInfo {
  id: string;
  name: string;
  academicLevel: string;
  students?: Student[];
}

interface Subject {
  id: string;
  name: string;
}

interface GradeEntry {
  id: string;
  studentId: string;
  value: number;
  term: string;
  type: string;
  subjectId: string;
  createdAt: string;
}

function GradeForm({ classInfo, students, subjects, onSuccess, initialStudentId }: { classInfo: ClassInfo; students: Student[]; subjects: Subject[]; onSuccess: () => void; initialStudentId?: string }) {
  const [studentId, setStudentId] = useState(initialStudentId || '');
  const [studentSearch, setStudentSearch] = useState(() => {
    if (initialStudentId) {
      const s = students.find(s => s.id === initialStudentId);
      return s ? s.name : '';
    }
    return '';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [value, setValue] = useState('');
  const [term, setTerm] = useState('first');
  const [type, setType] = useState('AC');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subjects.length > 0 && !subjectId) setSubjectId(subjects[0].id);
  }, [subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      alert('Por favor, pesquise e selecione um aluno válido da lista.');
      return;
    }
    setLoading(true);
    try {
      let finalValue = parseFloat(value);
      if (type === 'AC') {
        const factor = classInfo.academicLevel === 'primary' ? 2 : 4;
        finalValue = finalValue * factor;
      }

      await api.post('/grades', {
        studentId,
        classId: classInfo.id,
        subjectId,
        value: finalValue,
        term,
        type,
      });
      onSuccess();
      setStudentId(''); setStudentSearch(''); setValue('');
    } catch (err) {
      alert('Erro ao lançar nota.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Label>Aluno</Label>
        <Input
          type="text"
          placeholder="Pesquisar aluno..."
          value={studentSearch}
          onChange={e => {
            setStudentSearch(e.target.value);
            setStudentId('');
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
          className={studentId ? "border-green-500" : ""}
          required={!studentId}
        />
        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).length > 0 ? (
              students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                <div 
                  key={s.id} 
                  className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700"
                  onClick={() => {
                    setStudentId(s.id);
                    setStudentSearch(s.name);
                    setIsDropdownOpen(false);
                  }}
                >
                  {s.name}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500">Nenhum aluno encontrado</div>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nota {type === 'AC' ? '(0–5)' : '(0–20)'}</Label>
          <Input 
            type="number" 
            min="0" 
            max={type === 'AC' ? "5" : "20"} 
            step="0.1" 
            value={value} 
            onChange={e => setValue(e.target.value)} 
            required 
            placeholder={type === 'AC' ? 'Nota na escala de 5' : 'Nota na escala de 20'}
          />
        </div>
        <div>
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
      <div>
        <Label>Disciplina</Label>
        <select 
          value={subjectId} 
          onChange={e => setSubjectId(e.target.value)}
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <Label>Tipo de Avaliação</Label>
        <select 
          value={type} 
          onChange={e => setType(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="AC">Avaliação Contínua (AC)</option>
          <option value="NPT">Nota da Prova Trimestral (NPT)</option>
          <option value="EX">Exame Final (EX)</option>
          <option value="NEE">Nota do Exame Escrito (NEE)</option>
          <option value="NEP">Nota do Exame Prático (NEP)</option>
          <option value="NEO">Nota do Exame Oral (NEO)</option>
          <option value="MENC">Média do Exame Combinado (MENC)</option>
          <option value="MFD">Média Final da Disciplina (MFD)</option>
        </select>
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
        Lançar Nota
      </Button>
    </form>
  );
}

export function NotasPauta() {
  const user = useAuthStore((state) => state.user);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [pautaData, setPautaData] = useState<any>(null);
  const [term, setTerm] = useState('first');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSubject) fetchGrades();
  }, [selectedClass, selectedSubject, term]);

  const fetchSubjects = async () => {
    try {
      // Get only subjects this teacher teaches in this class
      const res = await api.get(`/classes/${selectedClass!.id}/subjects/teacher`);
      if (res.data && res.data.length > 0) {
        setSubjects(res.data);
        setSelectedSubject(res.data[0].id);
      } else {
        const fallback = await api.get(`/classes/${selectedClass!.id}/subjects`);
        const subs = (fallback.data || []).map((cs: any) => cs.subject).filter(Boolean);
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubject(subs[0].id);
        else { setSelectedSubject(''); setPautaData(null); }
      }
    } catch (e) {
      try {
        const fallback = await api.get(`/classes/${selectedClass!.id}/subjects`);
        const subs = (fallback.data || []).map((cs: any) => cs.subject).filter(Boolean);
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubject(subs[0].id);
        else { setSelectedSubject(''); setPautaData(null); }
      } catch (e2) { console.error(e2); }
    }
  };

  const fetchClasses = async () => {
    try {
      // /classes/my-classes returns classes with enrolled students included
      const res = await api.get('/classes/my-classes');
      const data = res.data || [];
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0]);
    } catch (e) {
      try {
        const res2 = await api.get(`/classes/teacher/${user!.id}`);
        const data = res2.data || [];
        setClasses(data);
        if (data.length > 0) setSelectedClass(data[0]);
      } catch (e2) { console.error(e2); }
    }
    finally { setLoading(false); }
  };

  const fetchGrades = async () => {
    if (!selectedClass || !selectedSubject) return;
    try {
      const res = await api.get(`/grades/pauta/class/${selectedClass.id}/subject/${selectedSubject}`);
      setPautaData(res.data);
    } catch (e) { console.error(e); }
  };

  const getStudentGradesCalc = (studentId: string) => {
    if (!pautaData || !pautaData.students) return null;
    const s = pautaData.students.find((st: any) => st.student.id === studentId);
    if (!s) return null;

    const termData = s.terms[term];
    return {
      mac: termData.mac !== null ? termData.mac.toFixed(1) : '—',
      npt: termData.npt !== null ? termData.npt.toFixed(1) : '—',
      mt: termData.mt !== null ? termData.mt.toFixed(1) : null,
      mfd: s.final.mfd !== null ? s.final.mfd.toFixed(1) : null,
      menc: s.final.menc !== null ? s.final.menc.toFixed(1) : null,
      nee: s.final.nee !== null ? s.final.nee.toFixed(1) : null,
      neo: s.final.neo !== null ? s.final.neo.toFixed(1) : null
    };
  };

  const exportPDF = async () => {
    if (!selectedClass) return;
    setExporting(true);
    toast.info('A gerar o PDF, por favor aguarde...');
    try {
      const element = document.getElementById('pauta-table-container');
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Add custom header
      const schoolName = user?.institution?.name || 'Escola';
      pdf.setFontSize(18);
      pdf.text(`${schoolName} - Pauta de Avaliação`, 14, 15);
      pdf.setFontSize(12);
      const termMap: any = { first: '1º Trimestre', second: '2º Trimestre', third: '3º Trimestre' };
      pdf.text(`Turma: ${selectedClass.name} | Disciplina: ${subjects.find(s => s.id === selectedSubject)?.name || ''} | ${termMap[term]}`, 14, 23);
      
      pdf.addImage(imgData, 'PNG', 10, 30, pdfWidth - 20, pdfHeight - 40);
      pdf.save(`Pauta_${selectedClass.name}_${termMap[term]}.pdf`);
      toast.success('Pauta exportada com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar PDF.');
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const publishGrades = async () => {
    if (!selectedClass) return;
    const confirm = window.confirm('Deseja notificar os encarregados e a Direção Escolar que as notas desta pauta já estão fechadas?');
    if (!confirm) return;

    setPublishing(true);
    try {
      const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'Disciplina';
      const res = await api.post(`/grades/publish/class/${selectedClass.id}`, {
        term,
        subjectName
      });
      if (res.data.success) {
        toast.success(`Foram enviadas ${res.data.notifiedCount} notificações aos encarregados e gestão escolar.`);
      }
    } catch (e) {
      toast.error('Erro ao publicar pautas.');
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  const getStatus = (mt: string | null) => {
    if (!mt) return { label: 'Sem nota final', color: 'secondary' as const };
    const n = parseFloat(mt);
    if (n >= 10) return { label: 'Aprovado', color: 'default' as const };
    return { label: 'Reprovado', color: 'destructive' as const };
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-purple-600" />
            Notas & Pauta
          </h1>
          <p className="text-gray-500">Registo de Avaliações Contínuas e Provas</p>
        </div>
        <div className="flex gap-2">
          {selectedClass && selectedSubject && (
            <>
              <Button variant="outline" onClick={exportPDF} disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Exportar PDF
              </Button>
              <Button variant="secondary" onClick={publishGrades} disabled={publishing} className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">
                {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Publicar Notas
              </Button>
            </>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingStudentId(null);
        }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />Lançar Notas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Lançar Nota</DialogTitle></DialogHeader>
              {selectedClass && (
                <GradeForm 
                  classInfo={selectedClass} 
                  students={selectedClass.students || []} 
                  subjects={subjects}
                  initialStudentId={editingStudentId || undefined}
                  onSuccess={() => {
                    setDialogOpen(false);
                    setEditingStudentId(null);
                    fetchGrades();
                    toast.success('Nota lançada com sucesso!');
                  }} 
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
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

      {selectedClass ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {selectedClass.name} — Pauta {term === 'first' ? '1º' : term === 'second' ? '2º' : '3º'} Trimestre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto" id="pauta-table-container">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>MAC</TableHead>
                      <TableHead>NPT</TableHead>
                      <TableHead>MT Final</TableHead>
                      {term === 'third' && pautaData?.classInfo?.isExamClass && (
                        <>
                          <TableHead>NEE</TableHead>
                          {pautaData?.subjectInfo?.isPortuguese && <TableHead>NEO</TableHead>}
                          <TableHead>MENC</TableHead>
                        </>
                      )}
                      {term === 'third' && <TableHead>MFD (Final)</TableHead>}
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pautaData?.students || []).map((studentData: any) => {
                      const calc = getStudentGradesCalc(studentData.student.id);
                      const status = getStatus(term === 'third' ? (calc ? calc.mfd : null) : (calc ? calc.mt : null));
                      return (
                        <TableRow key={studentData.student.id}>
                          <TableCell className="font-medium">{studentData.student.name}</TableCell>
                          <TableCell>{calc ? calc.mac : '—'}</TableCell>
                          <TableCell>{calc ? calc.npt : '—'}</TableCell>
                          <TableCell className="font-bold text-lg">{calc && calc.mt ? calc.mt : '—'}</TableCell>
                          {term === 'third' && pautaData?.classInfo?.isExamClass && (
                            <>
                              <TableCell>{calc && calc.nee !== '—' ? calc.nee : '—'}</TableCell>
                              {pautaData?.subjectInfo?.isPortuguese && (
                                <TableCell>{calc && calc.neo !== '—' ? calc.neo : '—'}</TableCell>
                              )}
                              <TableCell>{calc && calc.menc !== '—' ? calc.menc : '—'}</TableCell>
                            </>
                          )}
                          {term === 'third' && (
                            <TableCell className="font-bold text-blue-600 text-lg">
                              {calc && calc.mfd ? calc.mfd : '—'}
                            </TableCell>
                          )}
                          <TableCell><Badge variant={status.color}>{status.label}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => {
                              setEditingStudentId(studentData.student.id);
                              setDialogOpen(true);
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!pautaData?.students || pautaData.students.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum aluno matriculado nesta turma.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma turma atribuída a si. Contacte o administrador.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
