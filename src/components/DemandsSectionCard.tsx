import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartPeriodSelector, type ChartPeriodType, getChartPeriodRange } from "@/components/ChartPeriodSelector";
import { useState, useMemo } from "react";
import { BarChart3, Grid2X2, Atom, LayoutList } from "lucide-react";
import { toast } from "sonner";
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
  delivered_at?: string | null;
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
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(new Set(["A Iniciar", "Em Andamento", "Entregue"]));
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
      const serviceName = demand.services?.name?.trim() || FALLBACK_SERVICE_LABEL;
      catMap.set(serviceName, (catMap.get(serviceName) || 0) + 1);
    }

    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [demands, piePeriod, servicesMap]);

  const trendData = useMemo(() => {
    if (demands.length === 0) return [];

    const { start, end } = getChartPeriodRange(trendPeriod);
    const periodStart = start || new Date(Math.min(...demands.map((d) => new Date(d.created_at).getTime())));

    const diffDays = Math.ceil((end.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    let intervals: Date[];
    let formatStr: string;
    let getIntervalEnd: (date: Date) => Date;

    if (diffDays <= 31) {
      intervals = eachDayOfInterval({ start: periodStart, end });
      formatStr = "dd/MM";
      getIntervalEnd = (date) => new Date(startOfDay(date).getTime() + 86400000 - 1);
    } else if (diffDays <= 180) {
      intervals = eachWeekOfInterval({ start: periodStart, end });
      formatStr = "dd/MM";
      getIntervalEnd = (date) => new Date(startOfDay(date).getTime() + 7 * 86400000 - 1);
    } else {
      intervals = eachMonthOfInterval({ start: periodStart, end });
      formatStr = "MMM";
      getIntervalEnd = (date) => {
        const next = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        return next;
      };
    }

    let cumAIniciar = 0;
    let cumEmAndamento = 0;
    let cumEntregue = 0;

    return intervals.map((date, idx) => {
      const intervalEnd = idx < intervals.length - 1
        ? new Date(startOfDay(intervals[idx + 1]).getTime() - 1)
        : getIntervalEnd(date);

      // Accumulate demands CREATED up to this interval end
      for (const d of demands) {
        const created = new Date(d.created_at);
        // Only count demands newly entering this interval (created between prev end and current end)
        const prevEnd = idx > 0
          ? new Date(startOfDay(intervals[idx]).getTime() - 1)
          : new Date(periodStart.getTime() - 1);
        if (created > prevEnd && created <= intervalEnd) {
          const normalized = normalizeStatus(d.demand_statuses?.name || "A Iniciar");
          if (normalized === "A Iniciar") cumAIniciar++;
          else if (normalized === "Em Andamento") cumEmAndamento++;
        }
      }

      // Accumulate demands DELIVERED up to this interval end
      for (const d of demands) {
        if (!d.delivered_at) continue;
        const delivered = new Date(d.delivered_at);
        const prevEnd = idx > 0
          ? new Date(startOfDay(intervals[idx]).getTime() - 1)
          : new Date(periodStart.getTime() - 1);
        if (delivered > prevEnd && delivered <= intervalEnd) {
          cumEntregue++;
        }
      }

      return {
        label: format(date, formatStr, { locale: ptBR }),
        "A Iniciar": cumAIniciar,
        "Em Andamento": cumEmAndamento,
        Entregue: cumEntregue,
      };
    });
  }, [demands, trendPeriod]);

  const totalPie = categoryData.reduce((total, item) => total + item.value, 0);
  const topPercent = totalPie > 0 && categoryData.length > 0
    ? Math.round((categoryData[0].value / totalPie) * 100)
    : 0;

  const STATUS_KEYS = ["A Iniciar", "Em Andamento", "Entregue"] as const;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 p-4 md:p-6 md:pb-2">
        <CardTitle className="text-sm md:text-base font-bold tracking-wider uppercase text-foreground text-center flex items-center justify-center gap-2">
          <LayoutList className="h-4 w-4 md:h-5 md:w-5 text-foreground" />
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
              <div className="flex flex-col items-center gap-2">
                <div className="flex-shrink-0" style={{ width: isMobile ? 140 : 170, height: isMobile ? 140 : 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 60 : 75}
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
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center w-full">
                  {categoryData.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[10px] md:text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-foreground font-medium">{item.name} ({item.value})</span>
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
                    {STATUS_KEYS.filter((key) => visibleStatuses.has(key)).map((key) => (
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
                <div className="flex flex-wrap gap-x-1 gap-y-1 justify-center">
                  {STATUS_KEYS.map((key) => {
                    const isActive = visibleStatuses.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setVisibleStatuses((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) {
                              if (next.size > 1) {
                                next.delete(key);
                              } else {
                                toast.error("Não é possível remover todos os status", {
                                  description: "Mantenha pelo menos um status visível no gráfico.",
                                });
                              }
                            } else {
                              next.add(key);
                            }
                            return next;
                          });
                        }}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          isActive
                            ? "border-border bg-muted/60 text-foreground font-medium"
                            : "border-transparent bg-transparent text-muted-foreground/50 line-through"
                        }`}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0 transition-opacity"
                          style={{
                            backgroundColor: STATUS_CHART_COLORS[key],
                            opacity: isActive ? 1 : 0.3,
                          }}
                        />
                        <span>{key}</span>
                      </button>
                    );
                  })}
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
