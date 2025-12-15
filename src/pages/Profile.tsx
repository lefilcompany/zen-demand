import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Camera, Loader2, Save, User, Mail, Calendar, Shield, Lock, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "" };
    
    let score = 0;
    const checks = {
      length: password.length >= 6,
      lengthBonus: password.length >= 10,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    if (checks.length) score += 1;
    if (checks.lengthBonus) score += 1;
    if (checks.hasUppercase) score += 1;
    if (checks.hasLowercase) score += 1;
    if (checks.hasNumber) score += 1;
    if (checks.hasSpecial) score += 1;
    
    if (score <= 2) return { score, label: "Fraca", color: "bg-destructive" };
    if (score <= 4) return { score, label: "Média", color: "bg-amber-500" };
    return { score, label: "Forte", color: "bg-emerald-500" };
  };

  // Password validation
  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  const newPasswordValid = newPassword.length >= 6;
  const canSubmitPassword = currentPasswordVerified && newPasswordValid && passwordsMatch;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; avatar_url: string | null }) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        })
        .eq("id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar perfil", {
        description: getErrorMessage(error),
      });
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Imagem carregada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }

    updateProfileMutation.mutate({
      full_name: fullName.trim(),
      avatar_url: avatarUrl || null,
    });
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      toast.error("Informe a senha atual");
      return;
    }
    
    if (!user?.email) {
      toast.error("Erro ao identificar usuário");
      return;
    }
    
    setIsVerifyingPassword(true);
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      
      if (signInError) {
        toast.error("Senha atual incorreta");
        setCurrentPasswordVerified(false);
        return;
      }
      
      setCurrentPasswordVerified(true);
      toast.success("Senha verificada! Agora você pode definir a nova senha.");
    } catch (error) {
      toast.error("Erro ao verificar senha", {
        description: getErrorMessage(error),
      });
      setCurrentPasswordVerified(false);
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPasswordVerified) {
      toast.error("Verifique a senha atual primeiro");
      return;
    }
    
    if (!newPassword.trim()) {
      toast.error("Informe a nova senha");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) {
        throw updateError;
      }
      
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPasswordVerified(false);
    } catch (error) {
      toast.error("Erro ao alterar senha", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCurrentPasswordChange = (value: string) => {
    setCurrentPassword(value);
    if (currentPasswordVerified) {
      setCurrentPasswordVerified(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Profile Hero Section */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />
        <CardContent className="relative pb-6">
          {/* Avatar */}
          <div className="absolute -top-16 left-6 md:left-8">
            <div className="relative group">
              <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-background shadow-xl">
                <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary font-semibold">
                  {fullName ? getInitials(fullName) : <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="h-6 w-6 text-white" />
                    <span className="text-xs text-white font-medium">Alterar</span>
                  </div>
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Profile Info Header */}
          <div className="pt-16 md:pt-20 md:pl-40">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {fullName || "Seu Nome"}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {user?.email}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Edit Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Informações Pessoais</h2>
                <p className="text-sm text-muted-foreground">Atualize seus dados</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="h-11 bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado
                </p>
              </div>

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full h-11 gap-2"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Informações da Conta</h2>
                <p className="text-sm text-muted-foreground">Detalhes do seu perfil</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Membro desde</p>
                  <p className="font-medium">
                    {profile?.created_at ? formatDate(profile.created_at) : "-"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">Foto de perfil</p>
                <p className="text-sm">
                  Formatos aceitos: <span className="font-medium">JPG, PNG ou GIF</span>
                </p>
                <p className="text-sm">
                  Tamanho máximo: <span className="font-medium">2MB</span>
                </p>
              </div>

              <Separator />

              <div className="p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <p className="text-sm text-center text-muted-foreground">
                  Precisa de ajuda? Entre em contato com o suporte.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Card - Full Width */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Alterar Senha</h2>
              <p className="text-sm text-muted-foreground">Atualize sua senha de acesso</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            {/* Step 1: Verify Current Password */}
            <div className="p-4 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${currentPasswordVerified ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                  {currentPasswordVerified ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                </div>
                <Label className="font-medium">Verificar Senha Atual</Label>
                {currentPasswordVerified && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verificada
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => handleCurrentPasswordChange(e.target.value)}
                    placeholder="Digite sua senha atual"
                    className="h-11 pr-10"
                    disabled={currentPasswordVerified}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant={currentPasswordVerified ? "outline" : "default"}
                  onClick={handleVerifyCurrentPassword}
                  disabled={isVerifyingPassword || !currentPassword.trim() || currentPasswordVerified}
                  className="shrink-0"
                >
                  {isVerifyingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentPasswordVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    "Verificar"
                  )}
                </Button>
              </div>
            </div>

            {/* Step 2: New Password Fields */}
            <div className={`p-4 rounded-lg border transition-all ${currentPasswordVerified ? 'bg-background' : 'bg-muted/30 opacity-60'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${currentPasswordVerified ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/30 text-muted-foreground'}`}>
                  2
                </div>
                <Label className="font-medium">Definir Nova Senha</Label>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite sua nova senha"
                      className={`h-11 pr-10 ${newPassword && !newPasswordValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      disabled={!currentPasswordVerified}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={!currentPasswordVerified}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPassword ? (
                    <div className="space-y-2">
                      {/* Strength Bar */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              level <= passwordStrength.score
                                ? passwordStrength.color
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      {/* Strength Label */}
                      <div className="flex items-center justify-between">
                        <p className={`text-xs flex items-center gap-1 ${newPasswordValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                          {newPasswordValid ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {newPasswordValid ? 'Mínimo atingido' : 'Mínimo de 6 caracteres'}
                        </p>
                        <span className={`text-xs font-medium ${
                          passwordStrength.score <= 2 ? 'text-destructive' : 
                          passwordStrength.score <= 4 ? 'text-amber-600 dark:text-amber-400' : 
                          'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua nova senha"
                      className={`h-11 pr-10 ${confirmPassword && !passwordsMatch ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      disabled={!currentPasswordVerified}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={!currentPasswordVerified}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p className={`text-xs flex items-center gap-1 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                      {passwordsMatch ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {passwordsMatch ? 'Senhas coincidem' : 'Senhas não coincidem'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                disabled={isChangingPassword || !canSubmitPassword}
                className="gap-2"
              >
                {isChangingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Alterar Senha
              </Button>
              
              {!currentPasswordVerified && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Verifique a senha atual primeiro
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
