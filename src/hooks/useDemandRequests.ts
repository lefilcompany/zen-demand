import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { useSelectedBoard } from "@/contexts/BoardContext";

interface DemandRequest {
  id: string;
  team_id: string;
  board_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  priority: string | null;
  service_id: string | null;
  status: "pending" | "approved" | "rejected" | "returned";
  rejection_reason: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name: string;
    avatar_url: string | null;
  };
  responder?: {
    full_name: string;
  } | null;
  service?: {
    name: string;
    estimated_days: number;
  } | null;
  board?: {
    name: string;
  } | null;
}

// Fetch pending requests for admins/moderators - filtered by board
export function usePendingDemandRequests() {
  const { selectedBoardId } = useSelectedBoard();

  return useQuery({
    queryKey: ["demand-requests", "pending", selectedBoardId],
    queryFn: async () => {
      if (!selectedBoardId) return [];

      const { data, error } = await supabase
        .from("demand_requests")
        .select(`
          *,
          creator:profiles!demand_requests_created_by_fkey(full_name, avatar_url),
          service:services(name, estimated_days),
          board:boards(name)
        `)
        .eq("board_id", selectedBoardId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DemandRequest[];
    },
    enabled: !!selectedBoardId,
  });
}

// Fetch user's own requests (for Solicitantes) - filtered by board
export function useMyDemandRequests() {
  const { user } = useAuth();
  const { selectedBoardId } = useSelectedBoard();

  return useQuery({
    queryKey: ["demand-requests", "my", user?.id, selectedBoardId],
    queryFn: async () => {
      if (!user || !selectedBoardId) return [];

      const { data, error } = await supabase
        .from("demand_requests")
        .select(`
          *,
          responder:profiles!demand_requests_responded_by_fkey(full_name),
          service:services(name, estimated_days),
          board:boards(name)
        `)
        .eq("created_by", user.id)
        .eq("board_id", selectedBoardId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DemandRequest[];
    },
    enabled: !!user && !!selectedBoardId,
  });
}

// Count pending requests for badge - filtered by board
export function usePendingRequestsCount() {
  const { selectedBoardId } = useSelectedBoard();

  return useQuery({
    queryKey: ["demand-requests", "count", selectedBoardId],
    queryFn: async () => {
      if (!selectedBoardId) return 0;

      const { count, error } = await supabase
        .from("demand_requests")
        .select("*", { count: "exact", head: true })
        .eq("board_id", selectedBoardId)
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedBoardId,
  });
}

// Count returned requests for the current user (needs attention)
export function useReturnedRequestsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["demand-requests", "returned-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("demand_requests")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .eq("status", "returned");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}

// Create a new demand request - requires board_id
export function useCreateDemandRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      team_id: string;
      board_id: string;
      title: string;
      description?: string;
      priority?: string;
      service_id?: string;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data: result, error } = await supabase
        .from("demand_requests")
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-requests"] });
    },
  });
}

// Update a demand request (for resubmission)
export function useUpdateDemandRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string;
      priority?: string;
      service_id?: string;
      status?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("demand_requests")
        .update({
          ...data,
          status: "pending", // Reset to pending when resubmitting
          rejection_reason: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-requests"] });
    },
  });
}

// Approve a request and create the demand
export function useApproveDemandRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      assigneeIds,
      dueDate,
    }: {
      requestId: string;
      assigneeIds: string[];
      dueDate?: string;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from("demand_requests")
        .select("*, service:services(estimated_days)")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;
      if (!request) throw new Error("Solicitação não encontrada");

      // Get default status
      const { data: defaultStatus } = await supabase
        .from("demand_statuses")
        .select("id")
        .eq("name", "A Iniciar")
        .single();

      if (!defaultStatus) throw new Error("Status padrão não encontrado");

      // Create the demand
      const { data: demand, error: demandError } = await supabase
        .from("demands")
        .insert({
          team_id: request.team_id,
          board_id: request.board_id,
          created_by: request.created_by,
          title: request.title,
          description: request.description,
          priority: request.priority,
          service_id: request.service_id,
          status_id: defaultStatus.id,
          due_date: dueDate || null,
        })
        .select()
        .single();

      if (demandError) throw demandError;

      // Add assignees
      if (assigneeIds.length > 0 && demand) {
        const { error: assignError } = await supabase
          .from("demand_assignees")
          .insert(
            assigneeIds.map((userId) => ({
              demand_id: demand.id,
              user_id: userId,
            }))
          );

        if (assignError) console.error("Erro ao atribuir responsáveis:", assignError);
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("demand_requests")
        .update({
          status: "approved",
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      return demand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-requests"] });
      queryClient.invalidateQueries({ queryKey: ["demands"] });
    },
  });
}

// Return a request to the requester
export function useReturnDemandRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason: string;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("demand_requests")
        .update({
          status: "returned",
          rejection_reason: reason,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-requests"] });
    },
  });
}

// Delete a pending request
export function useDeleteDemandRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("demand_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-requests"] });
    },
  });
}
