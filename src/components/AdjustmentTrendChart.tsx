import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AdjustmentTrendChartProps {
  teamId: string;
}

export function AdjustmentTrendChart({ teamId }: AdjustmentTrendChartProps) {
  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30).toISOString(), []);

  const { data: adjustments, isLoading } = useQuery({
    queryKey: ["adjustment-trend", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_interactions")
        .select(`
          id,
          created_at,
          demand_id,
          demands!inner(team_id)
        `)
        .eq("interaction_type", "adjustment_request")
        .eq("demands.team_id", teamId)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { totalAdjustments, chartData, dailyAverage } = useMemo(() => {
    if (!adjustments) return { totalAdjustments: 0, chartData: [], dailyAverage: 0 };

    const today = startOfDay(new Date());
    const startDate = subDays(today, 29);
    const days = eachDayOfInterval({ start: startDate, end: today });

    const data = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayAdjustments = adjustments.filter((a) => {
        const adjustmentDate = format(new Date(a.created_at), "yyyy-MM-dd");
        return adjustmentDate === dayStr;
      });

      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        fullDate: format(day, "dd 'de' MMMM", { locale: ptBR }),
        ajustes: dayAdjustments.length,
      };
    });

    return {
      totalAdjustments: adjustments.length,
      chartData: data,
      dailyAverage: (adjustments.length / 30).toFixed(1),
    };
  }, [adjustments]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-500" />
              Ajustes Solicitados
            </CardTitle>
            <CardDescription>
              Solicitações de ajuste nos últimos 30 dias
              {totalAdjustments > 0 && (
                <span className="ml-2 text-xs">
                  (média: {dailyAverage}/dia)
                </span>
              )}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {totalAdjustments}
            </div>
            <p className="text-xs text-muted-foreground">total de ajustes</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalAdjustments === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <RefreshCw className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhum ajuste solicitado nos últimos 30 dias</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAjustes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return `Data: ${payload[0].payload.fullDate}`;
                  }
                  return "";
                }}
                formatter={(value: number) => [
                  `${value} ${value === 1 ? "solicitação" : "solicitações"}`,
                  "Ajustes"
                ]}
              />
              <Area
                type="monotone"
                dataKey="ajustes"
                stroke="#9333ea"
                strokeWidth={2}
                fill="url(#colorAjustes)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
