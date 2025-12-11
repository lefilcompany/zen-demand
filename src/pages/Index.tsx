import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Users, CheckCircle2, Clock, Timer, RefreshCw, FileText, PlusCircle, ArrowRight } from "lucide-react";
import { useDemands } from "@/hooks/useDemands";
import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeamRole } from "@/hooks/useTeamRole";
import { DemandTrendChart } from "@/components/DemandTrendChart";
import { RecentActivities } from "@/components/RecentActivities";
import { AdjustmentTrendChart } from "@/components/AdjustmentTrendChart";
import { PriorityDistributionChart } from "@/components/PriorityDistributionChart";
import { AverageCompletionTime } from "@/components/AverageCompletionTime";
import { DashboardCustomizer, useDashboardWidgets } from "@/components/DashboardCustomizer";
import { ScopeProgressBar } from "@/components/ScopeProgressBar";
import { DeliveryStatusChart } from "@/components/DeliveryStatusChart";
import { PeriodFilter, type PeriodType } from "@/components/PeriodFilter";
import { ExportReportButton } from "@/components/ExportReportButton";
import { useTeamScope, useMonthlyDemandCount } from "@/hooks/useTeamScope";
import { useDemandsByPeriod } from "@/hooks/useDemandsByPeriod";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const periodLabels: Record<PeriodType, string> = {
  week: "Esta Semana",
  month: "Este Mês",
  quarter: "Este Trimestre"
};

