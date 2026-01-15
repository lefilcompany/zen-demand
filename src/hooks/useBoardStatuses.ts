import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
export type AdjustmentType = 'none' | 'internal' | 'external';

export interface BoardStatus {
  id: string;
  board_id: string;
  status_id: string;
  position: number;
  is_active: boolean;
  created_at: string;
  adjustment_type: AdjustmentType;
  status: {
    id: string;
    name: string;
    color: string;
    is_system?: boolean;
  };
}

export interface KanbanColumn {
  key: string;
  label: string;
  color: string;
  shortLabel: string;
  statusId: string;
  adjustmentType: AdjustmentType;
}

// Fixed stages that cannot be deleted or reordered (start and end of workflow)
export const FIXED_START_STATUS = "A Iniciar";
export const FIXED_END_STATUS = "Entregue";

// Check if a status is a fixed boundary stage
export function isFixedBoundaryStatus(statusName: string): boolean {
  return statusName === FIXED_START_STATUS || statusName === FIXED_END_STATUS;
}

// Default columns fallback (matches current static columns)
export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { key: "A Iniciar", label: "A Iniciar", color: "bg-muted", shortLabel: "Iniciar", statusId: "", adjustmentType: "none" },
  { key: "Fazendo", label: "Fazendo", color: "bg-blue-500/10", shortLabel: "Fazendo", statusId: "", adjustmentType: "none" },
  { key: "Em Ajuste", label: "Em Ajuste", color: "bg-purple-500/10", shortLabel: "Ajuste", statusId: "", adjustmentType: "none" },
  { key: "Aprovação Interna", label: "Aprovação Interna", color: "bg-blue-500/10", shortLabel: "Apr. Int.", statusId: "", adjustmentType: "internal" },
  { key: "Aprovação do Cliente", label: "Aprovação do Cliente", color: "bg-amber-500/10", shortLabel: "Aprovação", statusId: "", adjustmentType: "external" },
  { key: "Entregue", label: "Entregue", color: "bg-emerald-500/10", shortLabel: "Entregue", statusId: "", adjustmentType: "none" },
];

// Map status names to colors
const statusColorMap: Record<string, string> = {
  "A Iniciar": "bg-muted",
  "Fazendo": "bg-blue-500/10",
  "Em Ajuste": "bg-purple-500/10",
  "Aprovação Interna": "bg-blue-500/10",
  "Aprovação do Cliente": "bg-amber-500/10",
  "Entregue": "bg-emerald-500/10",
};

// Map status names to short labels
const statusShortLabelMap: Record<string, string> = {
  "A Iniciar": "Iniciar",
  "Fazendo": "Fazendo",
  "Em Ajuste": "Ajuste",
  "Aprovação Interna": "Apr. Int.",
  "Aprovação do Cliente": "Aprovação",
  "Entregue": "Entregue",
};

// Get color class based on status name (fallback for system statuses)
export function getStatusColor(statusName: string): string {
  return statusColorMap[statusName] || "bg-muted";
}

// Convert hex color to Tailwind-compatible background style
function getColorStyle(hexColor: string | undefined, statusName: string): string {
  // For system statuses, use predefined Tailwind classes
  if (statusColorMap[statusName]) {
    return statusColorMap[statusName];
  }
  // For custom statuses, we'll use inline styles (handled in component)
  return "bg-muted";
}

// Get short label based on status name
export function getShortLabel(statusName: string): string {
  return statusShortLabelMap[statusName] || statusName.split(" ")[0];
}

// Convert BoardStatus to KanbanColumn
export function boardStatusToColumn(boardStatus: BoardStatus): KanbanColumn {
  const isSystemStatus = !!statusColorMap[boardStatus.status.name];
  
  return {
    key: boardStatus.status.name,
    label: boardStatus.status.name,
    // Use the actual color from database, fallback to mapped color for system statuses
    color: isSystemStatus ? getStatusColor(boardStatus.status.name) : boardStatus.status.color,
    shortLabel: getShortLabel(boardStatus.status.name),
    statusId: boardStatus.status.id,
    adjustmentType: boardStatus.adjustment_type || 'none',
  };
}

