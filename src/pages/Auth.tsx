import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import logoSoma from "@/assets/logo-soma.png";
import logoSomaDark from "@/assets/logo-soma-dark.png";
import authBackground from "@/assets/auth-background.jpg";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    phone: "",
    state: "",
    city: "",
    password: "",
  });

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

  const getErrorMessage = (error: any): string => {
    const message = error?.message?.toLowerCase() || "";

    if (message.includes("user already registered") || message.includes("already been registered")) {
      return "Este e-mail já está cadastrado. Tente fazer login.";
    }
    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return "E-mail ou senha incorretos.";
    }
    if (message.includes("email not confirmed")) {
      return "E-mail não confirmado. Verifique sua caixa de entrada.";
    }
    if (message.includes("password") && message.includes("weak")) {
      return "Senha muito fraca. Use pelo menos 6 caracteres.";
    }
    if (message.includes("invalid email")) {
      return "E-mail inválido. Verifique o formato.";
    }
    if (message.includes("too many requests") || message.includes("rate limit")) {
      return "Muitas tentativas. Aguarde alguns minutos.";
    }

    return error?.message || "Ocorreu um erro. Tente novamente.";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(loginData.email, loginData.password);
      toast.success("Login realizado com sucesso!", {
        description: "Bem-vindo de volta ao SoMA!",
      });
    } catch (error: any) {
      toast.error("Erro ao fazer login", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupData.password.length < 6) {
      toast.warning("Senha muito curta", {
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    if (!signupData.fullName.trim()) {
      toast.warning("Nome obrigatório", {
        description: "Por favor, informe seu nome completo.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await signUp(signupData.email, signupData.password, signupData.fullName);
      toast.success("Conta criada com sucesso!", {
        description: "Bem-vindo ao SoMA!",
      });
    } catch (error: any) {
      toast.error("Erro ao criar conta", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Mobile/Tablet Header with Image */}
      <div
        className="lg:hidden relative h-48 sm:h-64 md:h-72 overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6 text-center">
          <img src={logoSomaDark} alt="SoMA" className="h-10 sm:h-12 w-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-semibold">Gerencie suas demandas com eficiência</h2>
        </div>
      </div>

      {/* Desktop Left side - Image */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <img src={logoSomaDark} alt="SoMA" className="h-12 w-auto" />
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">Gerencie suas demandas com eficiência</h1>
            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              Organize, acompanhe e entregue projetos com sua equipe de forma colaborativa e transparente.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30" />
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30" />
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30" />
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center text-sm font-medium">
                +50
              </div>
            </div>
            <p className="text-white/80 text-sm">Empresas já utilizam o SoMA</p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-start lg:items-center justify-center p-6 sm:p-8 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Bem-vindo ao <Image src={logoSomaDark} alt="SoMA+" />
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Acesse sua conta ou crie uma nova</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5 sm:mb-6 h-10 sm:h-11 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger
                value="login"
                className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-11 sm:h-12"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="h-11 sm:h-12"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11 sm:h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
                    className="h-10 sm:h-11"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="h-10 sm:h-11"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Telefone</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="h-10 sm:h-11"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-state">Estado</Label>
                    <Input
                      id="signup-state"
                      type="text"
                      placeholder="UF"
                      className="h-10 sm:h-11"
                      value={signupData.state}
                      onChange={(e) => setSignupData({ ...signupData, state: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-city">Cidade</Label>
                    <Input
                      id="signup-city"
                      type="text"
                      placeholder="Sua cidade"
                      className="h-10 sm:h-11"
                      value={signupData.city}
                      onChange={(e) => setSignupData({ ...signupData, city: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    className="h-10 sm:h-11"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11 sm:h-12 text-base font-semibold" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
