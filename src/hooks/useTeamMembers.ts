import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeamRole } from "./useTeamRole";

// Board-level roles for display purposes
export type BoardRole = "admin" | "moderator" | "executor" | "requester";
type DbTeamRole = "admin" | "moderator" | "executor" | "requester";

const toAppRole = (role: DbTeamRole): TeamRole =>
  role === "admin" || role === "moderator" ? "owner" : "member";

const toDbRole = (role: TeamRole): DbTeamRole =>
  role === "owner" ? "admin" : "requester";

export interface TeamMemberPosition {
  id: string;
  name: string;
  color: string;
  text_color: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  position_id: string | null;
  position: TeamMemberPosition | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ["team-members", teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from("team_members")
        .select(`
          id,
          user_id,
          role,
          joined_at,
          position_id,
          profiles!team_members_user_id_fkey(full_name, avatar_url),
          team_positions(id, name, color, text_color)
        `)
        .eq("team_id", teamId)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      return data.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        role: toAppRole(member.role as DbTeamRole),
        joined_at: member.joined_at,
        position_id: member.position_id,
        position: member.team_positions
          ? {
              id: (member.team_positions as any).id,
              name: (member.team_positions as any).name,
              color: (member.team_positions as any).color,
              text_color: (member.team_positions as any).text_color || "auto",
            }
          : null,
        profile: {
          full_name: (member.profiles as any)?.full_name || "Usuário",
          avatar_url: (member.profiles as any)?.avatar_url || null,
        },
      })) as TeamMember[];
    },
    enabled: !!teamId,
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      newRole,
    }: {
      memberId: string;
      newRole: "owner" | "member";
    }) => {
      const { data, error } = await supabase
        .from("team_members")
        .update({ role: toDbRole(newRole) })
        .eq("id", memberId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Nenhuma alteração foi feita. Você pode não ter permissão para alterar este cargo.");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["team-role"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
