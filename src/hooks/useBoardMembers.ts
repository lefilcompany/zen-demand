import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: "admin" | "moderator" | "executor" | "requester";
  added_by: string | null;
  joined_at: string;
  profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Fetch board members
export function useBoardMembers(boardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["board-members", boardId],
    queryFn: async () => {
      if (!boardId) return [];

      const { data, error } = await supabase
        .from("board_members")
        .select(`
          id,
          board_id,
          user_id,
          role,
          added_by,
          joined_at,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("board_id", boardId)
        .order("joined_at", { ascending: true });

      if (error) throw error;

      return data.map((member: any) => ({
        ...member,
        profile: member.profiles,
      })) as BoardMember[];
    },
    enabled: !!user && !!boardId,
  });
}

// Get user's role in a board
export function useBoardRole(boardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["board-role", boardId, user?.id],
    queryFn: async () => {
      if (!boardId || !user) return null;

      const { data, error } = await supabase
        .from("board_members")
        .select("role")
        .eq("board_id", boardId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.role as BoardMember["role"] | null;
    },
    enabled: !!user && !!boardId,
  });
}

// Add member to board
export function useAddBoardMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      boardId,
      userId,
      role,
      addedBy,
    }: {
      boardId: string;
      userId: string;
      role: BoardMember["role"];
      addedBy: string;
    }) => {
      const { data, error } = await supabase
        .from("board_members")
        .insert({
          board_id: boardId,
          user_id: userId,
          role,
          added_by: addedBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["board-members", data.board_id] });
      toast.success("Membro adicionado ao quadro!");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Este membro já está no quadro");
      } else {
        toast.error(error.message || "Erro ao adicionar membro");
      }
    },
  });
}

// Update member role
export function useUpdateBoardMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      boardId,
      role,
    }: {
      memberId: string;
      boardId: string;
      role: BoardMember["role"];
    }) => {
      const { data, error } = await supabase
        .from("board_members")
        .update({ role })
        .eq("id", memberId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, boardId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["board-members", data.boardId] });
      queryClient.invalidateQueries({ queryKey: ["board-role", data.boardId] });
      toast.success("Cargo atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar cargo");
    },
  });
}

// Remove member from board
export function useRemoveBoardMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      boardId,
    }: {
      memberId: string;
      boardId: string;
    }) => {
      const { error } = await supabase
        .from("board_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      return { memberId, boardId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["board-members", data.boardId] });
      toast.success("Membro removido do quadro!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover membro");
    },
  });
}

// Get team members not in board (for adding)
export function useAvailableTeamMembers(teamId: string | null, boardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["available-team-members", teamId, boardId],
    queryFn: async () => {
      if (!teamId || !boardId) return [];

      // Get team members
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("team_id", teamId);

      if (teamError) throw teamError;

      // Get board members
      const { data: boardMembers, error: boardError } = await supabase
        .from("board_members")
        .select("user_id")
        .eq("board_id", boardId);

      if (boardError) throw boardError;

      const boardMemberIds = new Set(boardMembers?.map((m) => m.user_id) || []);

      // Filter out users already in board
      return teamMembers
        .filter((tm: any) => !boardMemberIds.has(tm.user_id))
        .map((tm: any) => ({
          user_id: tm.user_id,
          ...tm.profiles,
        }));
    },
    enabled: !!user && !!teamId && !!boardId,
  });
}