const Index = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodType>("month");
  const { selectedTeamId } = useSelectedTeam();
  const { data: demands } = useDemands(selectedTeamId || undefined);
  const { data: teams } = useTeams();
  const { data: role } = useTeamRole(selectedTeamId);
  const { data: scope, isLoading: scopeLoading } = useTeamScope();
  const { data: monthlyCount, isLoading: countLoading } = useMonthlyDemandCount();
  const { data: demandData, isLoading: demandsLoading } = useDemandsByPeriod(period);
  const { widgets, setWidgets } = useDashboardWidgets();

  const isRequester = role === "requester";
  const currentTeam = teams?.find(t => t.id === selectedTeamId);

  // Stats for all roles
  const totalDemands = demands?.length || 0;
  const inProgressDemands = demands?.filter((d) => d.demand_statuses?.name === "Fazendo").length || 0;
  const completedDemands = demands?.filter((d) => d.demand_statuses?.name === "Entregue").length || 0;
  const pendingDemands = demands?.filter((d) => d.demand_statuses?.name === "A Iniciar").length || 0;
  const adjustmentDemands = demands?.filter((d) => d.demand_statuses?.name === "Em Ajuste").length || 0;
  const totalTeams = teams?.length || 0;

  // Client-specific stats
  const deliveredCount = demandData?.byStatus.find(s => 
    s.name.toLowerCase().includes("entreg") || s.name.toLowerCase().includes("conclu")
  )?.count || 0;

  const clientInProgressCount = demandData?.byStatus.find(s => 
    s.name.toLowerCase().includes("fazendo") || s.name.toLowerCase().includes("andamento")
  )?.count || 0;

  const clientPendingCount = demandData?.byStatus.find(s => 
    s.name.toLowerCase().includes("iniciar") || s.name.toLowerCase().includes("pendente")
  )?.count || 0;

  const limit = scope?.monthly_demand_limit || 0;
  const canCreate = limit === 0 || (monthlyCount || 0) < limit;

  // Prepare export data
  const exportDemands = demandData?.demands.map((d: any) => ({
    title: d.title,
    status: d.demand_statuses?.name || "Sem status",
    created_at: d.created_at,
    priority: d.priority
  })) || [];

  // Show loading for requester view
  if (isRequester && (scopeLoading || countLoading || demandsLoading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Requester (Client) Dashboard View
  if (isRequester) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PeriodFilter value={period} onChange={setPeriod} />
            <ExportReportButton 
              demands={exportDemands}
              teamName={currentTeam?.name}
              periodLabel={periodLabels[period]}
              stats={{
                total: demandData?.total || 0,
                delivered: deliveredCount,
                inProgress: clientInProgressCount,
                pending: clientPendingCount
              }}
            />
            <Button 
              onClick={() => navigate("/demands/create")}
              disabled={!canCreate}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Demanda</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        </div>

        {/* Scope Progress */}
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <ScopeProgressBar 
              used={monthlyCount || 0} 
              limit={limit}
            />
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {periodLabels[period]}
              </CardTitle>
              <FileText className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold">{demandData?.total || 0}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                demandas no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Entregues
              </CardTitle>
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold text-green-600">{deliveredCount}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                concluídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Em Andamento
              </CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold text-primary">{clientInProgressCount}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                em execução
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                A Iniciar
              </CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold">{clientPendingCount}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                aguardando
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart and Recent Demands */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Status Chart */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Entregas por Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              <DeliveryStatusChart data={demandData?.byStatus || []} />
            </CardContent>
          </Card>

          {/* Recent Demands */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Últimas Demandas</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-xs md:text-sm"
                onClick={() => navigate("/demands")}
              >
                Ver todas
                <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              <div className="space-y-3">
                {demandData?.demands.slice(0, 5).map((demand: any) => (
                  <div 
                    key={demand.id}
                    className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer gap-2"
                    onClick={() => navigate(`/demands/${demand.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm md:text-base">{demand.title}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {format(new Date(demand.created_at), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge
                      className="text-[10px] md:text-xs flex-shrink-0"
                      style={{ 
                        backgroundColor: demand.demand_statuses?.color || "#6B7280",
                        color: "white"
                      }}
                    >
                      {demand.demand_statuses?.name || "Sem status"}
                    </Badge>
                  </div>
                ))}

                {(!demandData?.demands || demandData.demands.length === 0) && (
                  <div className="text-center py-6 md:py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma demanda encontrada</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-sm"
                      onClick={() => navigate("/demands/create")}
                    >
                      Criar primeira demanda
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contract Info */}
        {scope?.scope_description && (
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Escopo do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6 pt-0 md:pt-0">
              <p className="text-sm md:text-base text-muted-foreground">{scope.scope_description}</p>
              {(scope.contract_start_date || scope.contract_end_date) && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs md:text-sm">
                  {scope.contract_start_date && (
                    <div>
                      <span className="text-muted-foreground">Início: </span>
                      <span className="font-medium">
                        {format(new Date(scope.contract_start_date), "dd/MM/yyyy")}
                      </span>
                    </div>
                  )}
                  {scope.contract_end_date && (
                    <div>
                      <span className="text-muted-foreground">Término: </span>
                      <span className="font-medium">
                        {format(new Date(scope.contract_end_date), "dd/MM/yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Default Dashboard View (Admin, Moderator, Executor)
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Visão geral do sistema de gerenciamento de demandas</p>
        </div>
        <DashboardCustomizer widgets={widgets} onChange={setWidgets} />
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

      {/* Stats Cards */}
      {widgets.statsCards && (
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
      )}

      {/* Teams and Welcome Cards */}
      {(widgets.teamsCard || widgets.welcomeCard) && (
        <div className="grid gap-4 md:grid-cols-2">
          {widgets.teamsCard && (
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
          )}

          {widgets.welcomeCard && (
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
          )}
        </div>
      )}

      {/* Priority and Completion Time */}
      {selectedTeamId && demands && demands.length > 0 && (widgets.priorityChart || widgets.completionTime) && (
        <div className="grid gap-4 md:grid-cols-2">
          {widgets.priorityChart && (
            <PriorityDistributionChart demands={demands} />
          )}
          {widgets.completionTime && (
            <AverageCompletionTime demands={demands} />
          )}
        </div>
      )}

      {/* Trend Charts */}
      {selectedTeamId && (widgets.demandTrend || widgets.adjustmentTrend) && (
        <div className="grid gap-4 md:grid-cols-2">
          {widgets.demandTrend && demands && demands.length > 0 && (
            <DemandTrendChart demands={demands} />
          )}
          {widgets.adjustmentTrend && (
            <AdjustmentTrendChart teamId={selectedTeamId} />
          )}
        </div>
      )}

      {/* Recent Activities */}
      {widgets.recentActivities && <RecentActivities />}
    </div>
  );
};

export default Index;
