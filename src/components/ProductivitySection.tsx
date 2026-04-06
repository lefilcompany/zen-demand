import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, Minus, Timer, Activity } from "lucide-react";
import { ChartPeriodSelector, type ChartPeriodType } from "@/components/ChartPeriodSelector";
import { useState, useMemo } from "react";
import { differenceInHours } from "date-fns";
import { useBoardTimeStats } from "@/hooks/useBoardTimeStats";

interface Demand {
  created_at: string;
  demand_statuses?: { name: string } | null;
  updated_at: string;
  delivered_at?: string | null;
}

interface ProductivitySectionProps {
  demands: Demand[];
  boardId: string | null;
}

export function ProductivitySection({ demands, boardId }: ProductivitySectionProps) {
  const [period, setPeriod] = useState<ChartPeriodType>("month");
  const { stats } = useBoardTimeStats(boardId);

  const { avgDays, trend, completedCount } = useMemo(() => {
    const completedDemands = demands.filter(d => d.demand_statuses?.name === "Entregue");

    if (completedDemands.length === 0) {
      return { avgDays: 0, trend: null, completedCount: 0 };
    }

    const totalHours = completedDemands.reduce((acc, d) => {
      const created = new Date(d.created_at);
      const completed = new Date(d.delivered_at || d.updated_at);
      return acc + differenceInHours(completed, created);
    }, 0);

    const avgHours = totalHours / completedDemands.length;
    const avgDays = Math.round((avgHours / 24) * 10) / 10;

    // Trend calculation
    let trend: { direction: string; percent: number } | null = null;
    if (completedDemands.length >= 4) {
      const sorted = [...completedDemands].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      const half = Math.floor(sorted.length / 2);
      const recentAvg = sorted.slice(0, half).reduce(
        (acc, d) => acc + differenceInHours(new Date(d.delivered_at || d.updated_at), new Date(d.created_at)), 0
      ) / half;
      const olderAvg = sorted.slice(half).reduce(
        (acc, d) => acc + differenceInHours(new Date(d.delivered_at || d.updated_at), new Date(d.created_at)), 0
      ) / (sorted.length - half);
      const pct = ((recentAvg - olderAvg) / olderAvg) * 100;
      trend = { direction: pct < -5 ? "down" : pct > 5 ? "up" : "stable", percent: Math.abs(Math.round(pct)) };
    }

    return { avgDays, trend, completedCount: completedDemands.length };
  }, [demands]);

  // Map avg days to progress (0-100), scale: 0 days = 100%, 9+ days = 10%
  const completionProgress = Math.max(10, Math.min(100, 100 - (avgDays / 9) * 90));

  // Active hours from time stats
  const totalActiveHours = Math.round((stats.totalTimeSeconds / 3600) * 10) / 10;
  // Map hours to progress, scale: 0h = 0%, 15+h = 100%
  const activeProgress = Math.min(100, (totalActiveHours / 15) * 100);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 p-4 md:p-6 md:pb-2">
        <CardTitle className="text-sm md:text-base font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Produtividade
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 md:p-6 pt-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {/* Tempo médio de conclusão */}
          <div className="p-3 md:p-4 rounded-xl border border-border/50 bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs md:text-sm font-medium text-foreground">Tempo Médio de Conclusão</span>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="text-2xl md:text-3xl font-bold text-foreground">{avgDays || "-"}</span>
              <span className="text-sm text-muted-foreground mb-0.5">dias</span>
            </div>
            <Progress value={completionProgress} className="h-2" indicatorClassName="bg-primary" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>1- dias</span>
              <span>9+ dias</span>
            </div>
            <div className="flex items-center gap-1.5">
              {trend ? (
                trend.direction === "down" ? (
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <TrendingDown className="h-3 w-3" />
                    <span className="text-[10px] md:text-xs font-medium">{trend.percent}% mais rápido</span>
                  </div>
                ) : trend.direction === "up" ? (
                  <div className="flex items-center gap-1 text-red-500">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-[10px] md:text-xs font-medium">{trend.percent}% mais lento</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Minus className="h-3 w-3" />
                    <span className="text-[10px] md:text-xs">Estável</span>
                  </div>
                )
              ) : (
                <Badge variant="outline" className="text-[10px] h-5">
                  {completedCount > 0 ? `${completedCount} concluídas` : "Sem dados"}
                </Badge>
              )}
            </div>
          </div>

          {/* Tempo em atividade */}
          <div className="p-3 md:p-4 rounded-xl border border-border/50 bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs md:text-sm font-medium text-foreground">Tempo em Atividade</span>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="text-2xl md:text-3xl font-bold text-foreground">{totalActiveHours || "-"}</span>
              <span className="text-sm text-muted-foreground mb-0.5">horas</span>
            </div>
            <Progress value={activeProgress} className="h-2" indicatorClassName="bg-primary" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>1- horas</span>
              <span>15+ horas</span>
            </div>
            <div className="flex items-center gap-1.5">
              {stats.activeTimersCount > 0 ? (
                <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  {stats.activeTimersCount} timer{stats.activeTimersCount > 1 ? "s" : ""} ativo{stats.activeTimersCount > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5">
                  {stats.totalEntries} registros
                </Badge>
              )}
            </div>
          </div>
        </div>

        <ChartPeriodSelector value={period} onChange={setPeriod} className="justify-center" />
      </CardContent>
    </Card>
  );
}
