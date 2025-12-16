import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { differenceInHours } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useMemo } from "react";

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

  // Prepare chart data - last 10 completed demands sorted by completion date
  const chartData = useMemo(() => {
    if (completedDemands.length === 0) return [];

    const sorted = [...completedDemands]
      .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
      .slice(-10);

    return sorted.map((demand, index) => {
      const hours = differenceInHours(new Date(demand.updated_at), new Date(demand.created_at));
      const days = Math.round((hours / 24) * 10) / 10;
      return {
        index: index + 1,
        dias: days,
        horas: hours
      };
    });
  }, [completedDemands]);

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
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-end gap-2">
            <span className="text-3xl md:text-4xl font-bold text-foreground">
              {value}
            </span>
            <span className="text-lg text-muted-foreground mb-1">{unit}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {hasData ? `${completedDemands.length} demanda${completedDemands.length > 1 ? 's' : ''} concluída${completedDemands.length > 1 ? 's' : ''}` : "Nenhuma demanda concluída"}
          </p>
        </div>
        
        {chartData.length > 1 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              Evolução das últimas {chartData.length} entregas (dias)
            </p>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="index" hide />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-md px-2 py-1 shadow-md">
                            <p className="text-xs font-medium">{data.dias} dias</p>
                            <p className="text-xs text-muted-foreground">{data.horas}h</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="dias"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDias)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Mais antiga</span>
              <span>Mais recente</span>
            </div>
          </div>
        )}

        {!hasData && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground text-center py-4">
              Aguardando demandas concluídas para exibir o gráfico
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
