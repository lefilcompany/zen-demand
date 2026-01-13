import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAllTeamDemands(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ["all-team-demands", teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from("demands")
        .select(`
          *,
          demand_statuses(id, name, color),
          services(id, name),
          profiles!demands_created_by_fkey(id, full_name, avatar_url),
          assigned_profile:profiles!demands_assigned_to_fkey(id, full_name, avatar_url),
          boards(id, name),
          demand_assignees(
            user_id,
            profile:profiles(id, full_name, avatar_url)
          )
        `)
        .eq("team_id", teamId)
        .eq("archived", false)
        .order("updated_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
    staleTime: 30000,
  });
}
