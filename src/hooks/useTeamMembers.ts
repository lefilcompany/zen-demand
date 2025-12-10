import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TeamRole } from "./useTeamRole";

export interface TeamMember {
  id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
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
          profiles!team_members_user_id_fkey(full_name, avatar_url)
        `)
        .eq("team_id", teamId)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      return data.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role as TeamRole,
        joined_at: member.joined_at,
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
      newRole: TeamRole;
    }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
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
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
