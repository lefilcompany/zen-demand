import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo, useState } from "react";
import { format, subDays, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartPeriodSelector, type ChartPeriodType, getChartPeriodRange } from "./ChartPeriodSelector";

interface Demand {
  id: string;
  created_at: string;
  demand_statuses?: { name: string } | null;
}

interface DemandTrendChartProps {
  demands: Demand[];
}

export function DemandTrendChart({ demands }: DemandTrendChartProps) {
  const [period, setPeriod] = useState<ChartPeriodType>("month");

  const chartData = useMemo(() => {
    const { start, end } = getChartPeriodRange(period);
    const today = startOfDay(end);
    
    // Find the earliest demand date if no start is specified
    const effectiveStart = start || 
      (demands.length > 0 
        ? startOfDay(new Date(Math.min(...demands.map(d => new Date(d.created_at).getTime()))))
        : subDays(today, 29));

    // Determine granularity based on period
    const daysDiff = Math.ceil((today.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 31) {
      // Daily granularity for up to 1 month
      const days = eachDayOfInterval({ start: effectiveStart, end: today });
      
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
          fullDate: format(day, "dd 'de' MMMM", { locale: ptBR }),
          criadas: dayDemands.length,
          entregues: completed,
        };
      });
    } else if (daysDiff <= 120) {
      // Weekly granularity for up to 4 months
      const weeks = eachWeekOfInterval({ start: effectiveStart, end: today }, { weekStartsOn: 1 });
      
      return weeks.map((weekStart, idx) => {
        const weekEnd = idx < weeks.length - 1 ? subDays(weeks[idx + 1], 1) : today;
        
        const weekDemands = demands.filter((d) => {
          const demandDate = new Date(d.created_at);
          return demandDate >= weekStart && demandDate <= weekEnd;
        });
        
        const completed = demands.filter((d) => {
          const demandDate = new Date(d.created_at);
          return demandDate <= weekEnd && d.demand_statuses?.name === "Entregue";
        }).length;
        
        return {
          date: format(weekStart, "dd/MM", { locale: ptBR }),
          fullDate: `Semana de ${format(weekStart, "dd/MM", { locale: ptBR })}`,
          criadas: weekDemands.length,
          entregues: completed,
        };
      });
    } else {
      // Monthly granularity for longer periods
      const months = eachMonthOfInterval({ start: effectiveStart, end: today });
      
      return months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        
        const monthDemands = demands.filter((d) => {
          const demandDate = new Date(d.created_at);
          return demandDate >= monthStart && demandDate <= monthEnd;
        });
        
        const completed = demands.filter((d) => {
          const demandDate = new Date(d.created_at);
          return demandDate <= monthEnd && d.demand_statuses?.name === "Entregue";
        }).length;
        
        return {
          date: format(monthStart, "MMM/yy", { locale: ptBR }),
          fullDate: format(monthStart, "MMMM 'de' yyyy", { locale: ptBR }),
          criadas: monthDemands.length,
          entregues: completed,
        };
      });
    }
  }, [demands, period]);

  const periodDescription = useMemo(() => {
    switch (period) {
      case "month": return "Demandas criadas e entregues neste mês";
      case "3months": return "Demandas criadas e entregues nos últimos 3 meses";
      case "6months": return "Demandas criadas e entregues nos últimos 6 meses";
      case "year": return "Demandas criadas e entregues no último ano";
      case "all": return "Demandas criadas e entregues em todo o período";
    }
  }, [period]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Evolução de Demandas</CardTitle>
            <CardDescription>{periodDescription}</CardDescription>
          </div>
          <ChartPeriodSelector value={period} onChange={setPeriod} />
        </div>
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
              labelFormatter={(_, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullDate;
                }
                return "";
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
