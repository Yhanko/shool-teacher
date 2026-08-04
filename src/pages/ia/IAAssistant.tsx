import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  Send,
  Lightbulb,
  Users,
  Target,
  MessageCircle,
  Sparkles,
  Brain,
  FileText,
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api/axios';

interface Conversa {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string;
  hora: string;
}

const conversasExemplo: Conversa[] = [
  {
    id: '1',
    pergunta: 'Como posso tornar as aulas de matemática mais dinâmicas?',
    resposta: 'Aqui estão algumas estratégias para tornar suas aulas mais envolventes:\n\n1. **Gamificação**: Use jogos\n2. **Tecnologia**: Incorpore softwares educativos\n3. **Problemas do cotidiano**: Relacione conceitos com situações reais\n4. **Trabalho em grupo**: Promova discussões',
    categoria: 'metodologia',
    hora: '14:30'
  }
];

const sugestoes = [
  { texto: 'Como motivar alunos desmotivados?', categoria: 'motivacao' },
  { texto: 'Estratégias para ensino híbrido', categoria: 'metodologia' },
  { texto: 'Gestão de tempo em sala de aula', categoria: 'organizacao' },
];

const recursosIA = [
  {
    titulo: 'Gerador de Planos de Aula',
    descricao: 'Crie planos detalhados baseados em objetivos de aprendizagem',
    icon: FileText,
    categoria: 'planejamento'
  },
  {
    titulo: 'Banco de Questões',
    descricao: 'Acesse milhares de exercícios categorizados por dificuldade',
    icon: Target,
    categoria: 'avaliacao'
  },
  {
    titulo: 'Análise de Desempenho',
    descricao: 'Insights sobre o progresso individual e da turma',
    icon: Brain,
    categoria: 'analise'
  }
];

