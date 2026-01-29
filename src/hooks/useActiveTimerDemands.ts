import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useActiveTimerDemands() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["active-timer-demands", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get demands where timer is active (last_started_at is not null)
      // and user is either assigned or is an assignee
      const { data, error } = await supabase
        .from("demands")
        .select(`
          id,
          title,
          board_id,
          last_started_at,
          time_in_progress_seconds,
          boards(name),
          demand_assignees(user_id)
        `)
        .not("last_started_at", "is", null)
        .eq("archived", false)
        .order("last_started_at", { ascending: false });

      if (error) throw error;

      // Filter to only include demands where user is assigned
      const userDemands = (data || []).filter(demand => {
        const isAssignee = demand.demand_assignees?.some(
          (a: { user_id: string }) => a.user_id === user.id
        );
        return isAssignee;
      });

      return userDemands;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
