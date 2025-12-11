import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TeamPromptCard } from "@/components/TeamPromptCard";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import logoSoma from "@/assets/logo-soma.png";

export default function Welcome() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-6">
      <div className="w-full max-w-2xl bg-background rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center flex flex-col items-center">
          <img src={logoSoma} alt="SoMA" className="h-16 w-auto mb-4" />
          <h1 className="text-3xl font-bold text-primary mb-2">Bem-vindo ao SoMA!</h1>
          <p className="text-muted-foreground text-lg">
            Sua conta foi criada com sucesso. O que você gostaria de fazer?
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TeamPromptCard variant="create" />
          <TeamPromptCard variant="join" />
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
}
