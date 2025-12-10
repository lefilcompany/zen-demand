import { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { TeamSelector } from "@/components/TeamSelector";

interface RequireTeamProps {
  children: ReactNode;
}

function NoTeamPrompt() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-6">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Nenhuma Equipe</CardTitle>
          <CardDescription className="mt-2">
            Você precisa estar em uma equipe para acessar o sistema.
          </CardDescription>
        </div>
        <div className="space-y-3">
          <Button 
            onClick={() => navigate("/teams/join")} 
            className="w-full"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Entrar em uma Equipe
          </Button>
          <Button 
            onClick={() => navigate("/welcome")} 
            variant="outline"
            className="w-full"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectTeamPrompt() {
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
        <div className="flex justify-center">
          <TeamSelector />
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

  // Show no team prompt if user has no teams
  if (!hasTeams) {
    return <NoTeamPrompt />;
  }

  // Show select team prompt if no team selected
  if (!selectedTeamId) {
    return <SelectTeamPrompt />;
  }

  return <>{children}</>;
}
