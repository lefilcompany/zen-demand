import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Timer, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { differenceInHours } from "date-fns";
import { useBoardTimeEntries } from "@/hooks/useBoardTimeEntries";

interface Demand {
  created_at: string;
  demand_statuses?: { name: string } | null;
  updated_at: string;
  delivered_at?: string | null;
  priority?: string | null;
  service_id?: string | null;
  services?: { estimated_hours: number } | null;
}

interface ProductivitySectionProps {
  demands: Demand[];
  boardId: string | null;
}

function getHealthStatus(value: number, benchmark: number, lowerIsBetter: boolean) {
  if (benchmark === 0) return { color: "text-muted-foreground", bgClass: "bg-muted", label: "Sem dados" };

  const deviation = Math.abs(value - benchmark) / benchmark;

  // Determine if the value is "good" or "bad"
  const isGood = lowerIsBetter ? value <= benchmark : value >= benchmark;

  if (deviation <= 0.2) {
    return { color: "text-emerald-600", bgClass: "bg-emerald-500", label: "Na média" };
  }
  if (deviation <= 0.5) {
    return {
      color: isGood ? "text-emerald-600" : "text-yellow-600",
      bgClass: isGood ? "bg-emerald-500" : "bg-yellow-500",
      label: isGood ? (lowerIsBetter ? "Abaixo da média" : "Acima da média") : (lowerIsBetter ? "Acima da média" : "Abaixo da média"),
    };
  }
  return {
    color: isGood ? "text-emerald-600" : "text-red-600",
    bgClass: isGood ? "bg-emerald-500" : "bg-red-500",
    label: isGood ? (lowerIsBetter ? "Muito abaixo" : "Muito acima") : (lowerIsBetter ? "Muito acima" : "Muito abaixo"),
  };
}

