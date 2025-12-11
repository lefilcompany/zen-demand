import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Users, ArrowRight, Sparkles } from "lucide-react";
import logoSoma from "@/assets/logo-soma.png";

export default function Welcome() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-sidebar to-background flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-3xl">
        {/* Hero Card */}
        <div className="bg-background/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-border/50 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,hsl(var(--primary)/0.15),transparent_50%)]" />
            <div className="relative">
              <div className="inline-flex items-center justify-center mb-6">
                <img 
                  src={logoSoma} 
                  alt="SoMA" 
                  className="h-16 md:h-20 w-auto drop-shadow-lg animate-in fade-in zoom-in duration-500" 
                />
              </div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">Conta criada com sucesso!</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 animate-in slide-in-from-bottom-4 duration-500">
                Bem-vindo ao SoMA!
              </h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-500 delay-100">
                Escolha como você deseja começar sua jornada
              </p>
            </div>
          </div>

          {/* Options Grid */}
          <div className="p-6 md:p-10">
            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
              {/* Create Team Card */}
              <button
                onClick={() => navigate("/teams/create")}
                className="group relative bg-gradient-to-br from-primary/5 to-transparent border-2 border-primary/20 hover:border-primary/50 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Plus className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                    Criar Nova Equipe
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Crie sua equipe e gerencie demandas. Você será o administrador com controle total.
                  </p>
                </div>
              </button>

              {/* Join Team Card */}
              <button
                onClick={() => navigate("/teams/join")}
                className="group relative bg-gradient-to-br from-secondary/10 to-transparent border-2 border-border hover:border-primary/30 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-secondary text-secondary-foreground mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Users className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                    Entrar em Equipe
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Use um código de acesso para solicitar entrada em uma equipe existente.
                  </p>
                </div>
              </button>
            </div>

            {/* Logout Button */}
            <div className="mt-8 pt-6 border-t border-border/50 text-center">
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair da Conta
              </Button>
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-muted-foreground/60 text-sm mt-6">
          Não sabe o que escolher? Crie uma equipe para começar a gerenciar demandas.
        </p>
      </div>
    </div>
  );
}
