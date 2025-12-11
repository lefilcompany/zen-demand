import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Users, ArrowRight, Sparkles } from "lucide-react";
import logoSomaDark from "@/assets/logo-soma-dark.png";
import authBackground from "@/assets/auth-background.jpg";

export default function Welcome() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Mobile/Tablet Header with Image */}
      <div 
        className="lg:hidden relative h-48 sm:h-56 overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-background" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6 text-center">
          <img src={logoSomaDark} alt="SoMA" className="h-10 sm:h-12 w-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-semibold">
            Bem-vindo ao SoMA!
          </h2>
        </div>
      </div>

      {/* Desktop Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden"
        style={{
          backgroundImage: `url(${authBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <img src={logoSomaDark} alt="SoMA" className="h-12 w-auto" />
          </div>
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wide">Conta criada com sucesso</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
              Bem-vindo ao SoMA!
            </h1>
            <p className="text-lg xl:text-xl text-white/90 leading-relaxed">
              Escolha como você deseja começar sua jornada de gestão de demandas.
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

      {/* Form Section */}
      <div className="flex-1 lg:w-1/2 xl:w-2/5 flex items-start lg:items-center justify-center p-6 sm:p-8 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-6 sm:mb-8 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              O que você deseja fazer?
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Escolha uma opção para começar
            </p>
          </div>

          <div className="space-y-4">
            {/* Create Team Option */}
            <button
              onClick={() => navigate("/teams/create")}
              className="group w-full bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 rounded-2xl p-5 text-left transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                    Criar Nova Equipe
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Crie sua equipe e gerencie demandas. Você será o administrador com controle total.
                  </p>
                </div>
              </div>
            </button>

            {/* Join Team Option */}
            <button
              onClick={() => navigate("/teams/join")}
              className="group w-full bg-muted/50 hover:bg-muted border-2 border-border hover:border-primary/30 rounded-2xl p-5 text-left transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-300">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                    Entrar em Equipe
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Use um código de acesso para solicitar entrada em uma equipe existente.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Logout Button */}
          <div className="mt-8 pt-6 border-t border-border text-center">
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
    </div>
  );
}
