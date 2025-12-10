import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Assignee {
  id: string;
  user_id: string;
  assigned_at: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function useDemandAssignees(demandId: string | null) {
  return useQuery({
    queryKey: ["demand-assignees", demandId],
    queryFn: async () => {
      if (!demandId) return [];

      const { data, error } = await supabase
        .from("demand_assignees")
        .select(`
          id,
          user_id,
          assigned_at,
          profile:profiles(full_name, avatar_url)
        `)
        .eq("demand_id", demandId);

      if (error) throw error;
      return data as unknown as Assignee[];
    },
    enabled: !!demandId,
  });
}

export function useAddAssignee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ demandId, userId }: { demandId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("demand_assignees")
        .insert({
          demand_id: demandId,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["demand-assignees", variables.demandId] });
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
  });
}

export function useRemoveAssignee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ demandId, userId }: { demandId: string; userId: string }) => {
      const { error } = await supabase
        .from("demand_assignees")
        .delete()
        .eq("demand_id", demandId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["demand-assignees", variables.demandId] });
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
  });
}

export function useSetAssignees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ demandId, userIds }: { demandId: string; userIds: string[] }) => {
      // First delete all existing assignees
      const { error: deleteError } = await supabase
        .from("demand_assignees")
        .delete()
        .eq("demand_id", demandId);

      if (deleteError) throw deleteError;

      // Then insert new assignees
      if (userIds.length > 0) {
        const { error: insertError } = await supabase
          .from("demand_assignees")
          .insert(
            userIds.map((userId) => ({
              demand_id: demandId,
              user_id: userId,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["demand-assignees", variables.demandId] });
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
  });
}
