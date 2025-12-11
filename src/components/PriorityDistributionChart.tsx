import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { AlertTriangle } from "lucide-react";

interface PriorityDistributionChartProps {
  demands: Array<{
    priority: string | null;
  }>;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b", 
  low: "#22c55e",
  null: "#6b7280"
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  null: "Sem prioridade"
};

export function PriorityDistributionChart({ demands }: PriorityDistributionChartProps) {
  const priorityCounts = demands.reduce((acc, demand) => {
    const priority = demand.priority || "null";
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(priorityCounts).map(([priority, count]) => ({
    name: PRIORITY_LABELS[priority] || priority,
    value: count,
    color: PRIORITY_COLORS[priority] || "#6b7280"
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Distribuição por Prioridade
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          Nenhuma demanda encontrada
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Distribuição por Prioridade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} demandas`, '']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
