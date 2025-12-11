import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Template {
  id: string;
  team_id: string;
  name: string;
  title_template: string | null;
  description_template: string | null;
  priority: string;
  service_id: string | null;
  created_by: string;
  created_at: string;
  services?: {
    name: string;
  } | null;
}

export function useTemplates(teamId: string | null) {
  return useQuery({
    queryKey: ["templates", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("demand_templates")
        .select("*, services(name)")
        .eq("team_id", teamId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Template[];
    },
    enabled: !!teamId,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: {
      team_id: string;
      name: string;
      title_template?: string;
      description_template?: string;
      priority?: string;
      service_id?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("demand_templates")
        .insert({ ...template, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["templates", variables.team_id] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      name?: string;
      title_template?: string;
      description_template?: string;
      priority?: string;
      service_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("demand_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates", data.team_id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase
        .from("demand_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { teamId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates", data.teamId] });
    },
  });
}
