import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BoardTimeEntry {
  id: string;
  demand_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
  demand: {
    id: string;
    title: string;
    board_id: string;
    status_id: string;
    priority: string | null;
    status: {
      name: string;
      color: string;
    };
  };
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface BoardUserTimeStats {
  userId: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  totalSeconds: number;
  isActive: boolean;
  activeStartedAt: string | null;
  demandCount: number;
  entries: BoardTimeEntry[];
}

export function useBoardTimeEntries(boardId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["board-time-entries", boardId],
    queryFn: async () => {
      if (!boardId) return [];

      // Fetch time entries with demands filtered by board_id
      const { data: entries, error: entriesError } = await supabase
        .from("demand_time_entries")
        .select(`
          *,
          demand:demands!inner(
            id,
            title,
            board_id,
            status_id,
            priority,
            status:demand_statuses(name, color)
          )
        `)
        .eq("demand.board_id", boardId)
        .order("started_at", { ascending: false });

      if (entriesError) throw entriesError;
      if (!entries || entries.length === 0) return [];

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(entries.map(e => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine entries with profiles
      return entries.map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id) || { id: entry.user_id, full_name: "Usuário", avatar_url: null },
      })) as BoardTimeEntry[];
    },
    enabled: !!boardId,
    refetchInterval: false,
  });

  // Subscribe to realtime updates for demand_time_entries
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board-time-entries-realtime-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demand_time_entries',
        },
        () => {
          // Invalidate and refetch when any time entry changes
          queryClient.invalidateQueries({ queryKey: ["board-time-entries", boardId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, queryClient]);

  return query;
}

// Get aggregated stats per user for a board
export function useBoardUserTimeStats(boardId: string | null) {
  const { data: entries, isLoading } = useBoardTimeEntries(boardId);

  const stats = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    const userMap = new Map<string, BoardUserTimeStats>();
    const userDemands = new Map<string, Set<string>>();

    for (const entry of entries) {
      const userId = entry.user_id;
      const existing = userMap.get(userId);
      
      const entrySeconds = entry.duration_seconds || 0;
      const isActive = !entry.ended_at;

      if (!userDemands.has(userId)) {
        userDemands.set(userId, new Set());
      }
      userDemands.get(userId)!.add(entry.demand_id);
      
      if (existing) {
        existing.totalSeconds += entrySeconds;
        existing.entries.push(entry);
        if (isActive && !existing.isActive) {
          existing.isActive = true;
          existing.activeStartedAt = entry.started_at;
        }
      } else {
        userMap.set(userId, {
          userId,
          profile: entry.profile,
          totalSeconds: entrySeconds,
          isActive,
          activeStartedAt: isActive ? entry.started_at : null,
          demandCount: 0,
          entries: [entry],
        });
      }
    }

    // Set demand counts
    for (const [userId, stats] of userMap) {
      stats.demandCount = userDemands.get(userId)?.size || 0;
    }

    // Sort by total time descending
    return Array.from(userMap.values()).sort((a, b) => {
      // Active timers first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return b.totalSeconds - a.totalSeconds;
    });
  }, [entries]);

  // Count active timers
  const activeTimersCount = useMemo(() => {
    return stats.filter(s => s.isActive).length;
  }, [stats]);

  return { data: stats, isLoading, activeTimersCount };
}
