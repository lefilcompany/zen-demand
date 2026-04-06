import { useState } from "react";
import { DashboardBanner } from "@/components/DashboardBanner";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, FileText, Plus, ArrowRight } from "lucide-react";
import { useDemands } from "@/hooks/useDemands";
import { useTeams } from "@/hooks/useTeams";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useBoardRole } from "@/hooks/useBoardMembers";
import { RecentActivities } from "@/components/RecentActivities";
import { DashboardCustomizer } from "@/components/DashboardCustomizer";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { ScopeOverviewCard } from "@/components/ScopeOverviewCard";
import { DeliveryStatusChart } from "@/components/DeliveryStatusChart";
import { PeriodFilter, type PeriodType } from "@/components/PeriodFilter";
import { ExportReportButton } from "@/components/ExportReportButton";
import { useTeamScope } from "@/hooks/useTeamScope";
import { useCanCreateDemandOnBoard } from "@/hooks/useBoardScope";
import { useDemandsByPeriod } from "@/hooks/useDemandsByPeriod";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { InfoTooltip } from "@/components/InfoTooltip";
import { ptBR, enUS, es } from "date-fns/locale";
import { useCreateDemandModal } from "@/contexts/CreateDemandContext";
import { useTeamMembershipRole } from "@/hooks/useTeamRole";
import { DashboardAIInsights } from "@/components/DashboardAIInsights";
import { ProductivitySection } from "@/components/ProductivitySection";
import { DemandsSectionCard } from "@/components/DemandsSectionCard";
import { MemberAnalysisSection } from "@/components/MemberAnalysisSection";

const Index = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { openCreateDemand } = useCreateDemandModal();
  const [period, setPeriod] = useState<PeriodType>("month");
  const { selectedTeamId } = useSelectedTeam();
  const { selectedBoardId, currentTeamId } = useSelectedBoard();
  const { data: demands } = useDemands(selectedBoardId || undefined);
  const { data: teams } = useTeams();
  const { data: role, isLoading: roleLoading } = useBoardRole(selectedBoardId);
  const { data: teamMembershipRole, isLoading: teamRoleLoading } = useTeamMembershipRole(selectedTeamId);
  const { data: scope, isLoading: scopeLoading } = useTeamScope();
  const { 
    canCreate, 
    monthlyCount, 
    limit, 
    hasBoardLimit,
    isLoading: boardScopeLoading 
  } = useCanCreateDemandOnBoard(selectedBoardId, selectedTeamId);
  const { data: demandData, isLoading: demandsLoading } = useDemandsByPeriod(period);
  const { widgets, setWidgets, isSaving } = useDashboardWidgets();

  const isRequester = role === "requester" || (!role && teamMembershipRole === "requester");

  // Show loading while role is being determined to prevent layout glitch
  if (roleLoading || teamRoleLoading) {
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

  // Stats
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

  const isTeamActive = scope?.active ?? true;

  // Prepare export data
  const exportDemands = demandData?.demands.map((d: any) => ({
    title: d.title,
    status: d.demand_statuses?.name || t("common.status"),
    created_at: d.created_at,
    priority: d.priority
  })) || [];

  // Show loading for requester view
  if (isRequester && (scopeLoading || boardScopeLoading || demandsLoading)) {
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
              onClick={() => navigate("/demands/request")}
              disabled={!isTeamActive}
              className="gap-2"
              data-tour="new-demand-btn"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Solicitação</span>
              <span className="sm:hidden">Solicitar</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <div className="flex items-center gap-1">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  {periodLabels[period]}
                </CardTitle>
                <InfoTooltip text="Total de demandas criadas no período selecionado." />
              </div>
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
              <div className="flex items-center gap-1">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  {t("dashboard.delivered")}
                </CardTitle>
                <InfoTooltip text="Demandas que foram concluídas e entregues com sucesso no período." />
              </div>
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
              <div className="flex items-center gap-1">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  {t("dashboard.inProgress")}
                </CardTitle>
                <InfoTooltip text="Demandas que estão atualmente sendo executadas pela equipe." />
              </div>
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
              <div className="flex items-center gap-1">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  {t("kanban.toStart")}
                </CardTitle>
                <InfoTooltip text="Demandas que ainda não foram iniciadas e aguardam execução." />
              </div>
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
                      onClick={() => navigate("/demands/request")}
                    >
                      Criar Solicitação
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {hasBoardLimit && (
          <ScopeOverviewCard 
            data-tour="scope-progress"
            used={monthlyCount} 
            limit={limit}
            contractStart={scope?.contract_start_date}
            contractEnd={scope?.contract_end_date}
            scopeDescription={scope?.scope_description}
            active={scope?.active}
          />
        )}
      </div>
    );
  }

  // Default Dashboard View (Admin, Moderator, Executor)
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header with title and customizer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div data-tour="dashboard-title">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t("dashboard.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t("settings.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardCustomizer widgets={widgets} onChange={setWidgets} isSaving={isSaving} />
        </div>
      </div>

      {/* Banner */}
      <DashboardBanner />

      {/* AI Insights */}
      {widgets.aiInsights && (
        <DashboardAIInsights boardId={selectedBoardId} />
      )}

      {/* Productivity + Demands Section (2 cols on lg) */}
      {(widgets.productivitySection || widgets.demandsSection) && selectedTeamId && demands && (
        <div className="grid gap-4 lg:grid-cols-2 items-stretch">
          {widgets.productivitySection && (
            <ProductivitySection demands={demands} boardId={selectedBoardId} />
          )}
          {widgets.demandsSection && (
            <DemandsSectionCard demands={demands} />
          )}
        </div>
      )}

      {/* Member Analysis + Recent Activities (2 cols on lg) */}
      {(widgets.memberAnalysis || widgets.recentActivities) && selectedTeamId && (
        <div className="grid gap-4 lg:grid-cols-2 items-stretch">
          {widgets.memberAnalysis && demands && demands.length > 0 && (
            <MemberAnalysisSection demands={demands} />
          )}
          {widgets.recentActivities && <RecentActivities />}
        </div>
      )}

    </div>
  );
};

export default Index;
