import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import type { PeriodType } from "@/components/PeriodFilter";
import { sortDemandsByPriorityAndDueDate } from "./useDemands";

function getPeriodRange(period: PeriodType): { start: Date; end: Date } {
  const now = new Date();
  
  switch (period) {
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 })
      };
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case "quarter":
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now)
      };
  }
}

export function useDemandsByPeriod(period: PeriodType, teamId?: string) {
  const { selectedTeamId } = useSelectedTeam();
  const id = teamId || selectedTeamId;
  const { start, end } = getPeriodRange(period);

  return useQuery({
    queryKey: ["demands-by-period", id, period, start.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demands")
        .select(`
          id,
          title,
          created_at,
          priority,
          due_date,
          status_id,
          demand_statuses!inner(name, color)
        `)
        .eq("team_id", id!)
        .eq("archived", false)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) throw error;
      
      // Sort by priority then due date
      const sortedData = sortDemandsByPriorityAndDueDate(data || []);

      // Group by status
      const byStatus: Record<string, { count: number; name: string; color: string }> = {};
      
      sortedData.forEach((demand: any) => {
        const statusName = demand.demand_statuses?.name || "Sem status";
        const statusColor = demand.demand_statuses?.color || "#6B7280";
        
        if (!byStatus[statusName]) {
          byStatus[statusName] = { count: 0, name: statusName, color: statusColor };
        }
        byStatus[statusName].count++;
      });

      return {
        demands: sortedData,
        byStatus: Object.values(byStatus),
        total: sortedData.length,
        periodStart: start,
        periodEnd: end,
      };
    },
    enabled: !!id,
  });
}
