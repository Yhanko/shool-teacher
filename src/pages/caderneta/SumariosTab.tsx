import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/services/api/axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';

export function SumariosTab({ classInfo, subjectId }: { classInfo: any, subjectId: string }) {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSummaries = async () => {
    try {
      const res = await api.get(`/lesson-summary/class/${classInfo.id}/subject/${subjectId}`);
      setSummaries(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [classInfo.id, subjectId]);

  const handleSalvarSumario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/lesson-summary', {
        classId: classInfo.id,
        subjectId,
        date: new Date(date).toISOString(),
        content
      });
      toast.success('Sumário registado com sucesso.');
      setDialogOpen(false);
      setContent('');
      fetchSummaries();
    } catch (error) {
      toast.error('Erro ao registar sumário.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar este sumário?')) return;
    try {
      await api.delete(`/lesson-summary/${id}`);
      toast.success('Sumário apagado.');
      fetchSummaries();
    } catch (error) {
      toast.error('Erro ao apagar sumário.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Controlo de Sumários</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Registar Sumário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registar Novo Sumário</DialogTitle></DialogHeader>
            <form onSubmit={handleSalvarSumario} className="space-y-4">
              <div>
                <Label>Data da Aula</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div>
                <Label>Conteúdo Programático Ministrado</Label>
                <Textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  required 
                  rows={5}
                  placeholder="Descreva o que foi lecionado nesta aula..."
                />
              </div>
              <Button type="submit" className="w-full">Salvar e Assinar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Data</TableHead>
            <TableHead>Conteúdo do Sumário</TableHead>
            <TableHead className="w-48">Professor (Assinatura)</TableHead>
            <TableHead className="w-16 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.length > 0 ? summaries.map((s: any) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{new Date(s.date).toLocaleDateString('pt-PT')}</TableCell>
              <TableCell className="whitespace-pre-wrap">{s.content}</TableCell>
              <TableCell className="italic text-muted-foreground">{s.teacher?.name}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhum sumário registado para esta disciplina.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
