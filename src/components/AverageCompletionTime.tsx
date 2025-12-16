import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2 } from "lucide-react";
import { differenceInHours } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, ReferenceLine } from "recharts";
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
  const completedDemands = demands.filter(
    d => d.demand_statuses?.name === "Entregue"
  );

  const stats = useMemo(() => {
    if (completedDemands.length === 0) return null;

    const times = completedDemands.map(demand => {
      const createdAt = new Date(demand.created_at);
      const completedAt = new Date(demand.updated_at);
      return differenceInHours(completedAt, createdAt);
    });

    const totalHours = times.reduce((acc, h) => acc + h, 0);
    const avgHours = totalHours / times.length;
    const minHours = Math.min(...times);
    const maxHours = Math.max(...times);

    return { avgHours, minHours, maxHours };
  }, [completedDemands]);

  const formatTime = (hours: number) => {
    if (hours < 24) {
      return { value: Math.round(hours), unit: "h" };
    }
    const days = hours / 24;
    return { value: Math.round(days * 10) / 10, unit: "d" };
  };

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

  const avgDays = stats ? Math.round((stats.avgHours / 24) * 10) / 10 : 0;
  const hasData = completedDemands.length > 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Tempo Médio de Conclusão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData && stats ? (
          <>
            {/* Main metric */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {formatTime(stats.avgHours).value}
                  </span>
                  <span className="text-xl text-muted-foreground">
                    {formatTime(stats.avgHours).unit === "h" ? "horas" : "dias"}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>{completedDemands.length} demanda{completedDemands.length > 1 ? 's' : ''} concluída{completedDemands.length > 1 ? 's' : ''}</span>
                </div>
              </div>
              
              {/* Min/Max stats */}
              <div className="flex flex-col gap-1 text-right">
                <div className="text-xs">
                  <span className="text-muted-foreground">Mais rápido: </span>
                  <span className="font-medium text-green-600">
                    {formatTime(stats.minHours).value}{formatTime(stats.minHours).unit}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Mais lento: </span>
                  <span className="font-medium text-amber-600">
                    {formatTime(stats.maxHours).value}{formatTime(stats.maxHours).unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 1 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  Últimas {chartData.length} entregas (dias)
                </p>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDiasAvg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="index" hide />
                      <ReferenceLine 
                        y={avgDays} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="4 4" 
                        strokeOpacity={0.5}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-sm font-semibold">{data.dias} dias</p>
                                <p className="text-xs text-muted-foreground">{data.horas} horas</p>
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
                        fill="url(#colorDiasAvg)"
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                        activeDot={{ fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))", r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                  <span>Antiga</span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-px bg-muted-foreground/50" style={{ borderTop: '1px dashed' }} />
                    Média
                  </span>
                  <span>Recente</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma demanda concluída ainda
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              As estatísticas aparecerão aqui após a primeira entrega
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
