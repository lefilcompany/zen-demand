import { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useAuth } from "@/lib/auth";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, LogOut } from "lucide-react";
import { TeamSelector } from "@/components/TeamSelector";
import { supabase } from "@/integrations/supabase/client";

interface RequireTeamProps {
  children: ReactNode;
}

function SelectTeamPrompt() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-6">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Selecione uma Equipe</CardTitle>
          <CardDescription className="mt-2">
            Escolha com qual equipe deseja trabalhar.
          </CardDescription>
        </div>
        <div className="flex flex-col items-center gap-4">
          <TeamSelector />
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RequireTeam({ children }: RequireTeamProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasTeams, selectedTeamId, isLoading } = useSelectedTeam();

  // Show loading while checking auth and teams
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to welcome if user has no teams
  if (!hasTeams) {
    return <Navigate to="/welcome" replace />;
  }

  // Show select team prompt if no team selected
  if (!selectedTeamId) {
    return <SelectTeamPrompt />;
  }

  return <>{children}</>;
}
