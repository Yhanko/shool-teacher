import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, GraduationCap, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AxiosError } from "axios";
import api from "@/services/api/axios";

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Recovery State
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      const { access_token } = response.data;

      const userProfile = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userData = userProfile.data;

      if (userData.role !== "TEACHER" && userData.role !== "ADMIN") {
        throw new Error("Conta sem permissão de acesso ao portal do professor.");
      }

      setAuth(userData, access_token);
      navigate("/dashboard");
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      if (axiosErr.response?.status === 403) {
        setError("A conta desta escola está suspensa. Contacte o administrador do sistema.");
      } else if (axiosErr.response?.status === 401) {
        setError("Email ou senha incorretos. Tente novamente.");
      } else if (err instanceof Error && err.message.includes("permissão")) {
        setError(err.message);
      } else {
        setError("Erro ao entrar. Verifique sua ligação e tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Por favor, insira o seu email.");
      return;
    }

    try {
      setIsLoading(true);
      await api.post("/auth/verify-email", { email, role: 'TEACHER' });
      setRecoveryStep(2);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || "Erro ao verificar conta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword || !confirmPassword) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setIsLoading(true);
      await api.post("/auth/reset-password", { email, role: 'TEACHER', newPassword });
      setIsRecovering(false);
      setRecoveryStep(1);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      alert("Senha alterada com sucesso! Faça login.");
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || "Erro ao redefinir senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[100vw] min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/5 rounded-full blur-2xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-white/10 backdrop-blur-sm bg-slate-900/80">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">Portal do Professor</CardTitle>
            <CardDescription className="mt-1 text-slate-400">
              {isRecovering 
                ? (recoveryStep === 1 ? <span key="step1">Recuperação de conta</span> : <span key="step2">Definir nova senha</span>)
                : <span key="login-desc">YhankoEduca — Acesso restrito a professores</span>
              }
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {!isRecovering ? (
          <form key="login-form" className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email institucional</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="professor@escola.ao"
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold h-11 transition-all duration-200 shadow-lg shadow-blue-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span key="loading">A entrar...</span>
                </>
              ) : (
                <span key="idle">Entrar no Portal</span>
              )}
            </Button>

            <p className="text-center text-xs text-slate-500">
              As suas credenciais foram fornecidas pelo administrador da escola.
              <br />
              Se não as tiver, contacte a secretaria.
            </p>
          </form>
          ) : recoveryStep === 1 ? (
            <form key="verify-form" className="space-y-5" onSubmit={handleVerifyEmail}>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="recovery-email" className="text-slate-300">Email da Conta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="recovery-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold h-11 transition-all duration-200 shadow-lg shadow-blue-500/20"
              >
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> <span key="loading">A verificar...</span></> : <span key="idle">Verificar Conta</span>}
              </Button>
            </form>
          ) : (
            <form key="reset-form" className="space-y-5" onSubmit={handleResetPassword}>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-300">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-300">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold h-11 transition-all duration-200 shadow-lg shadow-blue-500/20"
              >
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> <span key="loading">A redefinir...</span></> : <span key="idle">Redefinir Senha</span>}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-white/10 pt-4">
          {!isRecovering ? (
            <Button key="forgot-btn" variant="link" className="text-sm text-slate-300 hover:text-white p-0" onClick={() => setIsRecovering(true)}>
              Esqueceu a sua senha?
            </Button>
          ) : (
            <Button key="back-btn" variant="link" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 p-0" onClick={() => { setIsRecovering(false); setRecoveryStep(1); setError(""); }}>
              <ArrowLeft className="w-4 h-4" /> Voltar ao Login
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}