import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import logoSoma from "@/assets/logo-soma.png";

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
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-6">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-xl p-8">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src={logoSoma} alt="SoMA" className="h-16 w-auto mb-2" />
          <p className="mt-2 text-muted-foreground">
            Sistema de Gerenciamento de Demandas
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <div className="space-y-6">
              <div>
                <CardTitle className="text-xl">Bem-vindo de volta</CardTitle>
                <CardDescription className="mt-1">
                  Faça login para acessar o sistema
                </CardDescription>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
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
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="signup">
            <div className="space-y-6">
              <div>
                <CardTitle className="text-xl">Criar conta</CardTitle>
                <CardDescription className="mt-1">
                  Preencha os dados para criar sua conta
                </CardDescription>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Seu nome"
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
                    value={signupData.password}
                    onChange={(e) =>
                      setSignupData({ ...signupData, password: e.target.value })
                    }
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
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
  );
}
