import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartPeriodSelector, type ChartPeriodType, getChartPeriodRange } from "@/components/ChartPeriodSelector";
import { useState, useMemo } from "react";
import { BarChart3, Grid2X2, Atom } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelectedBoard } from "@/contexts/BoardContext";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useServices } from "@/hooks/useServices";

interface Demand {
  id: string;
  created_at: string;
  demand_statuses?: { name: string; color?: string } | null;
  services?: { id?: string; name: string } | null;
  service_id?: string | null;
}

interface DemandsSectionCardProps {
  demands: Demand[];
}

interface ServiceLookup {
  id: string;
  name: string;
  parent_id: string | null;
}

const COLORS = ["#F97316", "#8B5CF6", "#EC4899", "#7C3AED", "#06B6D4", "#84CC16", "#EF4444", "#F59E0B"];
const FALLBACK_SERVICE_LABEL = "Sem serviço";

const STATUS_CHART_COLORS: Record<string, string> = {
  "Solicitadas": "#D1D5DB",
  "A Iniciar": "#3B82F6",
  "Em Andamento": "#F59E0B",
  "Entregue": "#10B981",
};

const CustomPieTooltip = ({ active, payload, total }: any) => {
  if (active && payload?.length) {
    const item = payload[0];
    const value = Number(item?.value ?? 0);
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-2 text-xs">
        <p className="font-medium">{item?.name || item?.payload?.name || FALLBACK_SERVICE_LABEL}</p>
        <p className="text-muted-foreground">{value} demandas ({percent}%)</p>
      </div>
    );
  }
  return null;
};

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-2.5 min-w-[140px]">
        <p className="font-medium text-xs mb-1 text-foreground">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-medium text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function normalizeStatus(statusName: string): string {
  const lower = statusName.toLowerCase();
  if (lower === "entregue" || lower.includes("conclu")) return "Entregue";
  if (lower === "a iniciar" || lower.includes("pendente") || lower.includes("solicit")) return "A Iniciar";
  return "Em Andamento";
}

function resolveServiceCategoryName(
  serviceId: string | null | undefined,
  fallbackName: string | undefined,
  servicesMap: Map<string, ServiceLookup>
) {
  const normalizedFallback = fallbackName?.trim() || FALLBACK_SERVICE_LABEL;

  if (!serviceId) return normalizedFallback;

  let current = servicesMap.get(serviceId);
  if (!current) return normalizedFallback;

  const visited = new Set<string>();

  while (current.parent_id && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = servicesMap.get(current.parent_id);
    if (!parent) break;
    current = parent;
  }

  return current.name?.trim() || normalizedFallback;
}

