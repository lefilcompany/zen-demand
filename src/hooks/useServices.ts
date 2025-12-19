import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ServiceCreateSchema, ServiceUpdateSchema, validateData } from "@/lib/validations";

export function useServices(teamId: string | null, boardId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["services", teamId, boardId],
    queryFn: async () => {
      if (!teamId) return [];
      
      let query = supabase
        .from("services")
        .select("*")
        .eq("team_id", teamId)
        .order("name");

      if (boardId) {
        query = query.eq("board_id", boardId);
      }

      const { data, error } = await query;

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
      estimated_hours: number;
    }) => {
      // Validate input data before database operation
      const validatedData = validateData(ServiceCreateSchema, data);
      const userId = (await supabase.auth.getUser()).data.user!.id;
      
      const { data: service, error } = await supabase
        .from("services")
        .insert({
          name: validatedData.name,
          description: validatedData.description,
          team_id: validatedData.team_id,
          estimated_hours: validatedData.estimated_hours,
          created_by: userId,
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
      estimated_hours?: number;
    }) => {
      // Validate input data before database operation
      const validatedData = validateData(ServiceUpdateSchema, { id, team_id, ...data });
      const { id: validatedId, team_id: validatedTeamId, ...updateData } = validatedData;
      
      const { data: service, error } = await supabase
        .from("services")
        .update(updateData)
        .eq("id", validatedId)
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