// Fetch active board statuses
export function useBoardStatuses(boardId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["board-statuses", boardId],
    queryFn: async () => {
      if (!boardId) return [];

      const { data, error } = await supabase
        .from("board_statuses")
        .select(`
          id,
          board_id,
          status_id,
          position,
          is_active,
          created_at,
          adjustment_type,
          status:demand_statuses(id, name, color, is_system)
        `)
        .eq("board_id", boardId)
        .eq("is_active", true)
        .order("position");

      if (error) throw error;
      
      // Filter out any null statuses and type cast
      return (data || []).filter(d => d.status !== null).map(d => ({
        ...d,
        adjustment_type: (d.adjustment_type as AdjustmentType) || 'none'
      })) as BoardStatus[];
    },
    enabled: !!boardId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board-statuses-${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_statuses",
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["board-statuses", boardId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, queryClient]);

  return query;
}

// Fetch all board statuses (including inactive) for management
export function useAllBoardStatuses(boardId: string | null) {
  return useQuery({
    queryKey: ["board-statuses-all", boardId],
    queryFn: async () => {
      if (!boardId) return [];

      const { data, error } = await supabase
        .from("board_statuses")
        .select(`
          id,
          board_id,
          status_id,
          position,
          is_active,
          created_at,
          adjustment_type,
          status:demand_statuses(id, name, color, is_system)
        `)
        .eq("board_id", boardId)
        .order("position");

      if (error) throw error;
      
      return (data || []).filter(d => d.status !== null).map(d => ({
        ...d,
        adjustment_type: (d.adjustment_type as AdjustmentType) || 'none'
      })) as BoardStatus[];
    },
    enabled: !!boardId,
  });
}

// Fetch all available system statuses
export function useAvailableStatuses() {
  return useQuery({
    queryKey: ["available-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_statuses")
        .select("id, name, color")
        .eq("is_system", true)
        .neq("name", "Atrasado")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });
}

// Toggle board status active state
export function useToggleBoardStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      boardStatusId, 
      isActive,
      boardId 
    }: { 
      boardStatusId: string; 
      isActive: boolean;
      boardId: string;
    }) => {
      const { data, error } = await supabase
        .from("board_statuses")
        .update({ is_active: isActive })
        .eq("id", boardStatusId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["board-statuses", variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ["board-statuses-all", variables.boardId] });
    },
  });
}

// Update board status positions - optimized for swapping 2 items
export function useUpdateBoardStatusPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      swapPair,
      boardId 
    }: { 
      swapPair: { 
        fromId: string; 
        fromPosition: number; 
        toId: string; 
        toPosition: number 
      };
      boardId: string;
    }) => {
      // Use Promise.all to update both items simultaneously
      const [result1, result2] = await Promise.all([
        supabase
          .from("board_statuses")
          .update({ position: swapPair.toPosition })
          .eq("id", swapPair.fromId),
        supabase
          .from("board_statuses")
          .update({ position: swapPair.fromPosition })
          .eq("id", swapPair.toId),
      ]);

      if (result1.error) throw result1.error;
      if (result2.error) throw result2.error;
      
      return true;
    },
    onSuccess: (_, variables) => {
      // Use refetchQueries to immediately refetch, not just invalidate
      queryClient.refetchQueries({ queryKey: ["board-statuses", variables.boardId] });
      queryClient.refetchQueries({ queryKey: ["board-statuses-all", variables.boardId] });
    },
  });
}

// Add a status to the board
export function useAddBoardStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      boardId, 
      statusId,
      position 
    }: { 
      boardId: string; 
      statusId: string;
      position: number;
    }) => {
      const { data, error } = await supabase
        .from("board_statuses")
        .upsert({
          board_id: boardId,
          status_id: statusId,
          position,
          is_active: true,
        }, {
          onConflict: 'board_id,status_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["board-statuses", variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ["board-statuses-all", variables.boardId] });
    },
  });
}

