import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Timer, Activity, Settings2 } from "lucide-react";
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

function ProgressBarWithMarker({ value, markerPercent, className }: { value: number; markerPercent: number; className?: string }) {
  return (
    <div className={`relative w-full ${className || ""}`}>
      <Progress value={value} className="h-4 rounded-full bg-muted" indicatorClassName="bg-orange-400 rounded-full" />
      {/* Vertical marker line */}
      <div
        className="absolute top-0 h-full w-0.5 bg-foreground/70 z-10"
        style={{ left: `${Math.min(100, Math.max(0, markerPercent))}%` }}
      />
    </div>
  );
}

export function ProductivitySection({ demands, boardId }: ProductivitySectionProps) {
  const [periodLeft, setPeriodLeft] = useState<ChartPeriodType>("month");
  const [periodRight, setPeriodRight] = useState<ChartPeriodType>("month");
  const { stats } = useBoardTimeStats(boardId);

  const { avgDays, completedCount } = useMemo(() => {
    const completedDemands = demands.filter(d => d.demand_statuses?.name === "Entregue");

    if (completedDemands.length === 0) {
      return { avgDays: 0, completedCount: 0 };
    }

    const totalHours = completedDemands.reduce((acc, d) => {
      const created = new Date(d.created_at);
      const completed = new Date(d.delivered_at || d.updated_at);
      return acc + differenceInHours(completed, created);
    }, 0);

    const avgHours = totalHours / completedDemands.length;
    const avgDays = Math.round((avgHours / 24) * 10) / 10;

    return { avgDays, completedCount: completedDemands.length };
  }, [demands]);

  // Progress: 0 days = 0%, 9+ days = 100%
  const completionProgress = Math.min(100, (avgDays / 9) * 100);
  // Marker at average position
  const completionMarker = completionProgress;

  // Active hours from time stats
  const totalActiveHours = Math.round((stats.totalTimeSeconds / 3600) * 10) / 10;
  // Progress: 0h = 0%, 15+h = 100%
  const activeProgress = Math.min(100, (totalActiveHours / 15) * 100);
  const activeMarker = activeProgress;

  // Format with comma for pt-BR
  const formatNum = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 p-4 md:p-6 md:pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base font-bold tracking-wider uppercase text-foreground flex items-center justify-center w-full">
            Produtividade
          </CardTitle>
          <Settings2 className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 md:p-6 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tempo médio de conclusão */}
          <div className="p-4 md:p-5 rounded-xl border border-border/50 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500 shrink-0" />
              <span className="text-sm md:text-base font-semibold text-foreground">Tempo médio de conclusão</span>
            </div>

            <div className="flex items-center justify-center">
              <div className="inline-flex items-baseline gap-1.5 bg-muted/60 border border-border rounded-lg px-4 py-2">
                <span className="text-2xl md:text-3xl font-bold text-foreground">{avgDays > 0 ? formatNum(avgDays) : "-"}</span>
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            </div>

            <ProgressBarWithMarker value={completionProgress} markerPercent={completionMarker} />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1- dias</span>
              <span>9+ dias</span>
            </div>

            <div className="flex justify-center">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 text-xs font-medium px-3 py-1">
                Média esperada: {avgDays > 0 ? formatNum(avgDays) : "0,0"} dias
              </Badge>
            </div>

            <ChartPeriodSelector value={periodLeft} onChange={setPeriodLeft} className="justify-center" />
          </div>

          {/* Tempo em atividade */}
          <div className="p-4 md:p-5 rounded-xl border border-border/50 bg-card space-y-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-500 shrink-0" />
              <span className="text-sm md:text-base font-semibold text-foreground">Tempo em atividade</span>
            </div>

            <div className="flex items-center justify-center">
              <div className="inline-flex items-baseline gap-1.5 bg-muted/60 border border-border rounded-lg px-4 py-2">
                <span className="text-2xl md:text-3xl font-bold text-foreground">{totalActiveHours > 0 ? formatNum(totalActiveHours) : "-"}</span>
                <span className="text-sm text-muted-foreground">horas</span>
              </div>
            </div>

            <ProgressBarWithMarker value={activeProgress} markerPercent={activeMarker} />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>1- horas</span>
              <span>15+ horas</span>
            </div>

            <div className="flex justify-center">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 text-xs font-medium px-3 py-1">
                Média esperada: {totalActiveHours > 0 ? formatNum(totalActiveHours) : "0,0"} horas
              </Badge>
            </div>

            <ChartPeriodSelector value={periodRight} onChange={setPeriodRight} className="justify-center" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
