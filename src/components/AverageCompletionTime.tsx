import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { differenceInHours } from "date-fns";

interface Demand {
  created_at: string;
  demand_statuses?: {
    name: string;
  } | null;
  updated_at: string;
}

interface AverageCompletionTimeProps {
  demands: Demand[];
}

export function AverageCompletionTime({ demands }: AverageCompletionTimeProps) {
  // Filter completed demands
  const completedDemands = demands.filter(
    d => d.demand_statuses?.name === "Entregue"
  );

  // Calculate average completion time
  const calculateAverageTime = () => {
    if (completedDemands.length === 0) return null;

    const totalHours = completedDemands.reduce((acc, demand) => {
      const createdAt = new Date(demand.created_at);
      const completedAt = new Date(demand.updated_at);
      return acc + differenceInHours(completedAt, createdAt);
    }, 0);

    return totalHours / completedDemands.length;
  };

  const avgHours = calculateAverageTime();

  const formatTime = (hours: number | null) => {
    if (hours === null) return { value: "-", unit: "" };
    
    if (hours < 24) {
      return { value: Math.round(hours), unit: "horas" };
    }
    
    const days = hours / 24;
    if (days < 7) {
      return { value: Math.round(days * 10) / 10, unit: "dias" };
    }
    
    const weeks = days / 7;
    return { value: Math.round(weeks * 10) / 10, unit: "semanas" };
  };

  const { value, unit } = formatTime(avgHours);

  // Calculate trend (compare last 10 vs previous 10)
  const calculateTrend = () => {
    if (completedDemands.length < 4) return null;

    const sorted = [...completedDemands].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    const halfPoint = Math.floor(sorted.length / 2);
    const recent = sorted.slice(0, halfPoint);
    const older = sorted.slice(halfPoint);

    const recentAvg = recent.reduce((acc, d) => 
      acc + differenceInHours(new Date(d.updated_at), new Date(d.created_at)), 0
    ) / recent.length;

    const olderAvg = older.reduce((acc, d) => 
      acc + differenceInHours(new Date(d.updated_at), new Date(d.created_at)), 0
    ) / older.length;

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    return {
      direction: percentChange < -5 ? "down" : percentChange > 5 ? "up" : "stable",
      percent: Math.abs(Math.round(percentChange))
    };
  };

  const trend = calculateTrend();
  const hasData = completedDemands.length > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Tempo Médio de Conclusão
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Tempo médio entre criação e entrega das demandas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-end gap-2">
            <span className="text-3xl md:text-4xl font-bold text-foreground">
              {value}
            </span>
            <span className="text-lg text-muted-foreground mb-1">{unit}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {hasData ? `Baseado em ${completedDemands.length} demanda${completedDemands.length > 1 ? 's' : ''} concluída${completedDemands.length > 1 ? 's' : ''}` : "Nenhuma demanda concluída ainda"}
          </p>
        </div>
        
        {trend && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Tendência vs. período anterior:</p>
            <div className="flex items-center gap-2">
              {trend.direction === "down" ? (
                <div className="flex items-center gap-1.5 text-green-600 bg-green-500/10 px-2 py-1 rounded-md">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium">{trend.percent}% mais rápido</span>
                </div>
              ) : trend.direction === "up" ? (
                <div className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-2 py-1 rounded-md">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">{trend.percent}% mais lento</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <Minus className="h-4 w-4" />
                  <span className="text-sm">Estável</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!trend && hasData && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Mais demandas são necessárias para calcular a tendência
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
