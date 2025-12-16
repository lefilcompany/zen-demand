import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { WorkloadDistributionChart } from "@/components/WorkloadDistributionChart";
import { DashboardCustomizer } from "@/components/DashboardCustomizer";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { ScopeOverviewCard } from "@/components/ScopeOverviewCard";
import { DeliveryStatusChart } from "@/components/DeliveryStatusChart";
import { PeriodFilter, type PeriodType } from "@/components/PeriodFilter";
import { ExportReportButton } from "@/components/ExportReportButton";
import { useTeamScope, useMonthlyDemandCount } from "@/hooks/useTeamScope";
import { useDemandsByPeriod } from "@/hooks/useDemandsByPeriod";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";

const Index = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodType>("month");
  const { selectedTeamId } = useSelectedTeam();
  const { data: demands } = useDemands(selectedTeamId || undefined);
  const { data: teams } = useTeams();
  const { data: role, isLoading: roleLoading } = useTeamRole(selectedTeamId);
  const { data: scope, isLoading: scopeLoading } = useTeamScope();
  const { data: monthlyCount, isLoading: countLoading } = useMonthlyDemandCount();
  const { data: demandData, isLoading: demandsLoading } = useDemandsByPeriod(period);
  const { widgets, setWidgets, isSaving } = useDashboardWidgets();

  const isRequester = role === "requester";

  // Show loading while role is being determined to prevent layout glitch
  if (roleLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
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
  const currentTeam = teams?.find(t => t.id === selectedTeamId);

  const getLocale = () => {
    if (i18n.language === "en-US") return enUS;
    if (i18n.language === "es") return es;
    return ptBR;
  };

  const periodLabels: Record<PeriodType, string> = {
    week: t("reports.week"),
    month: t("reports.month"),
    quarter: t("reports.quarter")
  };

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
    status: d.demand_statuses?.name || t("common.status"),
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
          <div data-tour="dashboard-title">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "MMMM yyyy", { locale: getLocale() })}
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
              data-tour="new-demand-btn"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{t("demands.newDemand")}</span>
              <span className="sm:hidden">{t("demands.newDemand").split(" ")[0]}</span>
            </Button>
          </div>
        </div>

        {/* Scope Overview */}
        <ScopeOverviewCard 
          data-tour="scope-progress"
          used={monthlyCount || 0} 
          limit={limit}
          contractStart={scope?.contract_start_date}
          contractEnd={scope?.contract_end_date}
          scopeDescription={scope?.scope_description}
          active={scope?.active}
        />

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
                {t("demands.title").toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t("dashboard.delivered")}
              </CardTitle>
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold text-green-600">{deliveredCount}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                {t("kanban.delivered").toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t("dashboard.inProgress")}
              </CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold text-primary">{clientInProgressCount}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                {t("kanban.doing").toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t("kanban.toStart")}
              </CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-2xl md:text-3xl font-bold">{clientPendingCount}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                {t("common.loading").split("...")[0]}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart and Recent Demands */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2 items-stretch">
          {/* Status Chart */}
          <Card className="flex flex-col h-full">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("dashboard.deliveryStatus")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0 flex-1 flex items-center justify-center">
              <div className="w-full">
                <DeliveryStatusChart data={demandData?.byStatus || []} />
              </div>
            </CardContent>
          </Card>

          {/* Recent Demands */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("dashboard.recentActivities")}</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-xs md:text-sm"
                onClick={() => navigate("/demands")}
              >
                {t("common.view")}
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
                      {demand.demand_statuses?.name || t("common.status")}
                    </Badge>
                  </div>
                ))}

                {(!demandData?.demands || demandData.demands.length === 0) && (
                  <div className="text-center py-6 md:py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("demands.noDemands")}</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-sm"
                      onClick={() => navigate("/demands/create")}
                    >
                      {t("demands.createFirst")}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default Dashboard View (Admin, Moderator, Executor)
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div data-tour="dashboard-title">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t("dashboard.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t("settings.description")}</p>
        </div>
        <DashboardCustomizer widgets={widgets} onChange={setWidgets} isSaving={isSaving} />
      </div>

      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary/90 to-accent p-4 md:p-6 lg:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5"></div>
        <div className="relative z-10">
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold mb-2">{t("welcome.title")}</h2>
          <p className="text-primary-foreground/90 text-xs md:text-sm lg:text-base max-w-2xl">
            {t("settings.description")}
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
              <CardTitle className="text-xs md:text-sm font-medium">{t("dashboard.totalDemands")}</CardTitle>
              <Briefcase className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-foreground">{totalDemands}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">{t("demands.title")}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">{t("kanban.toStart")}</CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-warning" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-foreground">{pendingDemands}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">{t("common.loading").split("...")[0]}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">{t("dashboard.inProgress")}</CardTitle>
              <Timer className="h-3 w-3 md:h-4 md:w-4 text-accent" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-foreground">{inProgressDemands}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">{t("kanban.doing")}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">{t("dashboard.adjustments")}</CardTitle>
              <RefreshCw className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-foreground">{adjustmentDemands}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">{t("kanban.inAdjustment")}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">{t("dashboard.delivered")}</CardTitle>
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-success" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-foreground">{completedDemands}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">{t("kanban.delivered")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Teams Card */}
      {widgets.teamsCard && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t("teams.title")}
                </CardTitle>
                <CardDescription className="mt-1">{t("teams.myTeams")}</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/teams")}
                className="gap-1"
              >
                {t("common.viewAll")}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-primary">{totalTeams}</span>
                <span className="text-sm text-muted-foreground">{t("teams.title").toLowerCase()}</span>
              </div>
              {currentTeam && (
                <div className="flex-1 border-l pl-6">
                  <p className="text-sm font-medium text-foreground">{t("common.current")}:</p>
                  <p className="text-sm text-muted-foreground truncate">{currentTeam.name}</p>
                  {role && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {t(`roles.${role}`)}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                variant="default" 
                size="sm" 
                className="flex-1 gap-1"
                onClick={() => navigate("/create-team")}
              >
                <PlusCircle className="h-3 w-3" />
                {t("teams.createTeam")}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-1"
                onClick={() => navigate("/join-team")}
              >
                {t("teams.joinTeam")}
              </Button>
            </div>
          </CardContent>
        </Card>
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

      {/* Workload Distribution */}
      {widgets.workloadDistribution && selectedTeamId && demands && demands.length > 0 && (
        <WorkloadDistributionChart demands={demands} />
      )}

      {/* Recent Activities */}
      {widgets.recentActivities && <RecentActivities />}
    </div>
  );
};

export default Index;
