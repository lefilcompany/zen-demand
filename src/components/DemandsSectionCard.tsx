import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartPeriodSelector, type ChartPeriodType, getChartPeriodRange } from "@/components/ChartPeriodSelector";
import { useState, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface Demand {
  id: string;
  created_at: string;
  demand_statuses?: { name: string; color?: string } | null;
  services?: { name: string } | null;
  service_id?: string | null;
}

interface DemandsSectionCardProps {
  demands: Demand[];
}

const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-2 text-xs">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-muted-foreground">{payload[0].value} demandas</p>
      </div>
    );
  }
  return null;
};

export function DemandsSectionCard({ demands }: DemandsSectionCardProps) {
  const [period, setPeriod] = useState<ChartPeriodType>("3months");
  const isMobile = useIsMobile();

  const { categoryData, trendData } = useMemo(() => {
    const { start, end } = getChartPeriodRange(period);

    const filtered = demands.filter(d => {
      const date = new Date(d.created_at);
      if (start && date < start) return false;
      if (date > end) return false;
      return true;
    });

    // Category (by service or status)
    const catMap = new Map<string, number>();
    for (const d of filtered) {
      const cat = (d as any).services?.name || d.demand_statuses?.name || "Sem categoria";
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    }
    const categoryData = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Monthly trend by status
    const monthMap = new Map<string, Record<string, number>>();
    for (const d of filtered) {
      const monthKey = format(new Date(d.created_at), "yyyy-MM");
      const status = d.demand_statuses?.name || "Outro";
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, {});
      const entry = monthMap.get(monthKey)!;
      entry[status] = (entry[status] || 0) + 1;
    }

    const trendData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, statuses]) => ({
        month: format(new Date(month + "-01"), "MMM"),
        ...statuses,
      }));

    return { categoryData, trendData };
  }, [demands, period]);

  // Get unique status names for trend lines
  const statusKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of trendData) {
      Object.keys(item).forEach(k => { if (k !== "month") keys.add(k); });
    }
    return Array.from(keys);
  }, [trendData]);

  const statusColors: Record<string, string> = {
    "A Iniciar": "#6B7280",
    "Fazendo": "#3B82F6",
    "Em Ajuste": "#EF4444",
    "Entregue": "#10B981",
    "Aprovação Interna": "#F59E0B",
    "Aprovação do Cliente": "#8B5CF6",
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 p-4 md:p-6 md:pb-2">
        <CardTitle className="text-sm md:text-base font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Demandas
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 md:p-6 pt-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {/* Pie - Por categoria */}
          <div className="p-3 md:p-4 rounded-xl border border-border/50 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Por Categoria</p>
            {categoryData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={isMobile ? 140 : 170}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 30 : 40}
                      outerRadius={isMobile ? 55 : 65}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {categoryData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                  {categoryData.slice(0, 4).map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="truncate max-w-[80px]">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[140px] text-xs text-muted-foreground">
                Sem dados no período
              </div>
            )}
          </div>

          {/* Line - Visão geral */}
          <div className="p-3 md:p-4 rounded-xl border border-border/50 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Visão Geral</p>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 140 : 170}>
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  {statusKeys.map((key, idx) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={statusColors[key] || COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[140px] text-xs text-muted-foreground">
                Sem dados no período
              </div>
            )}
          </div>
        </div>

        <ChartPeriodSelector value={period} onChange={setPeriod} className="justify-center" />
      </CardContent>
    </Card>
  );
}