export function IAAssistant() {
  const user = useAuthStore((state) => state.user);
  
  // Chat States
  const [conversas, setConversas] = useState<Conversa[]>(conversasExemplo);
  const [pergunta, setPergunta] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Analysis States
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      const cls = classes.find(c => c.id === selectedClass);
      setStudents(cls?.students || []);
      setSelectedStudent('');
      setAnalysisResult(null);
    }
  }, [selectedClass, classes]);

  const fetchClasses = async () => {
    try {
      const res = await api.get(`/classes/teacher/${user!.id}`);
      setClasses(res.data || []);
      if (res.data?.length > 0) {
        setSelectedClass(res.data[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch classes', e);
    }
  };

  const enviarPergunta = async (texto: string = pergunta) => {
    if (!texto.trim()) return;
    setLoadingChat(true);
    try {
      const novaConversaUser: Conversa = {
        id: Date.now().toString(),
        pergunta: texto,
        resposta: '...',
        categoria: 'pendente',
        hora: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      };
      
      // Mostrar pergunta imediatamente
      setConversas([novaConversaUser, ...conversas]);
      setPergunta('');

      const res = await api.post('/ai/chat', { 
        question: texto, 
        studentId: selectedStudent || undefined 
      });

      // Atualizar com a resposta real
      setConversas(prev => prev.map(c => 
        c.id === novaConversaUser.id 
          ? { ...c, resposta: res.data.resposta, categoria: res.data.categoria || 'geral' } 
          : c
      ));
    } catch (e) {
      console.error(e);
      alert('Erro ao comunicar com a IA.');
      // Remover a mensagem temporária em caso de erro
      setConversas(prev => prev.filter(c => c.id !== Date.now().toString())); 
    } finally {
      setLoadingChat(false);
    }
  };

  const gerarAnalise = async () => {
    if (!selectedStudent) return;
    setLoadingAnalysis(true);
    setAnalysisResult(null);
    try {
      const res = await api.get(`/ai/student-analysis/${selectedStudent}?classId=${selectedClass}`);
      setAnalysisResult(res.data);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar análise.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status.includes('Crítico')) return <Badge variant="destructive" className="ml-2"><AlertTriangle className="w-3 h-3 mr-1"/>{status}</Badge>;
    if (status.includes('Excelente')) return <Badge className="bg-green-600 ml-2"><CheckCircle2 className="w-3 h-3 mr-1"/>{status}</Badge>;
    if (status.includes('Atenção')) return <Badge variant="secondary" className="ml-2"><AlertTriangle className="w-3 h-3 mr-1"/>{status}</Badge>;
    return <Badge variant="outline" className="ml-2">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Bot className="mr-3 h-8 w-8 text-blue-600" />
            Assistente IA Pedagógico
          </h1>
          <p className="text-muted-foreground">Seu parceiro inteligente para análise de alunos e metodologias</p>
        </div>
        <Badge variant="outline" className="flex items-center">
          <Sparkles className="mr-1 h-3 w-3 text-amber-500" />
          Powered by YHANKO AI
        </Badge>
      </div>

      <Tabs defaultValue="analise" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analise">Análise de Alunos</TabsTrigger>
          <TabsTrigger value="chat">Chat IA</TabsTrigger>
          <TabsTrigger value="recursos">Recursos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="analise" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="mr-2 h-5 w-5 text-purple-600" />
                Diagnóstico e Recomendações
              </CardTitle>
              <CardDescription>
                Selecione um aluno para que a IA analise o seu desempenho e sugira um plano de ação personalizado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end flex-wrap mb-6">
                <div className="w-64">
                  <label className="text-sm font-medium mb-1 block">Turma</label>
                  <select 
                    value={selectedClass} 
                    onChange={e => setSelectedClass(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="" disabled>Selecionar Turma</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="w-64">
                  <label className="text-sm font-medium mb-1 block">Aluno</label>
                  <select 
                    value={selectedStudent} 
                    onChange={e => setSelectedStudent(e.target.value)} 
                    disabled={students.length === 0}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="" disabled>Selecionar Aluno</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <Button 
                  onClick={gerarAnalise} 
                  disabled={!selectedStudent || loadingAnalysis}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loadingAnalysis ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Gerar Análise IA
                </Button>
              </div>

              {loadingAnalysis && (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                  <Brain className="w-12 h-12 mb-4 animate-pulse text-purple-500" />
                  <p className="font-medium">A analisar histórico de notas...</p>
                  <p className="text-sm mt-1">A gerar recomendações pedagógicas personalizadas...</p>
                </div>
              )}

              {analysisResult && !loadingAnalysis && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-100">
                    <h3 className="text-xl font-bold flex items-center mb-2">
                      Análise de {analysisResult.studentName}
                      {getStatusBadge(analysisResult.status)}
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {analysisResult.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-green-100 bg-green-50/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-green-700 text-lg flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Pontos Fortes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysisResult.strengths.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 text-sm text-green-900">
                            {analysisResult.strengths.map((s: string) => <li key={s}>{s}</li>)}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">Não identificados (notas abaixo de 14).</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-red-100 bg-red-50/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-red-700 text-lg flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Pontos a Melhorar
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysisResult.weaknesses.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 text-sm text-red-900">
                            {analysisResult.weaknesses.map((s: string) => <li key={s}>{s}</li>)}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">Não identificados (notas acima de 10).</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Lightbulb className="w-5 h-5 mr-2 text-amber-500" />
                        Plano de Ação Sugerido
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {analysisResult.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="bg-amber-100 text-amber-700 p-1 rounded-full mt-0.5">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-sm leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Conversar com a IA
                </CardTitle>
                <CardDescription>Faça perguntas sobre metodologias, planejamento, avaliação...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Faça sua pergunta..."
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button onClick={() => enviarPergunta(pergunta)} disabled={loadingChat || !pergunta.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loadingChat ? <><Bot className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : <><Send className="mr-2 h-4 w-4" /> Enviar Pergunta</>}
                </Button>

                {conversas.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <Separator />
                    <h3 className="font-semibold">Conversas Recentes</h3>
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {conversas.map((c) => (
                          <div key={c.id} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-start space-x-3">
                              <div className="p-2 bg-blue-100 rounded-full"><Users className="h-4 w-4 text-blue-600" /></div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{c.pergunta}</p>
                                <p className="text-xs text-muted-foreground">{c.hora}</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <div className="p-2 bg-green-100 rounded-full"><Bot className="h-4 w-4 text-green-600" /></div>
                              <div className="flex-1"><p className="text-sm whitespace-pre-line">{c.resposta}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-5 w-5" />Sugestões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sugestoes.map((s, i) => (
                    <Button key={i} variant="outline" className="w-full justify-start text-left h-auto p-3" onClick={() => enviarPergunta(s.texto)}>
                      <div>
                        <p className="text-sm font-medium">{s.texto}</p>
                        <Badge variant="outline" className="mt-1 text-xs">{s.categoria}</Badge>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recursos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recursosIA.map((recurso, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <recurso.icon className="mr-2 h-5 w-5 text-blue-600" />
                    {recurso.titulo}
                  </CardTitle>
                  <CardDescription>{recurso.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{recurso.categoria}</Badge>
                    <Button size="sm">Usar Recurso</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Histórico de Conversas</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {conversas.map((c) => (
                    <div key={c.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{c.categoria}</Badge>
                        <span className="text-xs text-muted-foreground">{c.hora}</span>
                      </div>
                      <p className="font-medium text-sm mb-2">{c.pergunta}</p>
                      <p className="text-sm text-muted-foreground line-clamp-3">{c.resposta}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}