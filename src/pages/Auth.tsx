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
    email: "",
    password: "",
    fullName: "",
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
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        
        {/* Content over image */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <img src={logoSomaDark} alt="SoMA" className="h-12 w-auto" />
          </div>
          
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
              Gerencie suas demandas com eficiência
            </h1>
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
            <p className="text-white/80 text-sm">
              Empresas já utilizam o SoMA
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center flex flex-col items-center">
            <img src={logoSoma} alt="SoMA" className="h-14 w-auto mb-2" />
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <img src={logoSoma} alt="SoMA" className="h-10 w-auto mb-6" />
            <p className="text-muted-foreground">
              Sistema de Gerenciamento de Demandas
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
              <TabsTrigger value="login" className="text-base">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-base">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <div className="space-y-6">
                <div>
                  <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
                  <CardDescription className="mt-2">
                    Faça login para acessar o sistema
                  </CardDescription>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12"
                      value={loginData.email}
                      onChange={(e) =>
                        setLoginData({ ...loginData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-12"
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <div className="space-y-6">
                <div>
                  <CardTitle className="text-2xl">Criar conta</CardTitle>
                  <CardDescription className="mt-2">
                    Preencha os dados para criar sua conta
                  </CardDescription>
                </div>
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      className="h-12"
                      value={signupData.fullName}
                      onChange={(e) =>
                        setSignupData({ ...signupData, fullName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-12"
                      value={signupData.email}
                      onChange={(e) =>
                        setSignupData({ ...signupData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="h-12"
                      value={signupData.password}
                      onChange={(e) =>
                        setSignupData({ ...signupData, password: e.target.value })
                      }
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Criando conta..." : "Criar conta"}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
