import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { BookOpen, Download, Search, FileText, Video, Link as LinkIcon, Loader2, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '@/services/api/axios';
import { toast } from 'sonner';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  class?: { name: string };
  subject?: { name: string };
  createdAt: string;
}

interface ClassModel {
  id: string;
  name: string;
}

interface SubjectModel {
  id: string;
  name: string;
}

export function ResourcesView() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Create resource state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    type: 'pdf',
    url: '',
    classId: '',
    subjectId: ''
  });

  useEffect(() => {
    fetchResources();
    fetchClassesAndSubjects();
  }, []);

  const fetchClassesAndSubjects = async () => {
    try {
      const [resClasses, resSubjects] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects')
      ]);
      setClasses(resClasses.data || []);
      setSubjects(resSubjects.data || []);
    } catch (e) {
      console.error('Failed to fetch classes/subjects', e);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await api.get('/resources');
      setResources(res.data || []);
    } catch (e) {
      console.error('Failed to fetch resources', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResource.title) return;
    
    // Validate if it's file or link
    const isFile = newResource.type === 'pdf' || newResource.type === 'image';
    if (isFile && !selectedFile) {
      toast.error('Por favor, selecione um ficheiro para upload.');
      return;
    }
    if (!isFile) {
      if (!newResource.url) {
        toast.error('Por favor, insira o URL do recurso.');
        return;
      }
      try {
        new URL(newResource.url);
      } catch (e) {
        toast.error('URL inválido. Certifique-se que começa com http:// ou https://');
        return;
      }
    }
    
    setIsCreating(true);
    try {
      let finalUrl = newResource.url;
      
      // Se for ficheiro, fazer upload para o cloudinary
      if (isFile && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await api.post('/uploads/cloudinary', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalUrl = uploadRes.data.url;
      }

      await api.post('/resources', { ...newResource, url: finalUrl });
      setIsDialogOpen(false);
      setNewResource({ title: '', description: '', type: 'pdf', url: '', classId: '', subjectId: '' });
      setSelectedFile(null);
      toast.success('Recurso partilhado com sucesso!');
      fetchResources();
    } catch (e: any) {
      console.error('Failed to create resource', e);
      toast.error(`Erro ao partilhar recurso: ${e.response?.data?.message || e.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que pretende remover este recurso?')) return;
    try {
      await api.delete(`/resources/${id}`);
      toast.success('Recurso apagado com sucesso!');
      fetchResources();
    } catch (e: any) {
      console.error('Failed to delete resource', e);
      toast.error(`Erro ao apagar recurso: ${e.response?.data?.message || e.message}`);
    }
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (res.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (res.subject?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (res.class?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || res.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'video': return <Video className="w-5 h-5 text-purple-500" />;
      case 'book': return <BookOpen className="w-5 h-5 text-amber-500" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-green-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Recursos Didáticos</h1>
          <p className="text-muted-foreground">Material de apoio disponibilizado pela escola e professores</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Adicionar Recurso</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Partilhar Novo Recurso</DialogTitle>
              <DialogDescription>Adicione um ficheiro, livro ou vídeo para partilhar com a escola.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Título do Recurso</Label>
                <Input value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} placeholder="Ex: Livro de Matemática 10º Ano" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <select 
                    value={newResource.classId} 
                    onChange={e => setNewResource({...newResource, classId: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Selecione uma Turma</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Disciplina</Label>
                  <select 
                    value={newResource.subjectId} 
                    onChange={e => setNewResource({...newResource, subjectId: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Selecione uma Disciplina</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select 
                    value={newResource.type} 
                    onChange={e => {
                      setNewResource({...newResource, type: e.target.value, url: ''});
                      setSelectedFile(null);
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="pdf">Ficheiro (PDF)</option>
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo (Link)</option>
                    <option value="book">Livro (Link)</option>
                    <option value="link">Link Web</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {(newResource.type === 'pdf' || newResource.type === 'image') ? (
                    <>
                      <Label>Selecionar Ficheiro</Label>
                      <Input 
                        type="file" 
                        accept={newResource.type === 'pdf' ? '.pdf' : 'image/*'} 
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)} 
                        required={!selectedFile}
                      />
                    </>
                  ) : (
                    <>
                      <Label>URL (Link)</Label>
                      <Input 
                        type="url"
                        value={newResource.url} 
                        onChange={e => setNewResource({...newResource, url: e.target.value})} 
                        placeholder="https://..." 
                        required 
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={newResource.description} onChange={e => setNewResource({...newResource, description: e.target.value})} placeholder="Breve descrição do material" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'A partilhar...' : 'Partilhar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar por título ou disciplina..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value)}
                className="flex h-9 w-full sm:w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Todos os tipos</option>
                <option value="pdf">Documentos (PDF)</option>
                <option value="video">Vídeos</option>
                <option value="book">Livros</option>
                <option value="link">Links Úteis</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum recurso encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                  <CardHeader className="p-4 pb-2 border-b bg-slate-50/50 flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-white rounded-md shadow-sm shrink-0">
                        {getIconForType(resource.type)}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate" title={resource.title}>
                          {resource.title}
                        </CardTitle>
                        <CardDescription className="truncate text-xs">
                          {resource.subject?.name || 'Geral'} • {resource.class?.name || 'Todas as turmas'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {resource.description || 'Sem descrição.'}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(resource.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </span>
                      
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(resource.id)} title="Remover">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" size="sm" className="h-8" asChild>
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Acessar
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
