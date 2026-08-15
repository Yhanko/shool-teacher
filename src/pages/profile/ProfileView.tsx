import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, GraduationCap, Lock, Edit, Save, X, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '@/services/api/axios';
import { toast } from 'sonner';

export function ProfileView() {
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState({ name: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me');
      setProfile(res.data);
      setEditedData({
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: editedData.name,
        email: editedData.email,
        employeeProfile: { phone: editedData.phone }
      };
      const res = await api.patch('/users/me', payload);
      setProfile(res.data);
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch {
      toast.error('Erro ao guardar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      toast.error('A senha atual é obrigatória.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setPwLoading(true);
    try {
      await api.patch('/users/me/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Senha alterada com sucesso!');
      setPwDialogOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao alterar a senha. Verifique a senha atual.');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const displayProfile = profile || user;
  const initials = displayProfile?.name ? displayProfile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'PR';

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
            <CardContent className="p-6 text-center">
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold mx-auto">
                  {initials}
                </div>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações Pessoais</CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />Editar
                </Button>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'A Guardar...' : 'Guardar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2"><User className="w-4 h-4" />Nome Completo</Label>
                  {isEditing && (
                    <Input className="mt-1" value={editedData.name} onChange={e => setEditedData(p => ({ ...p, name: e.target.value }))} />
                  )}
                  {!isEditing && (
                    <p className="mt-1 font-medium">{displayProfile?.name || '—'}</p>
                  )}
                </div>
                <div>
                  <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />Email</Label>
                  {isEditing && (
                    <Input className="mt-1" type="email" value={editedData.email} onChange={e => setEditedData(p => ({ ...p, email: e.target.value }))} />
                  )}
                  {!isEditing && (
                    <p className="mt-1 font-medium">{displayProfile?.email || '—'}</p>
                  )}
                </div>
                <div>
                  <Label className="flex items-center gap-2"><GraduationCap className="w-4 h-4" />Função</Label>
                  <p className="mt-1 font-medium">{displayProfile?.role === 'TEACHER' ? 'Professor' : displayProfile?.role || '—'}</p>
                </div>
                <div>
                  <Label>Telefone</Label>
                  {isEditing && (
                    <Input className="mt-1" value={editedData.phone} onChange={e => setEditedData(p => ({ ...p, phone: e.target.value }))} placeholder="+244 9XX XXX XXX" />
                  )}
                  {!isEditing && (
                    <p className="mt-1 font-medium">{displayProfile?.employeeProfile?.phone || displayProfile?.phone || '—'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <div className="space-y-4">
                    <div>
                      <Label>Senha Atual</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={e => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
                          placeholder="Insira a senha atual"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.current ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label>Nova Senha</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                          placeholder="Mínimo 6 caracteres"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.new ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label>Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.confirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <Button onClick={handleChangePassword} disabled={pwLoading} className="w-full">
                      {pwLoading ? 'A confirmar...' : 'Confirmar Alteração'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
