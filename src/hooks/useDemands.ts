import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function useDemands(teamId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["demands", teamId],
    queryFn: async () => {
      let query = supabase
        .from("demands")
        .select(`
          *,
          demand_statuses(name, color),
          profiles!demands_created_by_fkey(full_name, avatar_url),
          assigned_profile:profiles!demands_assigned_to_fkey(full_name, avatar_url),
          teams(name)
        `)
        .order("created_at", { ascending: false });

      if (teamId) {
        query = query.eq("team_id", teamId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useDemandStatuses() {
  return useQuery({
    queryKey: ["demand-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_statuses")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      team_id: string;
      status_id: string;
      priority?: string;
      assigned_to?: string;
      due_date?: string;
    }) => {
      const { data: demand, error } = await supabase
        .from("demands")
        .insert({
          ...data,
          created_by: (await supabase.auth.getUser()).data.user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return demand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar demanda: " + error.message);
    },
  });
}

export function useUpdateDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string;
      status_id?: string;
      priority?: string;
      assigned_to?: string;
      due_date?: string;
    }) => {
      const { data: demand, error } = await supabase
        .from("demands")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return demand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar demanda: " + error.message);
    },
  });
}

export function useDemandInteractions(demandId: string) {
  return useQuery({
    queryKey: ["demand-interactions", demandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_interactions")
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .eq("demand_id", demandId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      demand_id: string;
      interaction_type: string;
      content?: string;
      metadata?: any;
    }) => {
      const { data: interaction, error } = await supabase
        .from("demand_interactions")
        .insert({
          ...data,
          user_id: (await supabase.auth.getUser()).data.user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return interaction;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["demand-interactions", variables.demand_id],
      });
    },
  });
}
