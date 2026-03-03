import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Check, X } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { Checkbox } from "@/components/ui/checkbox";
import logoSomaDark from "@/assets/logo-soma-dark.png";
import authBackground from "@/assets/auth-background.jpg";
interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}
interface IBGECity {
  id: number;
  nome: string;
}
export default function Auth() {
  const {
    t
  } = useTranslation();
  const {
    user,
    loading,
    signIn,
    signUp,
    resetPassword
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0); // Cooldown in seconds
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [states, setStates] = useState<IBGEState[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("rememberMe") === "true";
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    phone: "",
    state: "",
    city: "",
    password: "",
    confirmPassword: ""
  });

  // Fetch states from IBGE API
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const response = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
        const data = await response.json();
        setStates(data);
      } catch (error) {
        console.error("Error fetching states:", error);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, []);

  // Fetch cities when state changes
  useEffect(() => {
    if (!signupData.state) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      setLoadingCities(true);
      setCities([]);
      setSignupData(prev => ({
        ...prev,
        city: ""
      }));
      try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${signupData.state}/municipios?orderBy=nome`);
        const data = await response.json();
        setCities(data);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, [signupData.state]);

  // Cooldown timer effect
  useEffect(() => {
    if (resetCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setResetCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resetCooldown]);

  const handleGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error("Erro ao entrar com Google", {
          description: error.message || "Tente novamente.",
        });
      }
    } catch (error: any) {
      toast.error("Erro ao entrar com Google", {
        description: error?.message || "Tente novamente.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>;
  }
  
  // Only redirect if user is logged in AND not coming from password recovery flow
  // Check for recovery tokens in URL hash to prevent auto-redirect during password reset
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const isPasswordRecovery = hashParams.get("type") === "recovery" || hashParams.get("access_token");
  
  if (user && !isPasswordRecovery) {
    return <Navigate to="/welcome" replace />;
  }
  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setSignupData({
      ...signupData,
      phone: formatted
    });
  };
  const getErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || "";
    const code = error?.code?.toLowerCase() || "";
    
    // Invalid credentials
    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return "Email ou senha incorretos. Verifique suas credenciais e tente novamente.";
    }
    
    // User already registered
    if (message.includes("user already registered") || message.includes("already been registered")) {
      return "Este email já está cadastrado. Tente fazer login ou use outro email.";
    }
    
    // Email not confirmed
    if (message.includes("email not confirmed")) {
      return "Email não confirmado. Verifique sua caixa de entrada para confirmar seu cadastro.";
    }
    
    // Rate limit exceeded
    if (message.includes("rate limit") || message.includes("too many requests")) {
      return "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
    }
    
    // Network/connection errors
    if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
      return "Erro de conexão. Verifique sua internet e tente novamente.";
    }
    
    // Invalid email format
    if (message.includes("invalid email") || message.includes("email format")) {
      return "Formato de email inválido. Verifique o email digitado.";
    }
    
    // Weak password
    if (message.includes("weak password") || message.includes("password should be")) {
      return "A senha é muito fraca. Use pelo menos 6 caracteres.";
    }
    
    // User not found
    if (message.includes("user not found")) {
      return "Usuário não encontrado. Verifique o email ou crie uma nova conta.";
    }
    
    // Session expired
    if (message.includes("session") || message.includes("token") || message.includes("expired")) {
      return "Sua sessão expirou. Faça login novamente.";
    }
    
    // Signup disabled
    if (message.includes("signups not allowed") || message.includes("signup disabled")) {
      return "Novos cadastros estão desabilitados no momento.";
    }
    
    // Generic fallback with original message if available
    if (error?.message && error.message.length > 0 && error.message.length < 200) {
      return `Erro: ${error.message}`;
    }
    
    return "Ocorreu um erro. Por favor, tente novamente.";
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        sessionStorage.removeItem("sessionOnly");
      } else {
        localStorage.removeItem("rememberMe");
        sessionStorage.setItem("sessionOnly", "true");
      }
      await signIn(loginData.email, loginData.password);
      toast.success("Bem-vindo ao SoMA+", {
        description: "Login realizado com sucesso!"
      });
    } catch (error: any) {
      toast.error("Erro ao realizar login", {
        description: getErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent form
    
    if (!resetEmail.trim()) {
      toast.warning("Informe o email", {
        description: "Digite o email associado à sua conta."
      });
      return;
    }

    if (resetCooldown > 0) {
      return; // Already in cooldown
    }

    setIsResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      toast.success("Email enviado!", {
        description: "Verifique sua caixa de entrada para redefinir sua senha."
      });
      setResetDialogOpen(false);
      setResetEmail("");
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || "";
      
      // Check for rate limit error and extract seconds
      const rateLimitMatch = errorMessage.match(/after (\d+) seconds/i);
      if (rateLimitMatch) {
        const seconds = parseInt(rateLimitMatch[1], 10);
        setResetCooldown(seconds);
        toast.error("Aguarde para tentar novamente", {
          description: `Por segurança, você pode solicitar um novo email em ${seconds} segundos.`,
        });
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("security purposes")) {
        // Generic rate limit without specific seconds
        setResetCooldown(60);
        toast.error("Aguarde para tentar novamente", {
          description: "Por segurança, aguarde 60 segundos antes de solicitar outro email.",
        });
      } else {
        toast.error("Erro ao enviar email", {
          description: getErrorMessage(error)
        });
      }
    } finally {
      setIsResetLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password.length < 6) {
      toast.warning(t("toast.warning"), {
        description: t("profile.newPassword")
      });
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast.warning(t("toast.warning"), {
        description: t("profile.passwordMismatch")
      });
      return;
    }
    if (!signupData.fullName.trim()) {
      toast.warning(t("toast.warning"), {
        description: t("auth.fullName")
      });
      return;
    }
    setIsLoading(true);
    try {
      await signUp(signupData.email, signupData.password, signupData.fullName);
      toast.success(t("toast.success"), {
        description: t("welcome.title")
      });
    } catch (error: any) {
      toast.error(t("toast.error"), {
        description: getErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (password: string): {
    level: number;
    label: string;
    color: string;
  } => {
    if (!password) return {
      level: 0,
      label: "",
      color: ""
    };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (score <= 1) return {
      level: 1,
      label: "Fraca",
      color: "bg-destructive"
    };
    if (score <= 2) return {
      level: 2,
      label: "Fraca",
      color: "bg-destructive"
    };
    if (score <= 3) return {
      level: 3,
      label: "Média",
      color: "bg-amber-500"
    };
    if (score <= 4) return {
      level: 4,
      label: "Forte",
      color: "bg-emerald-500"
    };
    return {
      level: 5,
      label: "Muito forte",
      color: "bg-emerald-600"
    };
  };
  const passwordStrength = getPasswordStrength(signupData.password);

  // Password match validation
  const passwordsMatch = signupData.password && signupData.confirmPassword && signupData.password === signupData.confirmPassword;
  const passwordsDontMatch = signupData.confirmPassword && signupData.password !== signupData.confirmPassword;
  return <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden">
      {/* Mobile/Tablet Header with Image - Fixed height */}
      <div className="lg:hidden relative h-40 sm:h-48 md:h-56 flex-shrink-0 overflow-hidden" style={{
      backgroundImage: `url(${authBackground})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    }}>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6 text-center">
          <img src={logoSomaDark} alt="SoMA" className="h-10 sm:h-12 w-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-semibold">{t("settings.description")}</h2>
        </div>
      </div>

      {/* Desktop Left side - Image - Fixed full height */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 h-full relative overflow-hidden" style={{
      backgroundImage: `url(${authBackground})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    }}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div />
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">{t("settings.description")}</h1>
            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              {t("welcome.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30" />
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30" />
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30" />
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center text-sm font-medium">
                +30
              </div>
            </div>
            <p className="text-white/80 text-sm">{t("teams.title")}</p>
          </div>
        </div>
      </div>

      {/* Form Section - Scrollable on mobile */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex flex-col bg-background overflow-y-auto lg:overflow-y-auto">
        <div className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="w-full max-w-md py-4 pb-8">
            <div className="mb-5 sm:mb-6 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                {t("auth.welcomeBack")} <img alt="SoMA+" src="/lovable-uploads/9889f524-0819-424e-9185-2cc441526116.png" className="h-10 w-20 inline-block items-center justify-center" />
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">{t("auth.loginDescription")}</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-5 h-10 sm:h-11 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="login" className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                  {t("auth.login")}
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                  {t("auth.signup")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t("common.email")}</Label>
                    <Input id="login-email" type="email" placeholder="seu@email.com" className="h-11 sm:h-12" value={loginData.email} onChange={e => setLoginData({
                    ...loginData,
                    email: e.target.value
                  })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t("common.password")}</Label>
                    <div className="relative">
                      <Input id="login-password" type={showLoginPassword ? "text" : "password"} placeholder="••••••••" className="h-11 sm:h-12 pr-10" value={loginData.password} onChange={e => setLoginData({
                      ...loginData,
                      password: e.target.value
                    })} required />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                        {showLoginPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={checked => setRememberMe(checked === true)} />
                      <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                        Manter conectado
                      </Label>
                    </div>
                    <Button type="button" variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-primary" onClick={() => setResetDialogOpen(true)}>
                      Esqueceu a senha?
                    </Button>
                  </div>
                  
                  <Button type="submit" className="w-full h-11 sm:h-12 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? t("common.loading") : t("auth.login")}
                  </Button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 sm:h-12 text-base font-medium gap-3"
                    disabled={isLoading || isGoogleLoading}
                    onClick={handleGoogleSignIn}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Entrar com Google
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-3">
                  {/* Nome */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">{t("auth.fullName")}</Label>
                    <Input id="signup-name" type="text" placeholder={t("common.name")} className="h-10" value={signupData.fullName} onChange={e => setSignupData({
                    ...signupData,
                    fullName: e.target.value
                  })} required />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">{t("common.email")}</Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" className="h-10" value={signupData.email} onChange={e => setSignupData({
                    ...signupData,
                    email: e.target.value
                  })} required />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-phone">{t("common.phone")}</Label>
                    <Input id="signup-phone" type="tel" placeholder="(00) 00000-0000" className="h-10" value={signupData.phone} onChange={handlePhoneChange} maxLength={16} required />
                  </div>

                  {/* Estado + Cidade */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-state">{t("common.state")}</Label>
                      <Select value={signupData.state} onValueChange={value => setSignupData({
                      ...signupData,
                      state: value
                    })}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={loadingStates ? "..." : "UF"} />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingStates ? <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div> : states.map(state => <SelectItem key={state.id} value={state.sigla}>
                                {state.sigla} - {state.nome}
                              </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-city">{t("common.city")}</Label>
                    <Select value={signupData.city} onValueChange={value => setSignupData({
                      ...signupData,
                      city: value
                    })} disabled={!signupData.state || loadingCities}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione a cidade"} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCities ? <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div> : cities.map(city => <SelectItem key={city.id} value={city.nome}>
                              {city.nome}
                            </SelectItem>)}
                      </SelectContent>
                    </Select>
                    </div>
                  </div>

                  {/* Senha + Confirmar Senha */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-password">{t("common.password")}</Label>
                        <div className="relative">
                          <Input id="signup-password" type={showSignupPassword ? "text" : "password"} placeholder="••••••••" className="h-10 pr-9" value={signupData.password} onChange={e => setSignupData({
                          ...signupData,
                          password: e.target.value
                        })} required />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-2.5 hover:bg-transparent" onClick={() => setShowSignupPassword(!showSignupPassword)}>
                            {showSignupPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-confirm-password">{t("auth.confirmPassword")}</Label>
                        <div className="relative">
                          <Input id="signup-confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" className={`h-10 pr-16 ${passwordsMatch ? 'border-emerald-500 focus-visible:ring-emerald-500' : ''} ${passwordsDontMatch ? 'border-destructive focus-visible:ring-destructive' : ''}`} value={signupData.confirmPassword} onChange={e => setSignupData({
                          ...signupData,
                          confirmPassword: e.target.value
                        })} required />
                          <div className="absolute right-0 top-0 h-full flex items-center">
                            {signupData.confirmPassword && <span className="pr-1">
                                {passwordsMatch ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-destructive" />}
                              </span>}
                            <Button type="button" variant="ghost" size="icon" className="h-full px-2.5 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                              {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Password Strength Indicator */}
                    {signupData.password && <div className="space-y-1 mt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength.level ? passwordStrength.color : "bg-muted"}`} />)}
                        </div>
                        <p className={`text-xs ${passwordStrength.level <= 2 ? "text-destructive" : passwordStrength.level === 3 ? "text-amber-500" : "text-emerald-500"}`}>
                          Força: {passwordStrength.label}
                        </p>
                      </div>}
                  </div>

                  {/* Password validation feedback */}
                  {passwordsDontMatch}

                  <Button type="submit" className="w-full h-11 text-base font-semibold mt-2" disabled={isLoading || passwordsDontMatch}>
                    {isLoading ? t("common.loading") : t("auth.signup")}
                  </Button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 text-base font-medium gap-3"
                    disabled={isLoading || isGoogleLoading}
                    onClick={handleGoogleSignIn}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Cadastrar com Google
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Password Reset Dialog - Outside of login form to prevent form submission conflicts */}
            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogContent 
                className="sm:max-w-md" 
                onPointerDownOutside={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  // Prevent Enter key from propagating to any parent forms
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                  }
                }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Recuperar Senha
                  </DialogTitle>
                  <DialogDescription>
                    Digite seu email e enviaremos um link para redefinir sua senha.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input 
                      id="reset-email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      value={resetEmail} 
                      onChange={e => setResetEmail(e.target.value)} 
                      required 
                      autoFocus
                      onKeyDown={(e) => {
                        // Prevent Enter from bubbling up to any parent form
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                        }
                      }}
                    />
                  </div>
                  {resetCooldown > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Aguarde {resetCooldown}s para solicitar novamente</span>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setResetDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isResetLoading || resetCooldown > 0}>
                      {isResetLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : resetCooldown > 0 ? (
                        `Aguarde ${resetCooldown}s`
                      ) : (
                        "Enviar Link"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>;
}