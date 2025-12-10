import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, CheckCircle2, Clock, Timer } from "lucide-react";
import { useDemands } from "@/hooks/useDemands";
import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";

const Index = () => {
  const { selectedTeamId } = useSelectedTeam();
  const { data: demands } = useDemands(selectedTeamId || undefined);
  const { data: teams } = useTeams();

  const totalDemands = demands?.length || 0;
  const inProgressDemands = demands?.filter((d) => d.demand_statuses?.name === "Fazendo").length || 0;
  const completedDemands = demands?.filter((d) => d.demand_statuses?.name === "Entregue").length || 0;
  const pendingDemands = demands?.filter((d) => d.demand_statuses?.name === "A Iniciar").length || 0;
  const totalTeams = teams?.length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de gerenciamento de demandas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Demandas</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalDemands}</div>
            <p className="text-xs text-muted-foreground">Demandas cadastradas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Iniciar</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingDemands}</div>
            <p className="text-xs text-muted-foreground">Aguardando início</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Timer className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{inProgressDemands}</div>
            <p className="text-xs text-muted-foreground">Demandas ativas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{completedDemands}</div>
            <p className="text-xs text-muted-foreground">Demandas finalizadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Equipes
            </CardTitle>
            <CardDescription>Equipes que você participa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalTeams}</div>
            <p className="text-sm text-muted-foreground mt-2">equipes cadastradas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Bem-vindo ao DemandFlow</CardTitle>
            <CardDescription>Sistema completo de gerenciamento de demandas para equipes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Selecione uma equipe no menu superior para visualizar as demandas. Use o Kanban para acompanhar o
              progresso das suas demandas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
