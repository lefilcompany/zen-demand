import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, CheckCircle2, Clock, Timer, RefreshCw } from "lucide-react";
import { useDemands } from "@/hooks/useDemands";
import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { DemandTrendChart } from "@/components/DemandTrendChart";
import { RecentActivities } from "@/components/RecentActivities";
import { AdjustmentTrendChart } from "@/components/AdjustmentTrendChart";

const Index = () => {
  const { selectedTeamId } = useSelectedTeam();
  const { data: demands } = useDemands(selectedTeamId || undefined);
  const { data: teams } = useTeams();

  const totalDemands = demands?.length || 0;
  const inProgressDemands = demands?.filter((d) => d.demand_statuses?.name === "Fazendo").length || 0;
  const completedDemands = demands?.filter((d) => d.demand_statuses?.name === "Entregue").length || 0;
  const pendingDemands = demands?.filter((d) => d.demand_statuses?.name === "A Iniciar").length || 0;
  const adjustmentDemands = demands?.filter((d) => d.demand_statuses?.name === "Em Ajuste").length || 0;
  const totalTeams = teams?.length || 0;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">Visão geral do sistema de gerenciamento de demandas</p>
      </div>

      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary/90 to-accent p-4 md:p-6 lg:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5"></div>
        <div className="relative z-10">
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-2">Bem-vindo ao SoMA</h2>
          <p className="text-primary-foreground/90 text-xs md:text-sm lg:text-base max-w-2xl">
            Gerencie suas demandas de forma eficiente. Acompanhe o progresso das suas equipes e mantenha tudo organizado em um só lugar.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-24 md:w-40 h-24 md:h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -right-5 -top-5 w-16 md:w-24 h-16 md:h-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total de Demandas</CardTitle>
            <Briefcase className="h-3 w-3 md:h-4 md:w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{totalDemands}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Demandas cadastradas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">A Iniciar</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-warning" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{pendingDemands}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Aguardando início</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Em Andamento</CardTitle>
            <Timer className="h-3 w-3 md:h-4 md:w-4 text-accent" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{inProgressDemands}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Demandas ativas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Em Ajuste</CardTitle>
            <RefreshCw className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{adjustmentDemands}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Aguardando ajustes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-success" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-foreground">{completedDemands}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Demandas finalizadas</p>
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
            <CardTitle>Bem-vindo ao SoMA</CardTitle>
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

      {/* Trend Charts */}
      {selectedTeamId && (
        <div className="grid gap-4 md:grid-cols-2">
          {demands && demands.length > 0 && (
            <DemandTrendChart demands={demands} />
          )}
          <AdjustmentTrendChart teamId={selectedTeamId} />
        </div>
      )}

      {/* Recent Activities */}
      <RecentActivities />
    </div>
  );
};

export default Index;
