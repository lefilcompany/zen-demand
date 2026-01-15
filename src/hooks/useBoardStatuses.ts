import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface BoardStatus {
  id: string;
  board_id: string;
  status_id: string;
  position: number;
  is_active: boolean;
  created_at: string;
  status: {
    id: string;
    name: string;
    color: string;
  };
}

export interface KanbanColumn {
  key: string;
  label: string;
  color: string;
  shortLabel: string;
  statusId: string;
}

// Default columns fallback (matches current static columns)
export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { key: "A Iniciar", label: "A Iniciar", color: "bg-muted", shortLabel: "Iniciar", statusId: "" },
  { key: "Fazendo", label: "Fazendo", color: "bg-blue-500/10", shortLabel: "Fazendo", statusId: "" },
  { key: "Em Ajuste", label: "Em Ajuste", color: "bg-purple-500/10", shortLabel: "Ajuste", statusId: "" },
  { key: "Aprovação do Cliente", label: "Aprovação do Cliente", color: "bg-amber-500/10", shortLabel: "Aprovação", statusId: "" },
  { key: "Entregue", label: "Entregue", color: "bg-emerald-500/10", shortLabel: "Entregue", statusId: "" },
];

// Map status names to colors
const statusColorMap: Record<string, string> = {
  "A Iniciar": "bg-muted",
  "Fazendo": "bg-blue-500/10",
  "Em Ajuste": "bg-purple-500/10",
  "Aprovação do Cliente": "bg-amber-500/10",
  "Entregue": "bg-emerald-500/10",
};

// Map status names to short labels
const statusShortLabelMap: Record<string, string> = {
  "A Iniciar": "Iniciar",
  "Fazendo": "Fazendo",
  "Em Ajuste": "Ajuste",
  "Aprovação do Cliente": "Aprovação",
  "Entregue": "Entregue",
};

// Get color class based on status name
export function getStatusColor(statusName: string): string {
  return statusColorMap[statusName] || "bg-muted";
}

// Get short label based on status name
export function getShortLabel(statusName: string): string {
  return statusShortLabelMap[statusName] || statusName.split(" ")[0];
}

// Convert BoardStatus to KanbanColumn
export function boardStatusToColumn(boardStatus: BoardStatus): KanbanColumn {
  return {
    key: boardStatus.status.name,
    label: boardStatus.status.name,
    color: getStatusColor(boardStatus.status.name),
    shortLabel: getShortLabel(boardStatus.status.name),
    statusId: boardStatus.status.id,
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
          status:demand_statuses(id, name, color)
        `)
        .eq("board_id", boardId)
        .eq("is_active", true)
        .order("position");

      if (error) throw error;
      
      // Filter out any null statuses and type cast
      return (data || []).filter(d => d.status !== null) as BoardStatus[];
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
          status:demand_statuses(id, name, color)
        `)
        .eq("board_id", boardId)
        .order("position");

      if (error) throw error;
      
      return (data || []).filter(d => d.status !== null) as BoardStatus[];
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

// Update board status positions
export function useUpdateBoardStatusPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      updates,
      boardId 
    }: { 
      updates: { id: string; position: number }[];
      boardId: string;
    }) => {
      // Update each position
      for (const update of updates) {
        const { error } = await supabase
          .from("board_statuses")
          .update({ position: update.position })
          .eq("id", update.id);

        if (error) throw error;
      }
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["board-statuses", variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ["board-statuses-all", variables.boardId] });
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

// Convert board statuses to kanban columns
export function useKanbanColumns(boardId: string | null) {
  const { data: boardStatuses, isLoading, error } = useBoardStatuses(boardId);

  const columns = boardStatuses && boardStatuses.length > 0
    ? boardStatuses.map(boardStatusToColumn)
    : DEFAULT_COLUMNS;

  return {
    columns,
    isLoading,
    error,
    hasCustomStatuses: (boardStatuses?.length || 0) > 0,
  };
}
