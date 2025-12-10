import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useAuth } from "@/lib/auth";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { TeamSelector } from "@/components/TeamSelector";
import { TeamPromptCard } from "@/components/TeamPromptCard";

interface RequireTeamProps {
  children: ReactNode;
}

function NoTeamPrompt() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-6">
      <div className="w-full max-w-2xl bg-background rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Bem-vindo ao DemandFlow!</h1>
          <p className="text-muted-foreground text-lg">
            Para começar, crie ou entre em uma equipe.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TeamPromptCard variant="create" />
          <TeamPromptCard variant="join" />
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
