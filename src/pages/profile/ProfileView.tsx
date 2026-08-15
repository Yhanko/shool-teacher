import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, GraduationCap, Lock, Edit, Save, X, Loader2, Eye, EyeOff, Camera } from 'lucide-react';
import api from '@/services/api/axios';
import { toast } from 'sonner';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const profileUpdateSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres.").max(100, "Nome demasiado longo.").regex(/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/, "Apenas letras são permitidas."),
  email: z.string().email("E-mail inválido.").max(100, "O e-mail é demasiado longo."),
  phone: z.string().regex(/^\+?[\d\s-]{9,20}$/, "Formato de telefone inválido.").optional().or(z.literal("")),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória."),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres.").max(100, "A senha é demasiado longa."),
  confirmPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ProfileView() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [pwLoading, setPwLoading] = useState(false);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const profileForm = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me', {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      console.log("Fetched profile from backend:", res.data);
      setProfile(res.data);
      profileForm.reset({
        name: res.data.name || '',
        email: res.data.email || '',
        phone: res.data.employeeProfile?.phone || res.data.phone || '',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: ProfileUpdateFormValues) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        email: data.email,
        employeeProfile: { phone: data.phone }
      };
      const res = await api.patch('/users/me', payload);
      setProfile(res.data);
      updateUser(res.data);
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch {
      toast.error('Erro ao guardar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (data: ChangePasswordFormValues) => {
    setPwLoading(true);
    try {
      await api.patch('/users/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      toast.success('Senha alterada com sucesso!');
      setPwDialogOpen(false);
      passwordForm.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar a senha. Verifique a senha atual.');
    } finally {
      setPwLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
       toast.error("Por favor selecione uma imagem válida.");
       return;
    }
    if (file.size > 5 * 1024 * 1024) { 
       toast.error("A imagem deve ter no máximo 5MB.");
       return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    console.log('[Photo Upload] File selected:', file.name, file.type, file.size, 'bytes');
    console.log('[Photo Upload] FormData entries:', [...formData.entries()].map(([k, v]) => `${k}: ${v instanceof File ? v.name : v}`));

    setIsUploadingPhoto(true);
    try {
      console.log('[Photo Upload] Step 1: Sending to /uploads/cloudinary ...');
      // IMPORTANT: Do NOT set Content-Type manually — axios must set it with boundary for FormData
      const uploadRes = await api.post('/uploads/cloudinary', formData);
      
      console.log('[Photo Upload] Step 2: Cloudinary response:', uploadRes.data);
      const photoUrl = uploadRes.data.path;
      console.log('[Photo Upload] Step 3: Got photoUrl:', photoUrl);

      if (!photoUrl || !photoUrl.startsWith('http')) {
        toast.error('Erro: URL da foto inválida recebida do servidor.');
        return;
      }

      // Step 4: Update the user profile with the new photo URL
      console.log('[Photo Upload] Step 4: Patching /users/me with photoUrl:', photoUrl);
      const res = await api.patch('/users/me', {
        employeeProfile: { photoUrl }
      });
      
      console.log('[Photo Upload] Step 5: User profile updated:', res.data?.employeeProfile);
      
      if (res.data) {
        setProfile(res.data);
        updateUser(res.data); // Sync with Zustand + cookies
      }
      toast.success("Foto atualizada com sucesso!");
    } catch (error: any) {
      console.error('[Photo Upload] ERROR:', error.response?.data || error.message);
      toast.error(`Erro ao atualizar a foto: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const displayProfile = profile || user;
  const initials = displayProfile?.name ? displayProfile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'PR';

  const getPhotoUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${import.meta.env.VITE_API_URL || ''}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const resolvedPhotoUrl = getPhotoUrl(displayProfile?.employeeProfile?.photoUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Perfil do Professor</h1>
          <p className="text-muted-foreground">Gerir informações pessoais e configurações da conta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 text-center flex flex-col items-center">
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="relative inline-block cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {resolvedPhotoUrl ? (
                    <img src={resolvedPhotoUrl} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-sm" />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-sm">
                      {initials}
                    </div>
                  )}
                  
                  <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full shadow-md hover:bg-primary/90 transition-colors border-2 border-white">
                    {isUploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </div>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={isUploadingPhoto}
                  />
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto}>
                  Alterar foto de perfil
                </Button>
              </div>
              <h2 className="text-xl font-bold">{displayProfile?.name}</h2>
              <p className="text-muted-foreground text-sm mt-1">{displayProfile?.email}</p>
              <div className="mt-3">
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  {displayProfile?.role === 'TEACHER' ? 'Professor' : displayProfile?.role}
                </span>
              </div>
              {displayProfile?.institution?.name && (
                <p className="text-sm text-muted-foreground mt-2 font-medium">{displayProfile.institution.name}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info card */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={profileForm.handleSubmit(handleSave)}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Informações Pessoais</CardTitle>
                {!isEditing && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />Editar
                  </Button>
                )}
                {isEditing && (
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'A Guardar...' : 'Guardar'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      setIsEditing(false);
                      profileForm.reset({
                        name: displayProfile?.name || '',
                        email: displayProfile?.email || '',
                        phone: displayProfile?.employeeProfile?.phone || displayProfile?.phone || '',
                      });
                    }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2"><User className="w-4 h-4" />Nome Completo</Label>
                    {isEditing ? (
                      <div>
                        <Input 
                          className={`mt-1 ${profileForm.formState.errors.name ? 'border-red-500' : ''}`} 
                          {...profileForm.register("name")} 
                        />
                        {profileForm.formState.errors.name && (
                          <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.name.message}</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 font-medium">{displayProfile?.name || '—'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />Email</Label>
                    {isEditing ? (
                      <div>
                        <Input 
                          className={`mt-1 ${profileForm.formState.errors.email ? 'border-red-500' : ''}`} 
                          type="email" 
                          {...profileForm.register("email")} 
                        />
                        {profileForm.formState.errors.email && (
                          <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.email.message}</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 font-medium">{displayProfile?.email || '—'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-2"><GraduationCap className="w-4 h-4" />Função</Label>
                    <p className="mt-1 font-medium">{displayProfile?.role === 'TEACHER' ? 'Professor' : displayProfile?.role || '—'}</p>
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    {isEditing ? (
                      <div>
                        <Input 
                          className={`mt-1 ${profileForm.formState.errors.phone ? 'border-red-500' : ''}`} 
                          placeholder="+244 9XX XXX XXX" 
                          {...profileForm.register("phone")} 
                        />
                        {profileForm.formState.errors.phone && (
                          <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.phone.message}</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 font-medium">{displayProfile?.employeeProfile?.phone || displayProfile?.phone || '—'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Password change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Altere a sua senha para manter a conta segura.</p>
              <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Lock className="w-4 h-4 mr-2" />Alterar Senha</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Alterar Senha</DialogTitle></DialogHeader>
                  <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                    <div>
                      <Label>Senha Atual</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.current ? "text" : "password"}
                          placeholder="Insira a senha atual"
                          className={`pr-10 ${passwordForm.formState.errors.currentPassword ? 'border-red-500' : ''}`}
                          {...passwordForm.register("currentPassword")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.current ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {passwordForm.formState.errors.currentPassword && (
                        <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Nova Senha</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.new ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          className={`pr-10 ${passwordForm.formState.errors.newPassword ? 'border-red-500' : ''}`}
                          {...passwordForm.register("newPassword")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.new ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {passwordForm.formState.errors.newPassword && (
                        <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.confirm ? "text" : "password"}
                          className={`pr-10 ${passwordForm.formState.errors.confirmPassword ? 'border-red-500' : ''}`}
                          {...passwordForm.register("confirmPassword")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.confirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {passwordForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                    <Button type="submit" disabled={pwLoading} className="w-full">
                      {pwLoading ? 'A confirmar...' : 'Confirmar Alteração'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
