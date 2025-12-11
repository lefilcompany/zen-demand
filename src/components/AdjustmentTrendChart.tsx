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
        .eq("demands.team_id", teamId);

      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });

  const { totalAdjustments, chartData } = useMemo(() => {
    if (!adjustments) return { totalAdjustments: 0, chartData: [] };

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
        ajustes: dayAdjustments.length,
      };
    });

    return {
      totalAdjustments: adjustments.length,
      chartData: data,
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
            <CardDescription>Solicitações de ajuste nos últimos 30 dias</CardDescription>
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
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
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
              formatter={(value: number) => [value, "Ajustes"]}
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
      </CardContent>
    </Card>
  );
}
