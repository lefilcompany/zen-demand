import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import logoSomaDark from "@/assets/logo-soma-dark.png";
import authBackground from "@/assets/auth-background.jpg";

// Parse error parameters from URL hash
function parseHashParams(hash: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!hash || hash.length <= 1) return params;
  
  const hashContent = hash.substring(1); // Remove the '#'
  const pairs = hashContent.split("&");
  
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  
  return params;
}

export default function ResetPassword() {
  const { t } = useTranslation();
  const { updatePassword, session, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorState, setErrorState] = useState<{
    type: "expired" | "invalid" | null;
    message: string;
  }>({ type: null, message: "" });
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for error parameters in URL hash on mount
  useEffect(() => {
    const hashParams = parseHashParams(window.location.hash);
    
    // Check for error in hash (e.g., #error=access_denied&error_code=otp_expired)
    if (hashParams.error) {
      const errorCode = hashParams.error_code || hashParams.error;
      const errorDescription = hashParams.error_description || "";
      
      if (errorCode === "otp_expired" || errorDescription.includes("expired")) {
        setErrorState({
          type: "expired",
          message: "O link de recuperação expirou. Solicite um novo link.",
        });
      } else {
        setErrorState({
          type: "invalid",
          message: "Link inválido. Por favor, solicite um novo link de recuperação.",
        });
      }
      setIsCheckingSession(false);
      return;
    }

    // If there's an access_token in the hash, Supabase will handle it via onAuthStateChange
    // Give time for the session to be established
    const timer = setTimeout(() => {
      setIsCheckingSession(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Handle session availability after initial check
  useEffect(() => {
    if (isCheckingSession) return;
    
    // If there's an error, don't redirect
    if (errorState.type) return;
    
    // If still no session after checking, show error
    if (!session) {
      setErrorState({
        type: "invalid",
        message: "Link inválido ou expirado. Por favor, solicite um novo link de recuperação.",
      });
    }
  }, [session, isCheckingSession, errorState.type]);

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resendEmail || !resendEmail.includes("@")) {
      toast.warning("Email inválido", {
        description: "Por favor, digite um email válido.",
      });
      return;
    }

    setIsResending(true);
    try {
      await resetPassword(resendEmail);
      toast.success("Email enviado!", {
        description: "Verifique sua caixa de entrada para o novo link.",
      });
      setResendEmail("");
    } catch (error: any) {
      toast.error("Erro ao enviar email", {
        description: error?.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.warning("Senha muito curta", {
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast.warning("Senhas não coincidem", {
        description: "As senhas digitadas não são iguais.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(password);
      setIsSuccess(true);
      toast.success("Senha alterada com sucesso!", {
        description: "Você será redirecionado para a página inicial.",
      });
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      toast.error("Erro ao alterar senha", {
        description: error?.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Error state - show error message and option to request new link
  if (errorState.type) {
    return (
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div 
          className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden" 
          style={{
            backgroundImage: `url(${authBackground})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 md:p-12 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">
                {errorState.type === "expired" ? "Link Expirado" : "Link Inválido"}
              </CardTitle>
              <CardDescription className="text-base">
                {errorState.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleResendEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Solicitar novo link</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="seu@email.com" 
                      className="h-11 sm:h-12 pl-10" 
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12"
                  disabled={isResending}
                >
                  {isResending ? "Enviando..." : "Enviar novo link"}
                </Button>
              </form>
              
              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={() => navigate("/auth")}
                  className="text-muted-foreground"
                >
                  Voltar para o login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isCheckingSession) {
    return (
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div 
          className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden" 
          style={{
            backgroundImage: `url(${authBackground})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 md:p-12 bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Verificando link...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div 
          className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden" 
          style={{
            backgroundImage: `url(${authBackground})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 md:p-12 bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Senha alterada!</h2>
              <p className="text-muted-foreground">
                Sua senha foi alterada com sucesso. Redirecionando...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Mobile/Tablet Header with Image */}
      <div 
        className="lg:hidden relative h-48 sm:h-64 md:h-72 overflow-hidden" 
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6 text-center">
          <img src={logoSomaDark} alt="SoMA" className="h-10 sm:h-12 w-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-semibold">Redefinir Senha</h2>
        </div>
      </div>

      {/* Desktop Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden" 
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="max-w-md">
            <KeyRound className="h-16 w-16 mb-6" />
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">Redefinir Senha</h1>
            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              Crie uma nova senha segura para acessar sua conta.
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-start lg:items-center justify-center p-6 sm:p-8 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Nova Senha</CardTitle>
              <CardDescription>
                Digite sua nova senha abaixo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="h-11 sm:h-12 pr-10" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 6 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input 
                      id="confirm-password" 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="h-11 sm:h-12 pr-10" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      required 
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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

                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 text-base font-semibold" 
                  disabled={isLoading}
                >
                  {isLoading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
