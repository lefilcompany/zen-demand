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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Painel</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            Nova Demanda
          </Button>
        </div>
      </div>

      {/* Scope Progress */}
      <Card>
        <CardContent className="pt-6">
          <ScopeProgressBar 
            used={monthlyCount || 0} 
            limit={limit}
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {periodLabels[period]}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{demandData?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              demandas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entregues
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{deliveredCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              em execução
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Iniciar
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              aguardando
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Recent Demands */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entregas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryStatusChart data={demandData?.byStatus || []} />
          </CardContent>
        </Card>

        {/* Recent Demands */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Últimas Demandas</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={() => navigate("/demands")}
            >
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demandData?.demands.slice(0, 5).map((demand: any) => (
                <div 
                  key={demand.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => navigate(`/demands/${demand.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{demand.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(demand.created_at), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <Badge
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
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma demanda encontrada</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
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
          <CardHeader>
            <CardTitle className="text-lg">Escopo do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{scope.scope_description}</p>
            {(scope.contract_start_date || scope.contract_end_date) && (
              <div className="flex gap-4 text-sm">
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
