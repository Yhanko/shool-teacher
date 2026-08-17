import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSignature, Plus, Download, Loader2, Save, Trash2, Share2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function Avaliacoes() {
  const user = useAuthStore(s => s.user);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sharingId, setSharingId] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: 'Ficha de Avaliação Trimestral',
    term: '1º Trimestre',
    instructions: 'Leia atentamente as questões e responda com clareza. Não é permitido o uso de corretores.',
    classId: '',
    subjectId: '',
    questions: [
      { text: '', score: '5', blankLines: 5 }
    ]
  });

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await api.get('/exams/teacher');
      setExams(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes/my-classes');
      setClasses(res.data || []);
    } catch (e) { 
      // Fallback
      try {
        const res2 = await api.get(`/classes/teacher/${user!.id}`);
        setClasses(res2.data || []);
      } catch (e2) { console.error(e2); }
    }
  };

  const handleClassChange = async (classId: string) => {
    setFormData(prev => ({ ...prev, classId, subjectId: '' }));
    setSubjects([]);
    try {
      // Get only subjects this teacher teaches in this class
      const res = await api.get(`/classes/${classId}/subjects/teacher`);
      if (res.data && res.data.length > 0) {
        setSubjects(res.data);
      } else {
        // Fallback: all subjects of the class
        const fallback = await api.get(`/classes/${classId}/subjects`);
        setSubjects((fallback.data || []).map((c: any) => c.subject).filter(Boolean));
      }
    } catch (e) {
      try {
        const fallback = await api.get(`/classes/${classId}/subjects`);
        setSubjects((fallback.data || []).map((c: any) => c.subject).filter(Boolean));
      } catch (e2) { console.error(e2); }
    }
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { text: '', score: '5', blankLines: 5 }]
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...formData.questions];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, questions: updated });
  };

  const totalScore = formData.questions.reduce((acc, q) => acc + Number(String(q.score || 0).replace(',', '.')), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(totalScore - 20) > 0.01) {
      toast.error(`A cotação total deve ser exatamente 20 valores. Atualmente: ${totalScore}`);
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/exams', formData);
      toast.success('Prova criada com sucesso!');
      setIsCreating(false);
      fetchExams();
    } catch (error) {
      toast.error('Erro ao guardar a prova.');
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async (examId: string) => {
    toast.info('A gerar o PDF, aguarde...');
    try {
      // Fetch full exam details first
      const res = await api.get(`/exams/${examId}`);
      const examDetails = res.data;
      
      // We will temporarily render it on the DOM just to capture it
      const element = document.getElementById(`exam-card-${examId}`);
      if (!element) {
        toast.error('Ocorreu um erro a renderizar a prova.');
        return;
      }
      
      const canvas = await html2canvas(element, { scale: 2 });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Calculate how many pages we need based on height
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Avaliacao_${examDetails.subject.name}_${examDetails.class.name}.pdf`);
      toast.success('Ficha de Avaliação gerada com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const sharePDF = async (examId: string) => {
    setSharingId(examId);
    toast.info('A gerar a prova e a preparar a partilha...', { id: 'sharing' });
    try {
      const res = await api.get(`/exams/${examId}`);
      const examDetails = res.data;
      
      const element = document.getElementById(`exam-card-${examId}`);
      if (!element) throw new Error('Render error');
      
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      const pdfBlob = pdf.output('blob');
      
      const formData = new FormData();
      formData.append('file', pdfBlob, `Ficha_Avaliacao_${examId}.pdf`);
      
      toast.loading('A guardar o documento na nuvem...', { id: 'sharing' });
      const uploadRes = await api.post('/uploads/cloudinary', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const fileUrl = uploadRes.data.path;
      
      toast.loading('A notificar a Direção...', { id: 'sharing' });
      await api.post('/messages/share-document', {
        url: fileUrl,
        documentType: 'Ficha de Avaliação',
        documentName: `${examDetails.title} - ${examDetails.class.name} (${examDetails.subject.name})`
      });
      
      toast.success('Ficha de Avaliação partilhada com sucesso!', { id: 'sharing' });
    } catch (error) {
      console.error(error);
      toast.error('Ocorreu um erro ao partilhar a Ficha de Avaliação.', { id: 'sharing' });
    } finally {
      setSharingId(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileSignature className="h-8 w-8 text-purple-600" />
            Fichas de Avaliação
          </h1>
          <p className="text-gray-500">Crie provas oficiais e imprima em formato Angolano</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" /> Nova Avaliação
        </Button>
      </div>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Construtor de Prova / Exame</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            
            {/* Cabeçalho */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">1. Identificação</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Turma</Label>
                  <select 
                    value={formData.classId} 
                    onChange={e => handleClassChange(e.target.value)} 
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="" disabled>Selecione a turma...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Disciplina</Label>
                  <select 
                    value={formData.subjectId} 
                    onChange={e => setFormData({...formData, subjectId: e.target.value})} 
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="" disabled>Selecione a disciplina...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Trimestre</Label>
                  <select 
                    value={formData.term} 
                    onChange={e => setFormData({...formData, term: e.target.value})} 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option>1º Trimestre</option>
                    <option>2º Trimestre</option>
                    <option>3º Trimestre</option>
                    <option>Exame Final</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Título da Prova</Label>
                  <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div>
                  <Label>Instruções Gerais</Label>
                  <Input value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} required />
                </div>
              </div>
            </div>

            {/* Perguntas */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-semibold text-slate-700">2. Enunciado (Perguntas)</h3>
                <div className={`font-bold ${Math.abs(totalScore - 20) <= 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  Cotação Total: {Number(totalScore.toFixed(2))} / 20 Valores
                </div>
              </div>
              
              {formData.questions.map((q, i) => (
                <div key={i} className="flex gap-4 items-start p-4 bg-white border rounded-lg shadow-sm">
                  <div className="font-bold text-lg text-slate-400 mt-2">{i + 1}.</div>
                  <div className="flex-1 space-y-3">
                    <Textarea 
                      placeholder="Escreva a pergunta aqui..." 
                      value={q.text} 
                      onChange={e => updateQuestion(i, 'text', e.target.value)} 
                      required 
                      rows={2}
                    />
                    <div className="flex gap-4 items-end">
                      <div className="w-32">
                        <Label>Cotação (Valores)</Label>
                        <Input type="text" inputMode="decimal" value={q.score} onChange={e => updateQuestion(i, 'score', e.target.value.replace(/[^0-9.,]/g, ''))} required />
                      </div>
                      <div className="w-48">
                        <Label>Linhas em branco (PDF)</Label>
                        <select 
                          value={q.blankLines} 
                          onChange={e => updateQuestion(i, 'blankLines', parseInt(e.target.value))} 
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        >
                          <option value={0}>Sem espaço</option>
                          <option value={2}>2 Linhas</option>
                          <option value={5}>5 Linhas</option>
                          <option value={10}>10 Linhas</option>
                          <option value={20}>Página inteira</option>
                        </select>
                      </div>
                      {formData.questions.length > 1 && (
                        <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => removeQuestion(i)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addQuestion} className="w-full border-dashed">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || totalScore !== 20}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Guardar Prova
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Fichas de Avaliação</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Turma / Disciplina</TableHead>
                <TableHead>Trimestre</TableHead>
                <TableHead>Data Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map(exam => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.title}</TableCell>
                  <TableCell>
                    <div>{exam.class?.name}</div>
                    <div className="text-xs text-muted-foreground">{exam.subject?.name}</div>
                  </TableCell>
                  <TableCell>{exam.term}</TableCell>
                  <TableCell>{new Date(exam.createdAt).toLocaleDateString('pt-PT')}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => exportPDF(exam.id)} title="Imprimir PDF para os Alunos">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => sharePDF(exam.id)} disabled={sharingId === exam.id} title="Partilhar com a Direção">
                      {sharingId === exam.id ? <Loader2 className="h-4 w-4 animate-spin text-purple-600" /> : <Share2 className="h-4 w-4 text-purple-600" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {exams.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Nenhuma prova registada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Hidden layout for Exam PDF generation */}
      <div className="fixed top-[-9999px] left-[-9999px]">
        {exams.map(exam => (
          <div key={`pdf-exam-${exam.id}`} id={`exam-card-${exam.id}`} className="bg-white p-10 w-[800px] text-black">
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold uppercase">República de Angola</h1>
              <h2 className="text-xl">Ministério da Educação</h2>
              <h3 className="text-lg mt-2">{exam.institution?.name || 'Escola Secundária'}</h3>
            </div>
            
            <div className="mb-6 border border-gray-400 p-4 font-serif">
              <h2 className="text-center text-xl font-bold mb-4 uppercase">{exam.title}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Disciplina:</strong> {exam.subject?.name}</div>
                <div><strong>Ano Letivo:</strong> 2026/2027</div>
                <div><strong>Classe/Turma:</strong> {exam.class?.name}</div>
                <div><strong>Trimestre:</strong> {exam.term}</div>
                <div><strong>Professor:</strong> {exam.teacher?.name}</div>
                <div><strong>Data:</strong> ____/____/______</div>
              </div>
            </div>
            
            <div className="mb-6 flex gap-4">
              <div className="border border-gray-400 p-3 w-3/4">
                <p><strong>Nome do Aluno:</strong> ___________________________________________________________</p>
                <p className="mt-2"><strong>Nº:</strong> _______</p>
              </div>
              <div className="border border-gray-400 p-3 w-1/4 text-center flex flex-col">
                <strong>Classificação:</strong>
                <div className="mt-4 px-4 flex-1 flex flex-col">
                  <div className="h-10"></div>
                  <div className="border-b-2 border-black w-full"></div>
                  <div className="h-10 flex items-center justify-center font-bold text-lg">20 Valores</div>
                </div>
              </div>
            </div>

            <div className="mb-8 p-3 bg-gray-100 italic text-sm border border-gray-300">
              <strong>Instruções:</strong> {exam.instructions}
            </div>

            <div className="space-y-6">
              {exam.questions?.map((q: any, idx: number) => (
                <div key={idx} className="relative">
                  <div className="flex gap-2">
                    <div className="font-bold">{idx + 1}.</div>
                    <div className="flex-1 whitespace-pre-wrap">{q.text}</div>
                    <div className="font-bold whitespace-nowrap ml-4">[{Number(String(q.score || 0).replace(',', '.')).toFixed(1)} v]</div>
                  </div>
                  
                  {q.blankLines > 0 && (
                    <div className="mt-4 space-y-4 mb-4">
                      {Array.from({ length: q.blankLines }).map((_, lineIdx) => (
                        <div key={lineIdx} className="border-b border-gray-300 border-dotted w-full h-4"></div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-16 text-center text-sm text-gray-500">
              <p>Boa Sorte!</p>
              <p>O Professor: ________________________________</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
