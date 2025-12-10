import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useServices(teamId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["services", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("team_id", teamId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!teamId,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      team_id: string;
      estimated_days: number;
    }) => {
      const { data: service, error } = await supabase
        .from("services")
        .insert({
          ...data,
          created_by: (await supabase.auth.getUser()).data.user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return service;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["services", variables.team_id] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      team_id,
      ...data
    }: {
      id: string;
      team_id: string;
      name?: string;
      description?: string;
      estimated_days?: number;
    }) => {
      const { data: service, error } = await supabase
        .from("services")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return service;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["services", variables.team_id] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, team_id }: { id: string; team_id: string }) => {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["services", variables.team_id] });
    },
  });
}
