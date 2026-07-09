import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api/axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function FaltasTab({ classInfo, subjectId }: { classInfo: any, subjectId: string }) {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [status, setStatus] = useState('absent'); // 'absent' = Injustificada, 'excused' = Justificada

  const fetchAttendances = async () => {
    try {
      const res = await api.get(`/attendance/class/${classInfo.id}`);
      // Filter by subject
      setAttendances(res.data.filter((a: any) => a.subjectId === subjectId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, [classInfo.id, subjectId]);

  const handleMarcarFalta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/attendance', {
        studentId: selectedStudent.id,
        classId: classInfo.id,
        subjectId,
        date: new Date(date).toISOString(),
        status
      });
      toast.success('Falta registada com sucesso.');
      setDialogOpen(false);
      fetchAttendances();
    } catch (error) {
      toast.error('Erro ao registar falta.');
    }
  };

  // Group by student for the grid
  const getFaltasCount = (studentId: string, tipo: string) => {
    return attendances.filter(a => a.studentId === studentId && a.status === tipo).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Controlo Mensal de Faltas</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Registar Falta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registar Falta</DialogTitle></DialogHeader>
            <form onSubmit={handleMarcarFalta} className="space-y-4">
              <div>
                <Label>Aluno</Label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={selectedStudent?.id || ''}
                  onChange={e => setSelectedStudent(classInfo.students.find((s:any) => s.id === e.target.value))}
                  required
                >
                  <option value="" disabled>Selecione o aluno</option>
                  {classInfo.students?.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div>
                <Label>Tipo de Falta</Label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  <option value="absent">Falta Injustificada (FI)</option>
                  <option value="excused">Falta Justificada (FJ)</option>
                </select>
              </div>
              <Button type="submit" className="w-full">Salvar Registo</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Nº</TableHead>
            <TableHead>Aluno</TableHead>
            <TableHead className="text-center">Faltas Injustificadas</TableHead>
            <TableHead className="text-center">Faltas Justificadas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classInfo.students?.map((student: any, index: number) => (
            <TableRow key={student.id}>
              <TableCell className="font-bold">{index + 1}</TableCell>
              <TableCell>{student.name}</TableCell>
              <TableCell className="text-center">
                <Badge variant="destructive">{getFaltasCount(student.id, 'absent')}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{getFaltasCount(student.id, 'excused')}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
