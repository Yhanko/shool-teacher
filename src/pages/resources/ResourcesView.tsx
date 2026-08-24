import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { BookOpen, Download, Search, FileText, Video, Link as LinkIcon, Loader2, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '@/services/api/axios';
import { toast } from 'sonner';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const resourceSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres.").max(100, "O título é demasiado longo."),
  description: z.string().max(300, "A descrição é demasiado longa.").optional().or(z.literal("")),
  type: z.enum(["pdf", "image", "video", "book", "link"]),
  url: z.string().optional().or(z.literal("")),
  classId: z.string().optional().or(z.literal("")),
  subjectId: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.type !== 'pdf' && data.type !== 'image') {
    if (!data.url || data.url.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O URL é obrigatório para este tipo de recurso.",
        path: ["url"]
      });
    } else {
      try {
        new URL(data.url);
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Formato de URL inválido. Use http:// ou https://",
          path: ["url"]
        });
      }
    }
  }
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

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
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'pdf',
      url: '',
      classId: '',
      subjectId: ''
    }
  });
  
  const resourceType = form.watch('type');

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
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const formatUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('/')) return `${baseUrl}${url}`;
        if (!url.startsWith('http')) return `https://${url}`;
        return url;
      };

      const res = await api.get('/resources');
      const formattedResources = (res.data || []).map((r: any) => ({
        ...r,
        url: formatUrl(r.url)
      }));
      setResources(formattedResources);
    } catch (e) {
      console.error('Failed to fetch resources', e);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ResourceFormValues) => {
    const isFile = data.type === 'pdf' || data.type === 'image';
    if (isFile && !selectedFile) {
      toast.error('Por favor, selecione um ficheiro para upload.');
      return;
    }
    
    setIsCreating(true);
    try {
      let finalUrl = data.url;
      
      if (isFile && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await api.post('/uploads/cloudinary', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // FIX: The backend returns the Cloudinary url inside 'path', not 'url'
        finalUrl = uploadRes.data.path;
      }

      await api.post('/resources', { ...data, url: finalUrl });
      setIsDialogOpen(false);
      form.reset();
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
      case 'image': return <FileText className="w-5 h-5 text-blue-500" />;
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Título do Recurso</Label>
                <Input 
                  placeholder="Ex: Livro de Matemática 10º Ano" 
                  className={form.formState.errors.title ? 'border-red-500' : ''}
                  {...form.register("title")} 
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <select 
                    className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${form.formState.errors.classId ? 'border-red-500' : 'border-input'}`}
                    {...form.register("classId")}
                  >
                    <option value="">Geral (Toda a escola)</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Disciplina</Label>
                  <select 
                    className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${form.formState.errors.subjectId ? 'border-red-500' : 'border-input'}`}
                    {...form.register("subjectId")}
                  >
                    <option value="">Geral (Sem disciplina específica)</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select 
                    className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${form.formState.errors.type ? 'border-red-500' : 'border-input'}`}
                    {...form.register("type", {
                      onChange: () => {
                        form.setValue('url', '');
                        setSelectedFile(null);
                        form.clearErrors('url');
                      }
                    })}
                  >
                    <option value="pdf">Ficheiro (PDF)</option>
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo (Link)</option>
                    <option value="book">Livro (Link)</option>
                    <option value="link">Link Web</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {(resourceType === 'pdf' || resourceType === 'image') ? (
                    <>
                      <Label>Selecionar Ficheiro</Label>
                      <Input 
                        type="file" 
                        accept={resourceType === 'pdf' ? '.pdf' : 'image/*'} 
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)} 
                      />
                    </>
                  ) : (
                    <>
                      <Label>URL (Link)</Label>
                      <Input 
                        type="url"
                        placeholder="https://..." 
                        className={form.formState.errors.url ? 'border-red-500' : ''}
                        {...form.register("url")} 
                      />
                      {form.formState.errors.url && (
                        <p className="text-xs text-red-500">{form.formState.errors.url.message}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                  placeholder="Breve descrição do material" 
                  className={form.formState.errors.description ? 'border-red-500' : ''}
                  {...form.register("description")} 
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  form.reset();
                  setSelectedFile(null);
                }}>Cancelar</Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A partilhar...</>
                  ) : 'Partilhar'}
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
                <option value="image">Imagens</option>
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
                          {resource.subject?.name || 'Geral'} • {resource.class?.name || 'Geral'}
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" title="Remover">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isto irá apagar permanentemente o recurso selecionado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(resource.id)} className="bg-red-600 hover:bg-red-700">Apagar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="secondary" size="sm" className="h-8" onClick={async () => {
                          try {
                            const res = await fetch(resource.url);
                            if (!res.ok) throw new Error('Failed to fetch file');
                            const blob = await res.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = resource.title + (resource.type === 'pdf' ? '.pdf' : '');
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(blobUrl);
                          } catch (error) {
                            window.open(resource.url, '_blank');
                          }
                        }}>
                          <Download className="w-4 h-4 mr-2" />
                          Acessar
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
