import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useTeams() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teams", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_members!inner(user_id),
          profiles!teams_created_by_fkey(full_name, avatar_url)
        `)
        .eq("team_members.user_id", user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  // Increased to 10 characters for better brute-force protection (36^10 ≈ 3.6 quadrillion combinations)
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; accessCode?: string }) => {
      const accessCode = data.accessCode || generateAccessCode();
      const userId = (await supabase.auth.getUser()).data.user!.id;

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: data.name,
          description: data.description,
          access_code: accessCode,
          created_by: userId,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as team member with admin role
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: userId,
          role: "admin" as const,
        });

      if (memberError) throw memberError;

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useJoinTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accessCode: string) => {
      // Find team by access code
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id")
        .eq("access_code", accessCode)
        .single();

      if (teamError) throw new Error("Código de acesso inválido");

      // Add user as team member with requester role
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: (await supabase.auth.getUser()).data.user!.id,
          role: "requester" as const,
        });

      if (memberError) {
        if (memberError.code === "23505") {
          throw new Error("Você já é membro desta equipe");
        }
        throw memberError;
      }

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
