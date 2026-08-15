import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/services/api/axios';

export function AcTab({ classInfo, subjectId, term }: { classInfo: any, subjectId: string, term: string }) {
  const [grades, setGrades] = useState<any[]>([]);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await api.get(`/grades/class/${classInfo.id}`);
        // Filter by subject, term, and type 'AC'
        setGrades(res.data.filter((g: any) => g.subjectId === subjectId && g.term === term && g.type === 'AC'));
      } catch (e) {
        console.error(e);
      }
    };
    fetchGrades();
  }, [classInfo.id, subjectId, term]);

  const getStudentAcGrades = (studentId: string) => {
    return grades.filter(g => g.studentId === studentId);
  };

  const calculateMAC = (studentGrades: any[]) => {
    if (studentGrades.length === 0) return '—';
    const sum = studentGrades.reduce((acc, curr) => acc + curr.value, 0);
    return (sum / studentGrades.length).toFixed(1);
  };

  // Find maximum number of AC grades any student has to render columns dynamically
  const maxAcCount = Math.max(...(classInfo.students?.map((s:any) => getStudentAcGrades(s.id).length) || [0]), 3);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Grelha de Notas Diárias (AC)</h3>
        <p className="text-sm text-muted-foreground">Nota: O fator de conversão (x2 ou x4) já foi aplicado aos valores exibidos nesta pauta.</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Nº</TableHead>
              <TableHead className="min-w-[200px]">Aluno</TableHead>
              {Array.from({ length: maxAcCount }).map((_, i) => (
                <TableHead key={i} className="text-center">AC {i + 1}</TableHead>
              ))}
              <TableHead className="text-center font-bold bg-purple-50 text-purple-900 rounded-tr-md">MAC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classInfo.students?.map((student: any, index: number) => {
              const studentGrades = getStudentAcGrades(student.id);
              return (
                <TableRow key={student.id}>
                  <TableCell className="font-bold">{index + 1}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  {Array.from({ length: maxAcCount }).map((_, i) => (
                    <TableCell key={i} className="text-center">
                      {studentGrades[i] ? studentGrades[i].value : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-purple-50">
                    {calculateMAC(studentGrades)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
