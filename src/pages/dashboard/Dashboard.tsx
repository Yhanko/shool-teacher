"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  BookOpen, Users, ClipboardCheck, TrendingUp, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/axios';

interface ClassInfo {
  id: string;
  name: string;
  academicLevel: string;
  capacity?: number;
  teachers?: { id: string; name: string }[];
  _count?: { students: number };
  students?: any[];
}

export function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch teacher's classes
        const classRes = await api.get(`/classes/teacher/${user.id}`);
        setClasses(classRes.data || []);

        // Fetch notifications count
        try {
          const notifRes = await api.get('/notifications');
          const unread = notifRes.data?.filter((n: any) => !n.isRead) || [];
          setNotifCount(unread.length);
        } catch (_) { /* optional */ }
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const totalStudents = classes.reduce((acc, c) => acc + (c.students?.length || c._count?.students || 0), 0);
  const totalCapacity = classes.reduce((acc, c) => acc + (c.capacity || 0), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  // Build chart data from classes
  const chartData = classes.slice(0, 5).map(c => ({
    turma: c.name,
    alunos: c.students?.length || c._count?.students || 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold">Bem-vindo, {user?.name?.split(' ')[0] || 'Professor'}! 👋</h2>
        <p className="mt-1 text-purple-100">Aqui está um resumo do seu painel de hoje.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Em {classes.length} turma{classes.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas Atribuídas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">Turmas activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificações</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifCount}</div>
            <p className="text-xs text-muted-foreground">Não lidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupação das Turmas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
            <Progress value={occupancyRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Chart + class list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alunos por Turma</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="turma" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="alunos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma turma atribuída ainda.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Minhas Turmas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classes.length > 0 ? classes.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.academicLevel}</p>
                </div>
                <Badge variant="secondary">{c.students?.length || c._count?.students || 0} alunos</Badge>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma turma atribuída. O administrador deve associar-lhe uma turma.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
