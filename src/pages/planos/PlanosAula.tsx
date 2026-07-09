import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, FileText, Download, Plus, Eye, Loader2, Save, Share2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function PlanosAula() {
  const user = useAuthStore(s => s.user);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sharingId, setSharingId] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    date: new Date().toISOString().split('T')[0],
    duration: '90 minutos',
    theme: '',
    generalObjective: '',
    educationalObjective: '',
    specificCognitive: '',
    specificPsychomotor: '',
    specificAffective: '',
    teachingMethods: '',
    teachingResources: '',
    activities: '',
    introMotivation: '',
    mediationAssimilation: '',
    domainConsolidation: '',
    controlEvaluation: ''
  });

  useEffect(() => {
    fetchPlans();
    fetchClasses();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/lesson-plans/teacher');
      setPlans(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get(`/classes/teacher/${user!.id}`);
      setClasses(res.data || []);
    } catch (e) { console.error(e); }
  };

  const handleClassChange = async (classId: string) => {
    setFormData(prev => ({ ...prev, classId, subjectId: '' }));
    try {
      const res = await api.get(`/classes/${classId}/subjects`);
      setSubjects(res.data.map((c: any) => c.subject));
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/lesson-plans', formData);
      toast.success('Plano de aula submetido para avaliação.');
      setIsCreating(false);
      fetchPlans();
    } catch (error) {
      toast.error('Erro ao submeter o plano.');
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = async (planId: string) => {
    toast.info('A gerar o PDF, aguarde...');
    try {
      const element = document.getElementById(`plan-card-${planId}`);
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfHeight - 20);
      pdf.save(`Plano_de_Aula_${planId}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const sharePDF = async (plan: any) => {
    setSharingId(plan.id);
    toast.info('A gerar o documento e a preparar a partilha...', { id: 'sharing' });
    try {
      const element = document.getElementById(`plan-card-${plan.id}`);
      if (!element) throw new Error('Render error');
      
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth - 20, pdfHeight - 20);
      
      const pdfBlob = pdf.output('blob');
      
      const formData = new FormData();
      formData.append('file', pdfBlob, `Plano_Aula_${plan.id}.pdf`);
      
      toast.loading('A guardar o documento na nuvem...', { id: 'sharing' });
      const uploadRes = await api.post('/uploads/cloudinary', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const fileUrl = uploadRes.data.path;
      
      toast.loading('A notificar a Direção...', { id: 'sharing' });
      await api.post('/messages/share-document', {
        url: fileUrl,
        documentType: 'Plano de Aula',
        documentName: `${plan.theme} - ${plan.class.name} (${plan.subject.name})`
      });
      
      toast.success('Plano partilhado com sucesso com a Direção!', { id: 'sharing' });
    } catch (error) {
      console.error(error);
      toast.error('Ocorreu um erro ao partilhar o plano.', { id: 'sharing' });
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
            <BookOpen className="h-8 w-8 text-blue-600" />
            Planos de Aula
          </h1>
          <p className="text-gray-500">Gestão e submissão de planos metodológicos</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo Plano
        </Button>
      </div>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Elaborar Plano de Aula (Standard MED)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            
            {/* Cabeçalho */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">A. Cabeçalho (Identificação)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Turma</Label>
                  <select 
                    value={formData.classId} 
                    onChange={e => handleClassChange(e.target.value)} 
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="" disabled>Selecione a disciplina...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Data da Aula</Label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tempo Letivo (Duração)</Label>
                  <select 
                    value={formData.duration} 
                    onChange={e => setFormData({...formData, duration: e.target.value})} 
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="45 minutos">45 minutos (1 tempo)</option>
                    <option value="90 minutos">90 minutos (2 tempos)</option>
                  </select>
                </div>
                <div>
                  <Label>Tema / Unidade</Label>
                  <Input placeholder="Ex: A Atmosfera e suas Camadas" value={formData.theme} onChange={e => setFormData({...formData, theme: e.target.value})} required />
                </div>
              </div>
            </div>

            {/* Objetivos */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">B. Componentes Pedagógicos (Objetivos)</h3>
              <div>
                <Label>Objetivo Geral</Label>
                <Input placeholder="O que o aluno deve compreender de forma macro..." value={formData.generalObjective} onChange={e => setFormData({...formData, generalObjective: e.target.value})} required />
              </div>
              <div>
                <Label>Objetivo Educacional (Opcional)</Label>
                <Input placeholder="Comportamento ou valores a desenvolver..." value={formData.educationalObjective} onChange={e => setFormData({...formData, educationalObjective: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Domínio Cognitivo (Saber)</Label>
                  <Textarea placeholder="Conhecimentos e factos a memorizar..." rows={3} value={formData.specificCognitive} onChange={e => setFormData({...formData, specificCognitive: e.target.value})} required />
                </div>
                <div>
                  <Label>Domínio Psicomotor (Saber Fazer)</Label>
                  <Textarea placeholder="Habilidades práticas, exercícios..." rows={3} value={formData.specificPsychomotor} onChange={e => setFormData({...formData, specificPsychomotor: e.target.value})} required />
                </div>
                <div>
                  <Label>Domínio Afetivo (Saber Ser/Estar)</Label>
                  <Textarea placeholder="Atitudes e valores sociais..." rows={3} value={formData.specificAffective} onChange={e => setFormData({...formData, specificAffective: e.target.value})} required />
                </div>
              </div>
            </div>

            {/* Metodologia e Recursos */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">C. Metodologia e Recursos</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Métodos de Ensino</Label>
                  <Textarea placeholder="Ex: Método Expositivo, Elaboração Conjunta, Trabalho Independente..." rows={2} value={formData.teachingMethods} onChange={e => setFormData({...formData, teachingMethods: e.target.value})} required />
                </div>
                <div>
                  <Label>Recursos de Ensino</Label>
                  <Textarea placeholder="Ex: Quadro, Giz, Manual Escolar, Projetor..." rows={2} value={formData.teachingResources} onChange={e => setFormData({...formData, teachingResources: e.target.value})} required />
                </div>
              </div>
              <div>
                <Label>Atividades (Professor e Aluno)</Label>
                <Textarea placeholder="Ex: O professor explica... O aluno toma notas..." rows={3} value={formData.activities} onChange={e => setFormData({...formData, activities: e.target.value})} required />
              </div>
            </div>

            {/* Fases Metodológicas */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">D. Desenvolvimento Didático (Fases da Aula)</h3>
              <div className="space-y-4">
                <div>
                  <Label>1. Introdução e Motivação (10-15%)</Label>
                  <Textarea placeholder="Como vai captar a atenção e rever os pré-requisitos?" rows={2} value={formData.introMotivation} onChange={e => setFormData({...formData, introMotivation: e.target.value})} required />
                </div>
                <div>
                  <Label>2. Mediação e Assimilação (40-50%)</Label>
                  <Textarea placeholder="Explicação dos conceitos centrais e utilização de meios de ensino..." rows={3} value={formData.mediationAssimilation} onChange={e => setFormData({...formData, mediationAssimilation: e.target.value})} required />
                </div>
                <div>
                  <Label>3. Domínio e Consolidação (20-25%)</Label>
                  <Textarea placeholder="Resolução de exercícios práticos, correção de dúvidas..." rows={2} value={formData.domainConsolidation} onChange={e => setFormData({...formData, domainConsolidation: e.target.value})} required />
                </div>
                <div>
                  <Label>4. Controlo e Avaliação (10-15%)</Label>
                  <Textarea placeholder="Síntese final, perguntas-chave e marcação de TPC..." rows={2} value={formData.controlEvaluation} onChange={e => setFormData({...formData, controlEvaluation: e.target.value})} required />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Submeter para Visto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Planos Submetidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Turma / Disciplina</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Estado (Visto)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(plan => (
                <TableRow key={plan.id}>
                  <TableCell>{new Date(plan.date).toLocaleDateString('pt-PT')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{plan.class.name}</div>
                    <div className="text-xs text-muted-foreground">{plan.subject.name}</div>
                  </TableCell>
                  <TableCell>{plan.theme}</TableCell>
                  <TableCell>
                    <Badge variant={plan.status === 'APPROVED' ? 'default' : plan.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                      {plan.status === 'APPROVED' ? 'Aprovado' : plan.status === 'REJECTED' ? 'Devolvido' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => exportPDF(plan.id)} title="Exportar PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => sharePDF(plan)} disabled={sharingId === plan.id} title="Partilhar com a Direção">
                      {sharingId === plan.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <Share2 className="h-4 w-4 text-blue-600" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Nenhum plano de aula registado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Hidden layout for PDF generation */}
      <div className="fixed top-[-9999px] left-[-9999px]">
        {plans.map(plan => (
          <div key={`pdf-${plan.id}`} id={`plan-card-${plan.id}`} className="bg-white p-8 w-[800px] text-black">
            <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold uppercase">República de Angola</h1>
              <h2 className="text-xl">Ministério da Educação</h2>
              <h3 className="text-lg font-bold mt-2">Plano de Aula</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 border border-gray-300 p-4">
              <div><strong>Professor:</strong> {user?.name}</div>
              <div><strong>Disciplina:</strong> {plan.subject.name}</div>
              <div><strong>Turma:</strong> {plan.class.name}</div>
              <div><strong>Data:</strong> {new Date(plan.date).toLocaleDateString('pt-PT')}</div>
              <div><strong>Duração:</strong> {plan.duration}</div>
              <div className="col-span-2"><strong>Tema:</strong> {plan.theme}</div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold border-b border-gray-300 mb-2">I. Objetivos</h4>
              <p><strong>Geral:</strong> {plan.generalObjective}</p>
              {plan.educationalObjective && <p><strong>Educacional:</strong> {plan.educationalObjective}</p>}
              <div className="pl-4 mt-2">
                <p><strong>Cognitivo (Saber):</strong> {plan.specificCognitive}</p>
                <p><strong>Psicomotor (Saber Fazer):</strong> {plan.specificPsychomotor}</p>
                <p><strong>Afetivo (Saber Ser):</strong> {plan.specificAffective}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold border-b border-gray-300 mb-2">II. Metodologia e Recursos</h4>
              <p><strong>Métodos de Ensino:</strong> {plan.teachingMethods}</p>
              <p><strong>Recursos de Ensino:</strong> {plan.teachingResources}</p>
              <p className="mt-2"><strong>Atividades:</strong></p>
              <p className="pl-4 whitespace-pre-wrap">{plan.activities}</p>
            </div>

            <div className="mb-6">
              <h4 className="font-bold border-b border-gray-300 mb-2">III. Desenvolvimento Didático</h4>
              <p className="mt-2"><strong>1. Introdução e Motivação:</strong></p>
              <p className="pl-4 whitespace-pre-wrap">{plan.introMotivation}</p>
              
              <p className="mt-2"><strong>2. Mediação e Assimilação:</strong></p>
              <p className="pl-4 whitespace-pre-wrap">{plan.mediationAssimilation}</p>
              
              <p className="mt-2"><strong>3. Domínio e Consolidação:</strong></p>
              <p className="pl-4 whitespace-pre-wrap">{plan.domainConsolidation}</p>
              
              <p className="mt-2"><strong>4. Controlo e Avaliação:</strong></p>
              <p className="pl-4 whitespace-pre-wrap">{plan.controlEvaluation}</p>
            </div>

            <div className="mt-16 flex justify-between text-center">
              <div className="w-48 border-t border-black pt-2">
                <strong>O Professor</strong>
              </div>
              <div className="w-48 border-t border-black pt-2">
                <strong>Visto da Coordenação</strong>
                <p className="text-sm mt-1">{plan.status === 'APPROVED' ? '(Aprovado)' : ''}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}