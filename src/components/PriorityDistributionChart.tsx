import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { AlertTriangle } from "lucide-react";

interface PriorityDistributionChartProps {
  demands: Array<{
    priority: string | null;
  }>;
}

const PRIORITY_COLORS: Record<string, string> = {
  alta: "#dc2626",      // Vermelho vibrante
  média: "#f97316",     // Laranja (primário do sistema)
  baixa: "#10b981",     // Verde esmeralda
  high: "#dc2626",
  medium: "#f97316", 
  low: "#10b981",
  null: "#94a3b8"       // Cinza slate
};

const PRIORITY_LABELS: Record<string, string> = {
  alta: "Alta",
  média: "Média",
  baixa: "Baixa",
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

  const rawData = Object.entries(priorityCounts).map(([priority, count]) => ({
    name: PRIORITY_LABELS[priority] || priority,
    value: count,
    color: PRIORITY_COLORS[priority] || "#6b7280"
  }));

  const hasData = rawData.length > 0;
  
  // Empty state data
  const emptyData = [
    { name: "Sem dados", value: 1, color: "#e5e7eb" }
  ];

  const data = hasData ? rawData : emptyData;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Distribuição por Prioridade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className="text-muted-foreground text-sm bg-background/80 px-3 py-1 rounded-md">
                Sem demandas
              </span>
            </div>
          )}
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={hasData ? 2 : 0}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} opacity={hasData ? 1 : 0.3} />
                ))}
              </Pie>
              {hasData && (
                <Tooltip 
                  formatter={(value: number) => [`${value} demandas`, '']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              )}
              {hasData && (
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
