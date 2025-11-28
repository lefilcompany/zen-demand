import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      // Generate random access code
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: data.name,
          description: data.description,
          access_code: accessCode,
          created_by: (await supabase.auth.getUser()).data.user!.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as team member
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: (await supabase.auth.getUser()).data.user!.id,
        });

      if (memberError) throw memberError;

      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Equipe criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar equipe: " + error.message);
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

      // Add user as team member
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: (await supabase.auth.getUser()).data.user!.id,
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
      toast.success("Você entrou na equipe com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
