import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, TrendingUp, Target, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Demand {
  id: string;
  assigned_to: string | null;
  demand_statuses: {
    name: string;
  } | null;
  demand_assignees?: {
    user_id: string;
    profile: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  }[];
}

interface WorkloadDistributionChartProps {
  demands: Demand[];
}

interface MemberWorkload {
  id: string;
  name: string;
  avatar: string | null;
  total: number;
  toStart: number;
  inProgress: number;
  delivered: number;
  deliveryRate: number;
}

const STATUS_COLORS = {
  toStart: "#3B82F6",
  inProgress: "#F59E0B",
  delivered: "#10B981",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc, p) => acc + (p.value || 0), 0);
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
        <p className="font-semibold mb-2 text-foreground">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">{entry.value}</span>
                <span className="text-muted-foreground text-xs">
                  ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-2 pt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold text-foreground">{total} demandas</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = () => (
  <div className="flex items-center justify-center gap-6 mb-4 flex-wrap">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.toStart }} />
      <span className="text-sm text-muted-foreground">A Iniciar</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.inProgress }} />
      <span className="text-sm text-muted-foreground">Em Andamento</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS.delivered }} />
      <span className="text-sm text-muted-foreground">Entregue</span>
    </div>
  </div>
);

export function WorkloadDistributionChart({ demands }: WorkloadDistributionChartProps) {
  // Calculate workload per member
  const workloadMap = new Map<string, MemberWorkload>();

  demands.forEach((demand) => {
    const assignees = demand.demand_assignees || [];

    assignees.forEach((assignee) => {
      if (!assignee.profile) return;

      const id = assignee.user_id;
      const { full_name, avatar_url } = assignee.profile;

      if (!workloadMap.has(id)) {
        workloadMap.set(id, {
          id,
          name: full_name,
          avatar: avatar_url,
          total: 0,
          toStart: 0,
          inProgress: 0,
          delivered: 0,
          deliveryRate: 0,
        });
      }

      const member = workloadMap.get(id)!;
      member.total += 1;

      const statusName = demand.demand_statuses?.name?.toLowerCase() || "";
      if (statusName === "entregue") {
        member.delivered += 1;
      } else if (statusName === "a iniciar") {
        member.toStart += 1;
      } else {
        member.inProgress += 1;
      }
    });
  });

  // Calculate delivery rates
  workloadMap.forEach((member) => {
    member.deliveryRate = member.total > 0 ? Math.round((member.delivered / member.total) * 100) : 0;
  });

  const workloadData = Array.from(workloadMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const hasData = workloadData.length > 0;

  // Summary metrics
  const totalDemands = workloadData.reduce((acc, m) => acc + m.total, 0);
  const totalDelivered = workloadData.reduce((acc, m) => acc + m.delivered, 0);
  const avgDeliveryRate = totalDemands > 0 ? Math.round((totalDelivered / totalDemands) * 100) : 0;
  const avgInProgress = workloadData.length > 0
    ? Math.round(workloadData.reduce((acc, m) => acc + m.inProgress, 0) / workloadData.length)
    : 0;

  // Custom Y-axis tick with avatar
  const CustomYAxisTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
    const member = workloadData.find((m) => m.name === payload.value);
    if (!member) return null;

    const initials = member.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-140} y={-12} width={135} height={24}>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-foreground truncate max-w-[90px]" title={member.name}>
              {member.name}
            </span>
            <Avatar className="h-5 w-5">
              <AvatarImage src={member.avatar || undefined} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Carga de Trabalho por Membro
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Target className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalDemands}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Demandas Atribuídas</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{avgDeliveryRate}%</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Taxa de Entrega</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Activity className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{avgInProgress}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Média em Andamento</p>
              </div>
            </div>

            {/* Legend */}
            <CustomLegend />

            {/* Stacked Bar Chart */}
            <div className="w-full">
              <ResponsiveContainer width="100%" height={workloadData.length * 50 + 20}>
                <BarChart
                  layout="vertical"
                  data={workloadData}
                  margin={{ top: 0, right: 30, left: 145, bottom: 0 }}
                  barSize={20}
                >
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={CustomYAxisTick as any}
                    width={140}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar
                    dataKey="toStart"
                    stackId="a"
                    fill={STATUS_COLORS.toStart}
                    name="A Iniciar"
                    radius={[4, 0, 0, 4]}
                  />
                  <Bar
                    dataKey="inProgress"
                    stackId="a"
                    fill={STATUS_COLORS.inProgress}
                    name="Em Andamento"
                  />
                  <Bar
                    dataKey="delivered"
                    stackId="a"
                    fill={STATUS_COLORS.delivered}
                    name="Entregue"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Member Details List */}
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Detalhamento por Membro</p>
              {workloadData.map((member) => {
                const initials = member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate max-w-[100px]">{member.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.toStart }} />
                        <span className="text-muted-foreground">{member.toStart}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.inProgress }} />
                        <span className="text-muted-foreground">{member.inProgress}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.delivered }} />
                        <span className="text-muted-foreground">{member.delivered}</span>
                      </div>
                      <div className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {member.deliveryRate}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum membro com demandas atribuídas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
