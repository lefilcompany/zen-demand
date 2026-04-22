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
      // Guard: a demand must always have at least one responsible
      if (!userIds || userIds.length === 0) {
        throw new Error("A demanda precisa ter ao menos um responsável.");
      }

      // Get current assignees
      const { data: currentAssignees, error: fetchError } = await supabase
        .from("demand_assignees")
        .select("user_id")
        .eq("demand_id", demandId);

      if (fetchError) throw fetchError;

      const currentUserIds = currentAssignees?.map(a => a.user_id) || [];
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentActorId = user?.id ?? null;
      
      // Find users to remove and users to add
      const toRemove = currentUserIds.filter(id => !userIds.includes(id));
      const toAdd = userIds.filter(id => !currentUserIds.includes(id));

      // Add new assignees (only those not already assigned)
      // Use upsert with ignoreDuplicates to avoid 500 errors on race conditions
      // (e.g. double-click, stale local state vs. realtime updates).
      // Important: add before remove so a current assignee does not lose
      // permission mid-operation when replacing the assignee list.
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("demand_assignees")
          .upsert(
            toAdd.map((userId) => ({
              demand_id: demandId,
              user_id: userId,
            })),
            { onConflict: "demand_id,user_id", ignoreDuplicates: true }
          );

        if (insertError) {
          // Surface a clearer message instead of a generic 500
          const msg = (insertError as any)?.message || "";
          if (msg.includes("row-level security")) {
            throw new Error(
              "Você não tem permissão para alterar os responsáveis desta demanda."
            );
          }
          throw insertError;
        }
      }

      // Remove assignees that are no longer selected.
      // If the acting user is removing themselves, do that as the last step
      // so permission checks continue to pass for the rest of the update.
      if (toRemove.length > 0) {
        const otherUsersToRemove = currentActorId
          ? toRemove.filter((id) => id !== currentActorId)
          : toRemove;
        const shouldRemoveSelfLast = !!currentActorId && toRemove.includes(currentActorId);

        if (otherUsersToRemove.length > 0) {
          const { error: deleteOthersError } = await supabase
            .from("demand_assignees")
            .delete()
            .eq("demand_id", demandId)
            .in("user_id", otherUsersToRemove);

          if (deleteOthersError) throw deleteOthersError;
        }

        if (shouldRemoveSelfLast && currentActorId) {
          const { error: deleteSelfError } = await supabase
            .from("demand_assignees")
            .delete()
            .eq("demand_id", demandId)
            .eq("user_id", currentActorId);

          if (deleteSelfError) throw deleteSelfError;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["demand-assignees", variables.demandId] });
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
  });
}
