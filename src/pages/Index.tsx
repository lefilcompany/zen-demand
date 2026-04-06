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
import { RequesterRequestsCarousel } from "@/components/RequesterRequestsCarousel";

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div data-tour="dashboard-title">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "MMMM yyyy", { locale: getLocale() })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DashboardCustomizer widgets={widgets} onChange={setWidgets} isSaving={isSaving} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>

        {/* Banner */}
        <DashboardBanner />

        {/* AI Insights */}
        {widgets.aiInsights && (
          <DashboardAIInsights boardId={selectedBoardId} />
        )}

        {/* Demands Section - service pie + cumulative area chart */}
        {widgets.demandsSection && (() => {
          const reqDemands = (demandData?.demands || demands || []).map((d: any) => ({
            id: d.id,
            created_at: d.created_at,
            delivered_at: d.delivered_at || null,
            demand_statuses: d.demand_statuses || null,
            services: d.services || null,
            service_id: d.service_id || null,
          }));
          return reqDemands.length > 0 ? <DemandsSectionCard demands={reqDemands} /> : null;
        })()}

        {/* Requests History Carousel */}
        <RequesterRequestsCarousel />

        {/* Member Analysis + Recent Activities */}
        {(widgets.memberAnalysis || widgets.recentActivities) && selectedTeamId && (
          <div className="grid gap-4 lg:grid-cols-2 items-stretch">
            {widgets.memberAnalysis && demands && demands.length > 0 && (
              <MemberAnalysisSection demands={demands} />
            )}
            {widgets.recentActivities && <RecentActivities />}
          </div>
        )}

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
