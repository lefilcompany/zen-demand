import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/TeamCard";
import { useTeams } from "@/hooks/useTeams";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Users as UsersIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Teams() {
  const navigate = useNavigate();
  const { data: teams, isLoading } = useTeams();
  const { data: userRole } = useUserRole();

  const isAdmin = userRole === "admin";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Equipes</h1>
            <p className="text-muted-foreground">
              Gerencie suas equipes e membros
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/teams/join")} variant="outline">
              <UsersIcon className="mr-2 h-4 w-4" />
              Entrar em Equipe
            </Button>
            {isAdmin && (
              <Button onClick={() => navigate("/teams/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Equipe
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando equipes...</p>
          </div>
        ) : teams && teams.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma equipe encontrada</h3>
            <p className="text-muted-foreground mt-2">
              {isAdmin
                ? "Comece criando uma nova equipe"
                : "Entre em uma equipe usando um código de acesso"}
            </p>
            <div className="mt-6">
              {isAdmin ? (
                <Button onClick={() => navigate("/teams/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Equipe
                </Button>
              ) : (
                <Button onClick={() => navigate("/teams/join")}>
                  <UsersIcon className="mr-2 h-4 w-4" />
                  Entrar em Equipe
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
