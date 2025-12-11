import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScopeProgressBar } from "@/components/ScopeProgressBar";
import { DeliveryStatusChart } from "@/components/DeliveryStatusChart";
import { PeriodFilter, type PeriodType } from "@/components/PeriodFilter";
import { ExportReportButton } from "@/components/ExportReportButton";
import { useTeamScope, useMonthlyDemandCount } from "@/hooks/useTeamScope";
import { useDemandsByPeriod } from "@/hooks/useDemandsByPeriod";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useTeams } from "@/hooks/useTeams";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  PlusCircle,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const periodLabels: Record<PeriodType, string> = {
  week: "Esta Semana",
  month: "Este Mês",
  quarter: "Este Trimestre"
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodType>("month");
  const { selectedTeamId } = useSelectedTeam();
  const { data: teams } = useTeams();
  const { data: scope, isLoading: scopeLoading } = useTeamScope();
  const { data: monthlyCount, isLoading: countLoading } = useMonthlyDemandCount();
  const { data: demandData, isLoading: demandsLoading } = useDemandsByPeriod(period);

  const isLoading = scopeLoading || countLoading || demandsLoading;
  const currentTeam = teams?.find(t => t.id === selectedTeamId);

  // Count demands by status name
  const deliveredCount = demandData?.byStatus.find(s => 
    s.name.toLowerCase().includes("entreg") || s.name.toLowerCase().includes("conclu")
  )?.count || 0;

  const inProgressCount = demandData?.byStatus.find(s => 
    s.name.toLowerCase().includes("fazendo") || s.name.toLowerCase().includes("andamento")
  )?.count || 0;

  const pendingCount = demandData?.byStatus.find(s => 
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

  if (isLoading) {
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Meu Painel</h1>
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
              inProgress: inProgressCount,
              pending: pendingCount
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
            <div className="text-2xl md:text-3xl font-bold text-primary">{inProgressCount}</div>
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
            <div className="text-2xl md:text-3xl font-bold">{pendingCount}</div>
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
