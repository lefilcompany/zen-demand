import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo } from "react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Demand {
  id: string;
  created_at: string;
  demand_statuses?: { name: string } | null;
}

interface DemandTrendChartProps {
  demands: Demand[];
}

export function DemandTrendChart({ demands }: DemandTrendChartProps) {
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const startDate = subDays(today, 29);
    
    const days = eachDayOfInterval({ start: startDate, end: today });
    
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayDemands = demands.filter((d) => {
        const demandDate = format(new Date(d.created_at), "yyyy-MM-dd");
        return demandDate === dayStr;
      });
      
      const completed = demands.filter((d) => {
        const demandDate = format(new Date(d.created_at), "yyyy-MM-dd");
        return demandDate <= dayStr && d.demand_statuses?.name === "Entregue";
      }).length;
      
      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        criadas: dayDemands.length,
        entregues: completed,
      };
    });
  }, [demands]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evolução de Demandas</CardTitle>
        <CardDescription>Demandas criadas e entregues nos últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
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
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="criadas"
              name="Criadas"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="entregues"
              name="Entregues"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
