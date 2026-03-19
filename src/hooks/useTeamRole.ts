import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type TeamRole = "owner" | "member";

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
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data?.role as TeamRole;
    },
    enabled: !!user && !!teamId,
  });
}

export function useIsTeamAdmin(teamId: string | null) {
  const { data: role, isLoading } = useTeamRole(teamId);
  return { isAdmin: role === "owner", isLoading };
}

export function useIsTeamOwner(teamId: string | null) {
  const { data: role, isLoading } = useTeamRole(teamId);
  return { isOwner: role === "owner", isLoading };
}

// Keep for backward compat - maps to owner check
export function useIsTeamAdminOrModerator(teamId: string | null) {
  const { data: role, isLoading } = useTeamRole(teamId);
  return { 
    canManage: role === "owner", 
    isAdmin: role === "owner",
    isModerator: false,
    isLoading 
  };
}

// Board-level permission hooks
export function useCanInteractKanban(boardRole: string | null | undefined) {
  return { 
    canInteract: boardRole === "admin" || boardRole === "moderator" || boardRole === "executor",
  };
}
