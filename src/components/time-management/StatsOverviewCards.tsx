import { Timer, Users, TrendingUp, Target, Flame } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimeDisplay } from "@/hooks/useLiveTimer";
import { cn } from "@/lib/utils";

interface StatsOverviewCardsProps {
  totalTimeSeconds: number;
  liveTimeDisplay: string | null;
  activeTimersCount: number;
  totalMembers: number;
  totalDemands: number;
  totalEntries: number;
  avgTimePerUser: number;
  avgTimePerDemand: number;
  isLoading: boolean;
}

export function StatsOverviewCards({
  totalTimeSeconds,
  liveTimeDisplay,
  activeTimersCount,
  totalMembers,
  totalDemands,
  totalEntries,
  avgTimePerUser,
  avgTimePerDemand,
  isLoading,
}: StatsOverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Time Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2 text-primary font-medium">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Timer className="h-4 w-4 text-primary" />
            </div>
            Tempo Total
            {activeTimersCount > 0 && (
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl md:text-3xl font-bold font-mono tabular-nums",
            activeTimersCount > 0 && "text-emerald-600 dark:text-emerald-400"
          )}>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              liveTimeDisplay || formatTimeDisplay(totalTimeSeconds) || "00:00:00:00"
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalEntries} entrada{totalEntries !== 1 ? 's' : ''} registrada{totalEntries !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Board Members Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-transparent">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            Membros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {isLoading ? <Skeleton className="h-8 w-16" /> : totalMembers}
            </div>
            {activeTimersCount > 0 && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 animate-pulse text-xs">
                <Flame className="h-3 w-3 mr-1" />
                {activeTimersCount} ativo{activeTimersCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalDemands} demanda{totalDemands !== 1 ? 's' : ''} trabalhada{totalDemands !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Average per User Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-violet-500 bg-gradient-to-br from-violet-500/5 to-transparent">
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-medium">
            <div className="p-1.5 rounded-md bg-violet-500/10">
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </div>
            Média/Usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              formatTimeDisplay(avgTimePerUser) || "00:00:00:00"
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tempo médio por colaborador
          </p>
        </CardContent>
      </Card>

      {/* Average per Demand Card */}
      <Card className="relative overflow-hidden border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-500/5 to-transparent">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
            <div className="p-1.5 rounded-md bg-amber-500/10">
              <Target className="h-4 w-4 text-amber-500" />
            </div>
            Média/Demanda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              formatTimeDisplay(avgTimePerDemand) || "00:00:00:00"
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tempo médio por tarefa
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
