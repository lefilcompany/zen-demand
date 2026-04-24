import type { QueryClient } from "@tanstack/react-query";

interface StatusSnapshot {
  id: string;
  name: string;
  color: string;
}

interface DemandLike {
  id: string;
  status_id?: string | null;
  demand_statuses?: Partial<StatusSnapshot> | null;
  status_changed_at?: string | null;
  status_changed_by?: string | null;
  delivered_at?: string | null;
  time_in_progress_seconds?: number | null;
  last_started_at?: string | null;
}

function getElapsedSeconds(startedAt?: string | null) {
  if (!startedAt) return 0;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

function getStatusSnapshot(
  queryClient: QueryClient,
  statusId: string,
  fallback?: Partial<StatusSnapshot> | null
): StatusSnapshot | null {
  const statuses = queryClient.getQueryData<Array<StatusSnapshot | { id: string; name: string; color: string }>>([
    "demand-statuses",
  ]);

  const matched = statuses?.find((status) => status.id === statusId);
  if (matched) {
    return {
      id: matched.id,
      name: matched.name,
      color: matched.color,
    };
  }

  if (fallback?.name && fallback?.color) {
    return {
      id: statusId,
      name: fallback.name,
      color: fallback.color,
    };
  }

  return null;
}

function patchDemand<T extends DemandLike>(
  item: T,
  statusId: string,
  statusSnapshot: StatusSnapshot | null,
  statusChangedAt?: string,
  statusChangedBy?: string | null,
  deliveredAt?: string | null,
  stopTimer?: boolean
): T {
  const elapsedSeconds = stopTimer ? getElapsedSeconds(item.last_started_at) : 0;

  return {
    ...item,
    status_id: statusId,
    demand_statuses: statusSnapshot ?? item.demand_statuses ?? null,
    status_changed_at: statusChangedAt ?? item.status_changed_at ?? null,
    status_changed_by: statusChangedBy ?? item.status_changed_by ?? null,
    delivered_at: deliveredAt !== undefined ? deliveredAt : item.delivered_at,
    ...(stopTimer
      ? {
          last_started_at: null,
          time_in_progress_seconds: (item.time_in_progress_seconds ?? 0) + elapsedSeconds,
        }
      : {}),
  };
}

export function patchDemandStatusByIds(
  queryClient: QueryClient,
  demandIds: string[],
  options: {
    statusId: string;
    statusName?: string;
    statusColor?: string;
    statusChangedAt?: string;
    statusChangedBy?: string | null;
    deliveredAt?: string | null;
    stopTimer?: boolean;
  }
) {
  if (!demandIds.length) return;

  const targetIds = new Set(demandIds);
  const statusSnapshot = getStatusSnapshot(queryClient, options.statusId, {
    name: options.statusName,
    color: options.statusColor,
  });

  const patchOne = <T extends DemandLike>(item: T) =>
    patchDemand(
      item,
      options.statusId,
      statusSnapshot,
      options.statusChangedAt,
      options.statusChangedBy,
      options.deliveredAt,
      options.stopTimer
    );

  queryClient.setQueriesData({ queryKey: ["demand"] }, (old: unknown) => {
    if (!old || typeof old !== "object") return old;
    const item = old as DemandLike;
    return targetIds.has(item.id) ? patchOne(item) : old;
  });

  const patchArray = (old: unknown) => {
    if (!Array.isArray(old)) return old;
    return old.map((item) => {
      if (!item || typeof item !== "object") return item;
      const demand = item as DemandLike;
      return targetIds.has(demand.id) ? patchOne(demand) : item;
    });
  };

  queryClient.setQueriesData({ queryKey: ["demands"] }, patchArray);
  queryClient.setQueriesData({ queryKey: ["subdemands"] }, patchArray);
  queryClient.setQueriesData({ queryKey: ["all-team-demands"] }, patchArray);
}

export function patchParentAggregatedTime(
  queryClient: QueryClient,
  parentDemandId: string,
  subdemandIds: string[]
) {
  if (!parentDemandId || !subdemandIds.length) return;

  const targetIds = new Set(subdemandIds);

  queryClient.setQueriesData({ queryKey: ["parent-aggregated-time", parentDemandId] }, (old: unknown) => {
    if (!Array.isArray(old)) return old;

    return old.map((item) => {
      if (!item || typeof item !== "object") return item;
      const current = item as {
        id: string;
        totalSeconds: number;
        hasActiveTimer: boolean;
        activeStartedAt: string | null;
      };

      if (!targetIds.has(current.id) || !current.hasActiveTimer) return item;

      return {
        ...current,
        totalSeconds: current.totalSeconds + getElapsedSeconds(current.activeStartedAt),
        hasActiveTimer: false,
        activeStartedAt: null,
      };
    });
  });
}
