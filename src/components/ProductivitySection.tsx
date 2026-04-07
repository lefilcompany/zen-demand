import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Timer } from "lucide-react";
import { ChartPeriodSelector, type ChartPeriodType, getChartPeriodRange } from "@/components/ChartPeriodSelector";
import { useState, useMemo } from "react";
import { differenceInHours } from "date-fns";
import { useBoardTimeEntries } from "@/hooks/useBoardTimeEntries";

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

function ProgressBarWithMarker({ value, markerPercent }: { value: number; markerPercent: number }) {
  return (
    <div className="relative w-full">
      <Progress value={value} className="h-3 sm:h-3.5 md:h-4 rounded-full bg-muted" indicatorClassName="bg-orange-400 rounded-full" />
      <div
        className="absolute top-0 h-full w-0.5 bg-foreground/70 z-10"
        style={{ left: `${Math.min(100, Math.max(0, markerPercent))}%` }}
      />
    </div>
  );
}

function filterByPeriod<T>(items: T[], period: ChartPeriodType, getDate: (item: T) => string): T[] {
  const { start } = getChartPeriodRange(period);
  if (!start) return items;
  return items.filter(item => new Date(getDate(item)) >= start);
}

export function ProductivitySection({ demands, boardId }: ProductivitySectionProps) {
  const [periodLeft, setPeriodLeft] = useState<ChartPeriodType>("month");
  const [periodRight, setPeriodRight] = useState<ChartPeriodType>("month");
  const { data: allEntries } = useBoardTimeEntries(boardId);

  const { avgDays } = useMemo(() => {
    const filtered = filterByPeriod(demands, periodLeft, d => d.created_at);
    const completedDemands = filtered.filter(d => d.demand_statuses?.name === "Entregue");
    if (completedDemands.length === 0) return { avgDays: 0 };

    const totalHours = completedDemands.reduce((acc, d) => {
      const created = new Date(d.created_at);
      const completed = new Date(d.delivered_at || d.updated_at);
      return acc + differenceInHours(completed, created);
    }, 0);

    return { avgDays: Math.round((totalHours / completedDemands.length / 24) * 10) / 10 };
  }, [demands, periodLeft]);

  const { totalActiveHours, avgActiveHoursPerUser } = useMemo(() => {
    if (!allEntries || allEntries.length === 0) return { totalActiveHours: 0, avgActiveHoursPerUser: 0 };
    const filtered = filterByPeriod(allEntries, periodRight, e => e.started_at);
    
    let totalSecs = 0;
    const uniqueUsers = new Set<string>();
    for (const entry of filtered) {
      totalSecs += entry.duration_seconds || 0;
      uniqueUsers.add(entry.user_id);
    }
    const hours = Math.round((totalSecs / 3600) * 10) / 10;
    const avgPerUser = uniqueUsers.size > 0 ? Math.round((totalSecs / uniqueUsers.size / 3600) * 10) / 10 : 0;
    return { totalActiveHours: hours, avgActiveHoursPerUser: avgPerUser };
  }, [allEntries, periodRight]);

  const completionProgress = Math.min(100, (avgDays / 9) * 100);
  const activeProgress = Math.min(100, (totalActiveHours / 15) * 100);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 p-3 sm:p-4 md:p-6 md:pb-2">
        <CardTitle className="text-xs sm:text-sm md:text-base font-bold tracking-wider uppercase text-foreground text-center">
          Produtividade
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2.5 sm:p-3 md:p-6 pt-1 sm:pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
          {/* Tempo médio de conclusão */}
          <div className="p-2.5 sm:p-3 md:p-4 rounded-xl border border-border/50 bg-card space-y-2 sm:space-y-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-orange-500 shrink-0" />
              <span className="text-[11px] sm:text-xs md:text-sm font-semibold text-foreground leading-tight">
                Tempo médio de conclusão
              </span>
            </div>

            <div className="flex items-baseline w-full">
              <div className="inline-flex items-baseline gap-1 bg-muted/60 border border-border rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 w-full justify-center">
                <span className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{avgDays > 0 ? fmt(avgDays) : "-"}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">dias</span>
              </div>
            </div>

            <ProgressBarWithMarker value={completionProgress} markerPercent={completionProgress} />

            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted-foreground">
              <span>1- dias</span>
              <span>9+ dias</span>
            </div>

            <div className="flex justify-center">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 text-[9px] sm:text-[10px] md:text-xs font-medium px-2 sm:px-2.5 py-0.5 whitespace-nowrap">
                Média esperada: {avgDays > 0 ? fmt(avgDays) : "0,0"} dias
              </Badge>
            </div>

            <ChartPeriodSelector value={periodLeft} onChange={setPeriodLeft} className="justify-center" compact />
          </div>

          {/* Tempo em atividade */}
          <div className="p-2.5 sm:p-3 md:p-4 rounded-xl border border-border/50 bg-card space-y-2 sm:space-y-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-orange-500 shrink-0" />
              <span className="text-[11px] sm:text-xs md:text-sm font-semibold text-foreground leading-tight">
                Tempo em atividade
              </span>
            </div>

            <div className="flex items-baseline w-full">
              <div className="inline-flex items-baseline gap-1 bg-muted/60 border border-border rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 w-full justify-center">
                <span className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{totalActiveHours > 0 ? fmt(totalActiveHours) : "-"}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">horas</span>
              </div>
            </div>

            <ProgressBarWithMarker value={activeProgress} markerPercent={activeProgress} />

            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted-foreground">
              <span>1- horas</span>
              <span>15+ horas</span>
            </div>

            <div className="flex justify-center">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 text-[9px] sm:text-[10px] md:text-xs font-medium px-2 sm:px-2.5 py-0.5 whitespace-nowrap">
                Média esperada: {avgActiveHoursPerUser > 0 ? fmt(avgActiveHoursPerUser) : "0,0"} h/membro
              </Badge>
            </div>

            <ChartPeriodSelector value={periodRight} onChange={setPeriodRight} className="justify-center" compact />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
