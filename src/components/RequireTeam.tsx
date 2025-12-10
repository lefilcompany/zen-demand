import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RequireTeamProps {
  children: ReactNode;
}

function NoTeamPrompt() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Nenhuma Equipe</CardTitle>
          <CardDescription>
            Você precisa estar em uma equipe para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>
    </div>
  );
}

function SelectTeamPrompt() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Selecione uma Equipe</CardTitle>
          <CardDescription>
            Use o seletor de equipes no menu para escolher com qual equipe deseja trabalhar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => navigate("/teams")} 
            className="w-full"
          >
            Ver Minhas Equipes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function RequireTeam({ children }: RequireTeamProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasTeams, selectedTeamId, isLoading } = useSelectedTeam();

  // Show loading while checking auth and teams
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