export function DemandsSectionCard({ demands }: DemandsSectionCardProps) {
  const [piePeriod, setPiePeriod] = useState<ChartPeriodType>("month");
  const [trendPeriod, setTrendPeriod] = useState<ChartPeriodType>("month");
  const isMobile = useIsMobile();
  const { selectedBoardId, currentTeamId } = useSelectedBoard();
  const { selectedTeamId } = useSelectedTeam();
  const { data: services = [] } = useServices(selectedTeamId || currentTeamId || null, selectedBoardId);

  const servicesMap = useMemo(
    () => new Map(services.map((service) => [service.id, service] as const)),
    [services]
  );

  const categoryData = useMemo(() => {
    const { start, end } = getChartPeriodRange(piePeriod);
    const filtered = demands.filter((d) => {
      const date = new Date(d.created_at);
      if (start && date < start) return false;
      if (date > end) return false;
      return true;
    });

    const catMap = new Map<string, number>();

    for (const demand of filtered) {
      const categoryName = resolveServiceCategoryName(
        demand.service_id,
        demand.services?.name,
        servicesMap as Map<string, ServiceLookup>
      );
      catMap.set(categoryName, (catMap.get(categoryName) || 0) + 1);
    }

    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [demands, piePeriod, servicesMap]);

  const trendData = useMemo(() => {
    if (demands.length === 0) return [];

    const { start, end } = getChartPeriodRange(trendPeriod);
    const firstDemandDate = new Date(Math.min(...demands.map((d) => new Date(d.created_at).getTime())));
    const periodStart = start || firstDemandDate;

    const diffDays = Math.ceil((end.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    let intervals: Date[];
    let formatStr: string;

    if (diffDays <= 31) {
      intervals = eachDayOfInterval({ start: periodStart, end });
      formatStr = "dd/MM";
    } else if (diffDays <= 180) {
      intervals = eachWeekOfInterval({ start: periodStart, end });
      formatStr = "dd/MM";
    } else {
      intervals = eachMonthOfInterval({ start: periodStart, end });
      formatStr = "MMM";
    }

    return intervals.map((date) => {
      const dayEnd = new Date(startOfDay(date).getTime() + 86400000 - 1);
      const solicitadas = demands.filter((d) => new Date(d.created_at) <= dayEnd).length;

      let aIniciar = 0;
      let emAndamento = 0;
      let entregue = 0;

      for (const demand of demands) {
        if (new Date(demand.created_at) > dayEnd) continue;
        const normalized = normalizeStatus(demand.demand_statuses?.name || "A Iniciar");
        if (normalized === "A Iniciar") aIniciar++;
        else if (normalized === "Em Andamento") emAndamento++;
        else if (normalized === "Entregue") entregue++;
      }

      return {
        label: format(date, formatStr, { locale: ptBR }),
        Solicitadas: solicitadas,
        "A Iniciar": aIniciar,
        "Em Andamento": emAndamento,
        Entregue: entregue,
      };
    });
  }, [demands, trendPeriod]);

  const totalPie = categoryData.reduce((total, item) => total + item.value, 0);
  const topPercent = totalPie > 0 && categoryData.length > 0
    ? Math.round((categoryData[0].value / totalPie) * 100)
    : 0;

  const STATUS_KEYS = ["Solicitadas", "A Iniciar", "Em Andamento", "Entregue"] as const;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 p-4 md:p-6 md:pb-2">
        <CardTitle className="text-sm md:text-base font-bold tracking-wider uppercase text-foreground text-center">
          Demandas
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 md:p-6 pt-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="p-3 md:p-4 rounded-xl border border-border/50 bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Grid2X2 className="h-4 w-4 md:h-5 md:w-5 text-orange-500 shrink-0" />
              <span className="text-xs md:text-sm font-semibold text-foreground">Por categoria</span>
            </div>
            {categoryData.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-shrink-0" style={{ width: isMobile ? 120 : 150, height: isMobile ? 120 : 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 28 : 38}
                        outerRadius={isMobile ? 52 : 65}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {categoryData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip total={totalPie} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-lg md:text-xl font-bold text-orange-500">{topPercent}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1 max-h-[150px] overflow-y-auto pr-1">
                  {categoryData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[10px] md:text-xs">
                      <div className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-foreground truncate font-medium">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-xs text-muted-foreground">
                Sem dados no período
              </div>
            )}
            <ChartPeriodSelector value={piePeriod} onChange={setPiePeriod} className="justify-center" compact />
          </div>

          <div className="p-3 md:p-4 rounded-xl border border-border/50 bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Atom className="h-4 w-4 md:h-5 md:w-5 text-orange-500 shrink-0" />
              <span className="text-xs md:text-sm font-semibold text-foreground">Visão geral</span>
            </div>
            {trendData.length > 1 ? (
              <>
                <ResponsiveContainer width="100%" height={isMobile ? 130 : 160}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                      label={{ value: "DEMANDAS", angle: -90, position: "insideLeft", offset: 15, style: { fontSize: 8, fill: "hsl(var(--muted-foreground))" } }}
                    />
                    <Tooltip content={<CustomAreaTooltip />} />
                    {STATUS_KEYS.map((key) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={STATUS_CHART_COLORS[key]}
                        fill={STATUS_CHART_COLORS[key]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                        dot={{ r: 2, fill: STATUS_CHART_COLORS[key] }}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
                  {STATUS_KEYS.map((key) => (
                    <div key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CHART_COLORS[key] }} />
                      <span>{key}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[130px] text-xs text-muted-foreground">
                Sem dados suficientes no período
              </div>
            )}
            <ChartPeriodSelector value={trendPeriod} onChange={setTrendPeriod} className="justify-center" compact />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
