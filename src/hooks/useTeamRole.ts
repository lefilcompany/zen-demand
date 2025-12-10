import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type TeamRole = "admin" | "moderator" | "requester";

export function useTeamRole(teamId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["team-role", teamId, user?.id],
    queryFn: async () => {
      if (!user || !teamId) return null;

      const { data, error } = await supabase
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("team_id", teamId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // No rows found
        throw error;
      }
      return data?.role as TeamRole;
    },
    enabled: !!user && !!teamId,
  });
}

export function useIsTeamAdmin(teamId: string | null) {
  const { data: role, isLoading } = useTeamRole(teamId);
  return { isAdmin: role === "admin", isLoading };
}

export function useIsTeamAdminOrModerator(teamId: string | null) {
  const { data: role, isLoading } = useTeamRole(teamId);
  return { 
    canManage: role === "admin" || role === "moderator", 
    isAdmin: role === "admin",
    isModerator: role === "moderator",
    isLoading 
  };
}