import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Subdemand {
  id: string;
  title: string;
  status_id: string;
  priority: string | null;
  due_date: string | null;
  parent_demand_id: string;
  board_sequence_number: number | null;
  demand_statuses: { name: string; color: string } | null;
  demand_assignees?: { user_id: string; profile: { full_name: string; avatar_url: string | null } }[];
}

export function useSubdemands(parentDemandId: string | null) {
  return useQuery({
    queryKey: ["subdemands", parentDemandId],
    queryFn: async () => {
      if (!parentDemandId) return [];
      const { data, error } = await supabase
        .from("demands")
        .select(`
          id, title, status_id, priority, due_date, parent_demand_id, board_sequence_number,
          demand_statuses(name, color),
          demand_assignees(user_id, profile:profiles(full_name, avatar_url))
        `)
        .eq("parent_demand_id", parentDemandId)
        .eq("archived", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Subdemand[];
    },
    enabled: !!parentDemandId,
  });
}

export function useDemandDependencies(demandId: string | null) {
  return useQuery({
    queryKey: ["demand-dependencies", demandId],
    queryFn: async () => {
      if (!demandId) return [];
      const { data, error } = await supabase
        .from("demand_dependencies")
        .select(`
          id, demand_id, depends_on_demand_id,
          depends_on:demands!demand_dependencies_depends_on_demand_id_fkey(id, title, status_id, demand_statuses(name, color))
        `)
        .eq("demand_id", demandId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!demandId,
  });
}

export interface SubdemandInput {
  title: string;
  description?: string;
  priority?: string;
  service_id?: string;
  assigned_to?: string;
  due_date?: string;
  status_id?: string;
}

export interface DependencyInput {
  demand_index: number; // 1-based
  depends_on_index: number; // 1-based
}

export function useCreateDemandWithSubdemands() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      parent,
      subdemands,
      dependencies,
    }: {
      parent: {
        title: string;
        description?: string;
        team_id: string;
        board_id: string;
        status_id: string;
        priority?: string;
        assigned_to?: string;
        due_date?: string;
        service_id?: string;
      };
      subdemands: SubdemandInput[];
      dependencies: DependencyInput[];
    }) => {
      // Build subdemands with same status_id as parent if not specified
      const subs = subdemands.map((s) => ({
        title: s.title,
        description: s.description || null,
        priority: s.priority || "média",
        service_id: s.service_id || null,
        assigned_to: s.assigned_to || null,
        due_date: s.due_date || null,
        status_id: s.status_id || parent.status_id,
      }));

      const { data, error } = await supabase.rpc("create_demand_with_subdemands", {
        p_parent: parent as any,
        p_subdemands: subs as any,
        p_dependencies: dependencies as any,
      });

      if (error) throw error;
      return data as { parent_id: string; subdemand_ids: string[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      queryClient.invalidateQueries({ queryKey: ["subdemands"] });
    },
  });
}

export function useAddSubdemand() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      parentDemandId,
      title,
      teamId,
      boardId,
      statusId,
      priority,
    }: {
      parentDemandId: string;
      title: string;
      teamId: string;
      boardId: string;
      statusId: string;
      priority?: string;
    }) => {
      const { data, error } = await supabase
        .from("demands")
        .insert({
          title,
          team_id: teamId,
          board_id: boardId,
          status_id: statusId,
          priority: priority || "média",
          parent_demand_id: parentDemandId,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subdemands", variables.parentDemandId] });
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
  });
}
