import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Json } from "@/integrations/supabase/types";
import { 
  DemandCreateSchema, 
  DemandUpdateSchema, 
  InteractionCreateSchema, 
  validateData 
} from "@/lib/validations";
import { 
  saveDemands, 
  getCachedDemandsByBoard, 
  getCachedDemand,
  saveDemandStatuses,
  getCachedDemandStatuses,
  isOnline,
  updateCachedDemand,
  addToSyncQueue,
  addCachedDemand,
  generateOfflineId,
  getCachedDemandStatuses as getOfflineDemandStatuses
} from "@/lib/offlineStorage";

// Priority order: alta (high) = 1, média (medium) = 2, baixa (low) = 3
const priorityOrder: Record<string, number> = {
  alta: 1,
  média: 2,
  baixa: 3,
};

export function sortDemandsByPriorityAndDueDate<T extends { priority?: string | null; due_date?: string | null }>(
  demands: T[]
): T[] {
  return [...demands].sort((a, b) => {
    // First sort by priority (alta > média > baixa)
    const priorityA = priorityOrder[a.priority || "média"] || 2;
    const priorityB = priorityOrder[b.priority || "média"] || 2;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Then sort by due date (earliest first, null dates at the end)
    const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    
    return dateA - dateB;
  });
}

export function useDemands(boardId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["demands", boardId],
    queryFn: async () => {
      // If offline, return cached data
      if (!isOnline() && boardId) {
        console.log('Offline: returning cached demands');
        const cachedDemands = await getCachedDemandsByBoard(boardId);
        return sortDemandsByPriorityAndDueDate(cachedDemands as any[]);
      }

      let query = supabase
        .from("demands")
        .select(`
          *,
          demand_statuses(name, color),
          profiles!demands_created_by_fkey(full_name, avatar_url),
          assigned_profile:profiles!demands_assigned_to_fkey(full_name, avatar_url),
          teams(name),
          demand_assignees(
            user_id,
            profile:profiles(full_name, avatar_url)
          )
        `)
        .eq("archived", false);

      if (boardId) {
        query = query.eq("board_id", boardId);
      }

      const { data, error } = await query;

      if (error) {
        // If network error, try to return cached data
        if (boardId) {
          console.log('Network error: returning cached demands');
          const cachedDemands = await getCachedDemandsByBoard(boardId);
          if (cachedDemands.length > 0) {
            return sortDemandsByPriorityAndDueDate(cachedDemands as any[]);
          }
        }
        throw error;
      }
      
      // Cache the data for offline use
      if (data && data.length > 0) {
        await saveDemands(data);
      }
      
      // Sort by priority then due date
      return sortDemandsByPriorityAndDueDate(data || []);
    },
    enabled: !!user && !!boardId,
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!isOnline()) return false;
      return failureCount < 3;
    },
  });
}

export function useDemandById(demandId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["demand", demandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demands")
        .select(`
          *,
          demand_statuses(name, color),
          profiles!demands_created_by_fkey(full_name, avatar_url),
          assigned_profile:profiles!demands_assigned_to_fkey(full_name, avatar_url),
          teams(name),
          demand_assignees(
            user_id,
            profile:profiles(full_name, avatar_url)
          )
        `)
        .eq("id", demandId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!demandId,
  });
}

