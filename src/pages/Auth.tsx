import { useState, useEffect } from "react";
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
  const { t } = useTranslation();
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
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
      setSignupData(prev => ({ ...prev, city: "" }));
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
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
    setSignupData({ ...signupData, phone: formatted });
  };

  const getErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || "";
    if (message.includes("user already registered") || message.includes("already been registered")) {
      return t("auth.hasAccount");
    }
    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return t("toast.error");
    }
    if (message.includes("email not confirmed")) {
      return t("common.email");
    }
    return error?.message || t("toast.error");
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
      toast.success(t("toast.success"), {
        description: t("auth.welcomeBack")
      });
    } catch (error: any) {
      toast.error(t("toast.error"), {
        description: getErrorMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.warning("Informe o email", {
        description: "Digite o email associado à sua conta.",
      });
      return;
    }
    setIsResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      toast.success("Email enviado!", {
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      setResetDialogOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error("Erro ao enviar email", {
        description: getErrorMessage(error),
      });
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

  // Password match validation
  const passwordsMatch = signupData.password && signupData.confirmPassword && signupData.password === signupData.confirmPassword;
  const passwordsDontMatch = signupData.confirmPassword && signupData.password !== signupData.confirmPassword;

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* Mobile/Tablet Header with Image - Fixed height */}
      <div 
        className="lg:hidden relative h-40 sm:h-48 md:h-56 flex-shrink-0 overflow-hidden" 
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6 text-center">
          <img src={logoSomaDark} alt="SoMA" className="h-10 sm:h-12 w-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-semibold">{t("settings.description")}</h2>
        </div>
      </div>

      {/* Desktop Left side - Image - Fixed full height */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 h-full relative overflow-hidden" 
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
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

      {/* Form Section */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex flex-col bg-background">
        <div className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="w-full max-w-md py-4">
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
                    <Input 
                      id="login-email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      className="h-11 sm:h-12" 
                      value={loginData.email} 
                      onChange={e => setLoginData({...loginData, email: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t("common.password")}</Label>
                    <div className="relative">
                      <Input 
                        id="login-password" 
                        type={showLoginPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="h-11 sm:h-12 pr-10" 
                        value={loginData.password} 
                        onChange={e => setLoginData({...loginData, password: e.target.value})} 
                        required 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember-me" 
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <Label 
                        htmlFor="remember-me" 
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Manter conectado
                      </Label>
                    </div>
                    <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-primary">
                          Esqueceu a senha?
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
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
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setResetDialogOpen(false)}
                            >
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={isResetLoading}>
                              {isResetLoading ? "Enviando..." : "Enviar Link"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <Button type="submit" className="w-full h-11 sm:h-12 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? t("common.loading") : t("auth.login")}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-3">
                  {/* Nome */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">{t("auth.fullName")}</Label>
                    <Input 
                      id="signup-name" 
                      type="text" 
                      placeholder={t("common.name")} 
                      className="h-10" 
                      value={signupData.fullName} 
                      onChange={e => setSignupData({...signupData, fullName: e.target.value})} 
                      required 
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">{t("common.email")}</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      className="h-10" 
                      value={signupData.email} 
                      onChange={e => setSignupData({...signupData, email: e.target.value})} 
                      required 
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-phone">{t("common.phone")}</Label>
                    <Input 
                      id="signup-phone" 
                      type="tel" 
                      placeholder="(00) 00000-0000" 
                      className="h-10" 
                      value={signupData.phone} 
                      onChange={handlePhoneChange}
                      maxLength={16}
                      required 
                    />
                  </div>

                  {/* Estado + Cidade */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-state">{t("common.state")}</Label>
                      <Select
                        value={signupData.state}
                        onValueChange={(value) => setSignupData({...signupData, state: value})}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={loadingStates ? "..." : "UF"} />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingStates ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            states.map((state) => (
                              <SelectItem key={state.id} value={state.sigla}>
                                {state.sigla} - {state.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-city">{t("common.city")}</Label>
                    <Select
                      value={signupData.city}
                      onValueChange={(value) => setSignupData({...signupData, city: value})}
                      disabled={!signupData.state || loadingCities}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione a cidade"} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCities ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          cities.map((city) => (
                            <SelectItem key={city.id} value={city.nome}>
                              {city.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    </div>
                  </div>

                  {/* Senha + Confirmar Senha */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password">{t("common.password")}</Label>
                      <div className="relative">
                        <Input 
                          id="signup-password" 
                          type={showSignupPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="h-10 pr-9" 
                          value={signupData.password} 
                          onChange={e => setSignupData({...signupData, password: e.target.value})} 
                          required 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-2.5 hover:bg-transparent"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                        >
                          {showSignupPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-confirm-password">{t("auth.confirmPassword")}</Label>
                      <div className="relative">
                        <Input 
                          id="signup-confirm-password" 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className={`h-10 pr-16 ${passwordsMatch ? 'border-emerald-500 focus-visible:ring-emerald-500' : ''} ${passwordsDontMatch ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                          value={signupData.confirmPassword} 
                          onChange={e => setSignupData({...signupData, confirmPassword: e.target.value})} 
                          required 
                        />
                        <div className="absolute right-0 top-0 h-full flex items-center">
                          {signupData.confirmPassword && (
                            <span className="pr-1">
                              {passwordsMatch ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <X className="h-4 w-4 text-destructive" />
                              )}
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-full px-2.5 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Password validation feedback */}
                  {passwordsDontMatch && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <X className="h-3 w-3" />
                      As senhas não coincidem
                    </p>
                  )}

                  <Button type="submit" className="w-full h-11 text-base font-semibold mt-2" disabled={isLoading || passwordsDontMatch}>
                    {isLoading ? t("common.loading") : t("auth.signup")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