// Delete a status from the board (and the custom status itself if it belongs to this board)
export function useDeleteBoardStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      boardStatusId, 
      boardId,
      statusId,
    }: { 
      boardStatusId: string; 
      boardId: string;
      statusId: string;
    }) => {
      // 1. First, remove from board_statuses
      const { error: boardError } = await supabase
        .from("board_statuses")
        .delete()
        .eq("id", boardStatusId);

      if (boardError) throw boardError;

      // 2. Check if this is a custom status that belongs to this board
      const { data: statusData } = await supabase
        .from("demand_statuses")
        .select("is_system, board_id")
        .eq("id", statusId)
        .single();

      // 3. If it's a custom status and belongs to this board, delete it from demand_statuses too
      if (statusData && !statusData.is_system && statusData.board_id === boardId) {
        const { error: statusError } = await supabase
          .from("demand_statuses")
          .delete()
          .eq("id", statusId);

        if (statusError) throw statusError;
      }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["board-statuses", variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ["board-statuses-all", variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ["available-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["demand-statuses"] });
    },
  });
}

// Check demand count for a status in a board
export function useDemandCountByStatus(boardId: string | null, statusId: string | null) {
  return useQuery({
    queryKey: ["demand-count-status", boardId, statusId],
    queryFn: async () => {
      if (!boardId || !statusId) return 0;
      
      const { count, error } = await supabase
        .from("demands")
        .select("id", { count: "exact", head: true })
        .eq("board_id", boardId)
        .eq("status_id", statusId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!boardId && !!statusId,
  });
}

// Create a custom status and add it to the board
export function useCreateCustomStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      color, 
      boardId 
    }: { 
      name: string; 
      color: string;
      boardId: string;
    }) => {
      // 1. Create the status in demand_statuses (linked to the board)
      const { data: newStatus, error: statusError } = await supabase
        .from("demand_statuses")
        .insert({ name, color, is_system: false, board_id: boardId })
        .select()
        .single();

      if (statusError) throw statusError;

      // 2. Get current max position
      const { data: existing } = await supabase
        .from("board_statuses")
        .select("position")
        .eq("board_id", boardId)
        .order("position", { ascending: false })
        .limit(1);

      const maxPos = existing?.[0]?.position ?? -1;

      // 3. Add to board_statuses
      const { error: boardError } = await supabase
        .from("board_statuses")
        .insert({
          board_id: boardId,
          status_id: newStatus.id,
          position: maxPos + 1,
          is_active: true,
        });

      if (boardError) throw boardError;

      return newStatus;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["board-statuses", variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ["board-statuses-all", variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ["available-statuses"] });
    },
  });
}

// Sort board statuses ensuring fixed boundaries are at start/end
function sortWithFixedBoundaries(statuses: BoardStatus[]): BoardStatus[] {
  return [...statuses].sort((a, b) => {
    const aIsStart = a.status.name === FIXED_START_STATUS;
    const bIsStart = b.status.name === FIXED_START_STATUS;
    const aIsEnd = a.status.name === FIXED_END_STATUS;
    const bIsEnd = b.status.name === FIXED_END_STATUS;
    
    if (aIsStart) return -1;
    if (bIsStart) return 1;
    if (aIsEnd) return 1;
    if (bIsEnd) return -1;
    return a.position - b.position;
  });
}

// Convert board statuses to kanban columns
export function useKanbanColumns(boardId: string | null) {
  const { data: boardStatuses, isLoading, error } = useBoardStatuses(boardId);

  const sortedStatuses = boardStatuses ? sortWithFixedBoundaries(boardStatuses) : [];
  
  const columns = sortedStatuses.length > 0
    ? sortedStatuses.map(boardStatusToColumn)
    : DEFAULT_COLUMNS;

  return {
    columns,
    isLoading,
    error,
    hasCustomStatuses: (boardStatuses?.length || 0) > 0,
  };
}
