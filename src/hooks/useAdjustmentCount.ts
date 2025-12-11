import { useMemo } from "react";
import { useDemands, useDemandStatuses } from "./useDemands";

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
