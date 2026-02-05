import { Timer, Users, TrendingUp, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  avgTimePerUser,
  avgTimePerDemand,
  isLoading,
}: StatsOverviewCardsProps) {
  const statsCards = [
    {
      icon: Timer,
      label: "Tempo Total",
      value: liveTimeDisplay || formatTimeDisplay(totalTimeSeconds) || "00:00:00:00",
      isTime: true,
      isActive: activeTimersCount > 0,
      color: "primary",
    },
    {
      icon: Users,
      label: "Usuários Ativos",
      value: totalMembers.toString(),
      isTime: false,
      isActive: false,
      color: "blue",
    },
    {
      icon: TrendingUp,
      label: "Média/Usuário",
      value: formatTimeDisplay(avgTimePerUser) || "00:00:00:00",
      isTime: true,
      isActive: false,
      color: "violet",
    },
    {
      icon: Target,
      label: "Média/Demanda",
      value: formatTimeDisplay(avgTimePerDemand) || "00:00:00:00",
      isTime: true,
      isActive: false,
      color: "amber",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat) => (
        <Card key={stat.label} className="border bg-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <stat.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{stat.label}</span>
              {stat.isActive && (
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse ml-auto" />
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className={cn(
                "text-2xl md:text-3xl font-bold",
                stat.isTime && "font-mono tabular-nums",
                stat.isActive && "text-primary"
              )}>
                {stat.value}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