function CompletionProgressBar({ avgDays, expectedAvgDays, maxDays }: { avgDays: number; expectedAvgDays: number | null; maxDays: number }) {
  const fillPercent = maxDays > 0 ? Math.min(100, Math.max(0, (avgDays / maxDays) * 100)) : 0;
  const markerPercent = expectedAvgDays !== null && maxDays > 0 ? Math.min(100, Math.max(0, (expectedAvgDays / maxDays) * 100)) : null;

  return (
    <div className="relative w-full">
      {/* Expected avg label above bar */}
      {markerPercent !== null && expectedAvgDays !== null && (
        <div className="relative h-5 mb-1">
          <div
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${markerPercent}%` }}
          >
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-800 dark:text-white whitespace-nowrap bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
              {expectedAvgDays.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dias
            </span>
          </div>
        </div>
      )}
      {/* Progress bar */}
      <div className="relative h-3 sm:h-3.5 md:h-4 rounded-full bg-muted overflow-visible">
        <div
          className="absolute inset-y-0 left-0 bg-orange-400 rounded-full transition-all duration-500"
          style={{ width: `${fillPercent}%` }}
        />
        {/* Expected avg vertical marker */}
        {markerPercent !== null && (
          <div
            className="absolute top-[-4px] bottom-[-4px] w-[3px] rounded-full bg-slate-800 dark:bg-white z-10 shadow-md"
            style={{ left: `${markerPercent}%`, transform: 'translateX(-50%)' }}
          />
        )}
      </div>
    </div>
  );
}

function HealthIndicatorBar({ bgClass }: { bgClass: string }) {
  return (
    <div className={`w-full h-1 sm:h-1.5 rounded-full ${bgClass} transition-colors duration-300`} />
  );
}

function ActivityProgressBar({ value, benchmark }: { value: number; benchmark: number }) {
  const maxScale = benchmark * 2;
  const fillPercent = maxScale > 0 ? Math.min(100, Math.max(0, (value / maxScale) * 100)) : 0;
  const benchmarkPos = maxScale > 0 ? (benchmark / maxScale) * 100 : 50;

  return (
    <div className="relative w-full">
      <div className="relative h-3 sm:h-3.5 md:h-4 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-orange-400 rounded-full transition-all duration-500"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <div className="absolute top-0 h-full w-0.5 bg-destructive z-10" style={{ left: `${benchmarkPos}%` }} />
    </div>
  );
}

export function ProductivitySection({ demands, boardId }: ProductivitySectionProps) {
  const { data: allEntries } = useBoardTimeEntries(boardId);

  const priorityWeights: Record<string, number> = { alta: 3, média: 2, baixa: 1 };

  const { avgDays, completionBenchmark, expectedAvgDays, maxDays } = useMemo(() => {
    const completedDemands = demands.filter(d => d.demand_statuses?.name === "Entregue");
    if (completedDemands.length === 0) return { avgDays: 0, completionBenchmark: 5, expectedAvgDays: null as number | null, maxDays: 9 };

    const daysList = completedDemands.map(d => {
      const created = new Date(d.created_at);
      const completed = new Date(d.delivered_at || d.updated_at);
      return differenceInHours(completed, created) / 24;
    }).sort((a, b) => a - b);

    const avg = Math.round((daysList.reduce((a, b) => a + b, 0) / daysList.length) * 10) / 10;

    const mid = Math.floor(daysList.length / 2);
    const median = daysList.length % 2 !== 0
      ? daysList[mid]
      : (daysList[mid - 1] + daysList[mid]) / 2;
    const benchmark = Math.round(median * 10) / 10 || 5;

    // Expected avg: weighted average of estimated_hours by priority, converted to business days (/8)
    const demandsWithService = demands.filter(d => d.services?.estimated_hours && d.services.estimated_hours > 0);
    let expectedAvg: number | null = null;
    if (demandsWithService.length > 0) {
      let totalWeightedHours = 0;
      let totalWeight = 0;
      for (const d of demandsWithService) {
        const weight = priorityWeights[d.priority || "baixa"] || 1;
        totalWeightedHours += (d.services!.estimated_hours) * weight;
        totalWeight += weight;
      }
      expectedAvg = totalWeight > 0 ? Math.round((totalWeightedHours / totalWeight / 8) * 10) / 10 : null;
    }

    const scale = Math.floor(avg) + 4;

    return { avgDays: avg, completionBenchmark: benchmark, expectedAvgDays: expectedAvg, maxDays: Math.max(scale, 5) };
  }, [demands]);

  const { totalActiveHours, avgActiveHoursPerUser, activityBenchmark } = useMemo(() => {
    if (!allEntries || allEntries.length === 0) return { totalActiveHours: 0, avgActiveHoursPerUser: 0, activityBenchmark: 8 };

    let totalSecs = 0;
    const uniqueUsers = new Set<string>();
    for (const entry of allEntries) {
      totalSecs += entry.duration_seconds || 0;
      uniqueUsers.add(entry.user_id);
    }
    const hours = Math.round((totalSecs / 3600) * 10) / 10;
    const avgPerUser = uniqueUsers.size > 0 ? Math.round((totalSecs / uniqueUsers.size / 3600) * 10) / 10 : 0;

    return { totalActiveHours: hours, avgActiveHoursPerUser: avgPerUser, activityBenchmark: avgPerUser || 8 };
  }, [allEntries]);

  const completionHealth = getHealthStatus(avgDays, completionBenchmark, true);
  const activityHealth = getHealthStatus(avgActiveHoursPerUser, activityBenchmark, false);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 p-3 sm:p-4 md:p-6 md:pb-2">
        <CardTitle className="text-xs sm:text-sm md:text-base font-bold tracking-wider uppercase text-foreground text-center flex items-center justify-center gap-2">
          <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-foreground" />
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

            <CompletionProgressBar avgDays={avgDays} expectedAvgDays={expectedAvgDays} maxDays={maxDays} />

            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted-foreground">
              <span>1 dia</span>
              {expectedAvgDays !== null && (
                <span className="font-medium text-foreground/70">esperado</span>
              )}
              <span>{maxDays} dias</span>
            </div>

            <HealthIndicatorBar bgClass={completionHealth.bgClass} />

            <div className="flex justify-center">
              <Badge className={`${completionHealth.bgClass} hover:opacity-90 text-white border-0 text-[9px] sm:text-[10px] md:text-xs font-medium px-2 sm:px-2.5 py-0.5 whitespace-nowrap`}>
                {completionHealth.label} · Ideal: {fmt(completionBenchmark)} dias
              </Badge>
            </div>
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

            <ActivityProgressBar value={avgActiveHoursPerUser} benchmark={activityBenchmark} />

            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted-foreground">
              <span>0 horas</span>
              <span className="font-medium text-foreground/70">ideal</span>
              <span>{fmt(activityBenchmark * 2)} h</span>
            </div>

            <HealthIndicatorBar bgClass={activityHealth.bgClass} />

            <div className="flex justify-center">
              <Badge className={`${activityHealth.bgClass} hover:opacity-90 text-white border-0 text-[9px] sm:text-[10px] md:text-xs font-medium px-2 sm:px-2.5 py-0.5 whitespace-nowrap`}>
                {activityHealth.label} · Ideal: {fmt(activityBenchmark)} h/membro
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
        </div>
      </CardContent>
    </Card>
  );
}
