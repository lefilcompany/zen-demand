import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo } from "react";
import { format, eachDayOfInterval, startOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
interface AdjustmentTrendChartProps {
  boardId: string;
}
interface AdjustmentData {
  id: string;
  created_at: string;
  metadata: {
    adjustment_type?: string;
  } | null;
  demands: {
    board_id: string;
  } | null;
}
export function AdjustmentTrendChart({
  boardId
}: AdjustmentTrendChartProps) {
  const {
    data: adjustments,
    isLoading
  } = useQuery({
    queryKey: ["adjustment-trend-all", boardId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("demand_interactions").select(`
          id,
          created_at,
          metadata,
          demands!inner(board_id)
        `).eq("interaction_type", "adjustment_request").eq("demands.board_id", boardId).order("created_at", {
        ascending: true
      });
      if (error) throw error;
      return data as AdjustmentData[];
    },
    enabled: !!boardId
  });
  const {
    totalAdjustments,
    internalCount,
    externalCount,
    chartData
  } = useMemo(() => {
    if (!adjustments || adjustments.length === 0) {
      return {
        totalAdjustments: 0,
        internalCount: 0,
        externalCount: 0,
        chartData: []
      };
    }

    // Get date range from first adjustment to today
    const firstDate = startOfDay(parseISO(adjustments[0].created_at));
    const today = startOfDay(new Date());
    const days = eachDayOfInterval({
      start: firstDate,
      end: today
    });

    // Count by type
    let internal = 0;
    let external = 0;
    adjustments.forEach(a => {
      const type = a.metadata?.adjustment_type;
      if (type === 'internal') internal++;else external++; // Default to external if not specified
    });

    // Build chart data with cumulative counts per day
    const data = days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayInternalAdjustments = adjustments.filter(a => {
        const adjustmentDate = format(parseISO(a.created_at), "yyyy-MM-dd");
        const type = a.metadata?.adjustment_type;
        return adjustmentDate === dayStr && type === 'internal';
      }).length;
      const dayExternalAdjustments = adjustments.filter(a => {
        const adjustmentDate = format(parseISO(a.created_at), "yyyy-MM-dd");
        const type = a.metadata?.adjustment_type;
        return adjustmentDate === dayStr && type !== 'internal'; // external or undefined
      }).length;
      return {
        date: format(day, "dd/MM", {
          locale: ptBR
        }),
        fullDate: format(day, "dd 'de' MMMM", {
          locale: ptBR
        }),
        interno: dayInternalAdjustments,
        externo: dayExternalAdjustments,
        total: dayInternalAdjustments + dayExternalAdjustments
      };
    });
    return {
      totalAdjustments: adjustments.length,
      internalCount: internal,
      externalCount: external,
      chartData: data
    };
  }, [adjustments]);
  if (isLoading) {
    return <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>;
  }
  return <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-500" />
              Ajustes Solicitados
            </CardTitle>
            <CardDescription>
              Histórico completo de solicitações de ajuste
            </CardDescription>
          </div>
          <div className="text-right space-y-1">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {totalAdjustments}
            </div>
            
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalAdjustments === 0 ? <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <RefreshCw className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhum ajuste solicitado neste quadro</p>
          </div> : <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{
            fontSize: 10
          }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{
            fontSize: 11
          }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }} labelFormatter={(_, payload) => {
            if (payload && payload[0]) {
              return payload[0].payload.fullDate;
            }
            return "";
          }} formatter={(value: number, name: string) => {
            const label = name === 'interno' ? 'Ajustes Internos' : 'Ajustes Externos';
            return [`${value} ${value === 1 ? 'ajuste' : 'ajustes'}`, label];
          }} />
              <Legend formatter={value => value === 'interno' ? 'Internos' : 'Externos'} iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="interno" stroke="#3b82f6" strokeWidth={2} dot={{
            r: 3,
            fill: "#3b82f6"
          }} activeDot={{
            r: 5
          }} name="interno" />
              <Line type="monotone" dataKey="externo" stroke="#f59e0b" strokeWidth={2} dot={{
            r: 3,
            fill: "#f59e0b"
          }} activeDot={{
            r: 5
          }} name="externo" />
            </LineChart>
          </ResponsiveContainer>}
      </CardContent>
    </Card>;
}