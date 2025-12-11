import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDemands, useDemandStatuses } from "./useDemands";
import { supabase } from "@/integrations/supabase/client";

export function useAdjustmentCount(teamId: string | null) {
  const { data: demands } = useDemands(teamId || undefined);
  const { data: statuses } = useDemandStatuses();

  const count = useMemo(() => {
    if (!demands || !statuses) return 0;
    const adjustmentStatusId = statuses.find((s) => s.name === "Em Ajuste")?.id;
    if (!adjustmentStatusId) return 0;
    return demands.filter(
      (d) => d.status_id === adjustmentStatusId && !d.archived
    ).length;
  }, [demands, statuses]);

  return count;
}

export function useAdjustmentCounts(demandIds: string[]) {
  return useQuery({
    queryKey: ["adjustment-counts", demandIds],
    queryFn: async () => {
      if (demandIds.length === 0) return {};

      const { data, error } = await supabase
        .from("demand_interactions")
        .select("demand_id")
        .in("demand_id", demandIds)
        .eq("interaction_type", "adjustment_request");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((item) => {
        counts[item.demand_id] = (counts[item.demand_id] || 0) + 1;
      });

      return counts;
    },
    enabled: demandIds.length > 0,
  });
}