export function useDemandStatuses() {
  return useQuery({
    queryKey: ["demand-statuses"],
    queryFn: async () => {
      // If offline, return cached statuses
      if (!isOnline()) {
        console.log('Offline: returning cached statuses');
        const cachedStatuses = await getCachedDemandStatuses();
        if (cachedStatuses.length > 0) {
          return cachedStatuses as { id: string; name: string; color: string }[];
        }
      }

      const { data, error } = await supabase
        .from("demand_statuses")
        .select("*")
        .order("name");

      if (error) {
        // Try cached statuses on error
        const cachedStatuses = await getCachedDemandStatuses();
        if (cachedStatuses.length > 0) {
          return cachedStatuses as { id: string; name: string; color: string }[];
        }
        throw error;
      }

      // Cache statuses for offline use
      if (data) {
        await saveDemandStatuses(data);
      }

      return data;
    },
    retry: (failureCount, error) => {
      if (!isOnline()) return false;
      return failureCount < 3;
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
      board_id: string;
      status_id: string;
      priority?: string;
      assigned_to?: string;
      due_date?: string;
      service_id?: string;
    }) => {
      // Validate input data before database operation
      const validatedData = validateData(DemandCreateSchema, data);
      
      // Get user info - may be cached
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // If offline, create locally and queue for sync
      if (!isOnline()) {
        console.log('Offline: creating demand locally');
        
        const offlineId = generateOfflineId();
        const now = new Date().toISOString();
        
        // Get status info from cache for display purposes
        const cachedStatuses = await getOfflineDemandStatuses();
        const statusInfo = cachedStatuses.find((s: any) => s.id === validatedData.status_id);
        
        const offlineDemand = {
          id: offlineId,
          title: validatedData.title,
          description: validatedData.description || null,
          team_id: validatedData.team_id,
          board_id: validatedData.board_id,
          status_id: validatedData.status_id,
          priority: validatedData.priority || 'média',
          assigned_to: validatedData.assigned_to || null,
          due_date: validatedData.due_date || null,
          service_id: validatedData.service_id || null,
          created_by: userId || 'offline_user',
          created_at: now,
          updated_at: now,
          archived: false,
          archived_at: null,
          time_in_progress_seconds: null,
          last_started_at: null,
          // Add display info for the Kanban
          demand_statuses: statusInfo || { name: 'A Iniciar', color: '#94a3b8' },
          profiles: { full_name: 'Você', avatar_url: null },
          demand_assignees: [],
          _isOffline: true, // Flag to indicate this is an offline demand
        };

        // Add to local cache
        await addCachedDemand(offlineDemand);

        // Add to sync queue for later sync
        await addToSyncQueue({
          type: 'create',
          table: 'demands',
          data: {
            title: validatedData.title,
            description: validatedData.description,
            team_id: validatedData.team_id,
            board_id: validatedData.board_id,
            status_id: validatedData.status_id,
            priority: validatedData.priority,
            assigned_to: validatedData.assigned_to,
            due_date: validatedData.due_date,
            service_id: validatedData.service_id,
            created_by: userId,
            _offlineId: offlineId, // Track the offline ID for replacement after sync
          },
        });

        return offlineDemand;
      }

      if (!userId) throw new Error('Usuário não autenticado');
      
      const { data: demand, error } = await supabase
        .from("demands")
        .insert({
          title: validatedData.title,
          description: validatedData.description,
          team_id: validatedData.team_id,
          board_id: validatedData.board_id,
          status_id: validatedData.status_id,
          priority: validatedData.priority,
          assigned_to: validatedData.assigned_to,
          due_date: validatedData.due_date,
          service_id: validatedData.service_id,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return demand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
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
      description?: string | null;
      status_id?: string;
      priority?: string;
      assigned_to?: string;
      due_date?: string | null;
      archived?: boolean;
      archived_at?: string | null;
      service_id?: string | null;
    }) => {
      // If offline, queue the operation and update cache optimistically
      if (!isOnline()) {
        console.log('Offline: queueing demand update');
        
        // Add to sync queue
        await addToSyncQueue({
          type: 'update',
          table: 'demands',
          data: { id, ...data },
        });

        // Update local cache optimistically
        await updateCachedDemand(id, data);

        // Return a mock response for optimistic update
        return { id, ...data };
      }

      // Validate input data before database operation
      const validatedData = validateData(DemandUpdateSchema, { id, ...data });
      const { id: validatedId, ...updateData } = validatedData;
      
      const { data: demand, error } = await supabase
        .from("demands")
        .update(updateData)
        .eq("id", validatedId)
        .select()
        .single();

      if (error) throw error;
      return demand;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["demand", data.id] });
      }
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
      metadata?: Record<string, unknown>;
    }) => {
      // Verify user is authenticated first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("Você precisa estar autenticado para realizar esta ação.");
      }
      
      // Validate input data before database operation
      const validatedData = validateData(InteractionCreateSchema, data);
      
      const insertData = {
        demand_id: validatedData.demand_id,
        interaction_type: validatedData.interaction_type,
        content: validatedData.content ?? null,
        metadata: (validatedData.metadata ?? null) as Json,
        user_id: user.id,
      };
      
      const { data: interaction, error } = await supabase
        .from("demand_interactions")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error creating interaction:", error);
        throw error;
      }
      return interaction;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["demand-interactions", variables.demand_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["adjustment-counts"],
      });
    },
  });
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, demandId, content }: { id: string; demandId: string; content: string }) => {
      const { data, error } = await supabase
        .from("demand_interactions")
        .update({ content })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["demand-interactions", variables.demandId],
      });
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, demandId }: { id: string; demandId: string }) => {
      const { error } = await supabase
        .from("demand_interactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["demand-interactions", variables.demandId],
      });
    },
  });
}
