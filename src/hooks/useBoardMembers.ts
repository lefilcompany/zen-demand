import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  added_by: string | null;
  joined_at: string;
  teamRole: "admin" | "moderator" | "executor" | "requester";
  profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// Fetch board members with team role
export function useBoardMembers(boardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["board-members", boardId],
    queryFn: async () => {
      if (!boardId) return [];

      // First get board members
      const { data: boardData, error: boardError } = await supabase
        .from("board_members")
        .select(`
          id,
          board_id,
          user_id,
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

      if (boardError) throw boardError;

      // Get the board's team_id
      const { data: boardInfo, error: boardInfoError } = await supabase
        .from("boards")
        .select("team_id")
        .eq("id", boardId)
        .single();

      if (boardInfoError) throw boardInfoError;

      // Get team members to fetch their roles
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("user_id, role")
        .eq("team_id", boardInfo.team_id);

      if (teamError) throw teamError;

      // Create a map of user_id -> team role
      const teamRoleMap = new Map<string, string>();
      teamMembers?.forEach((tm) => {
        teamRoleMap.set(tm.user_id, tm.role);
      });

      return boardData.map((member: any) => ({
        id: member.id,
        board_id: member.board_id,
        user_id: member.user_id,
        added_by: member.added_by,
        joined_at: member.joined_at,
        teamRole: teamRoleMap.get(member.user_id) || "requester",
        profile: member.profiles,
      })) as BoardMember[];
    },
    enabled: !!user && !!boardId,
  });
}

// Get user's role in a board (fetched from team_members)
export function useBoardRole(boardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["board-role", boardId, user?.id],
    queryFn: async () => {
      if (!boardId || !user) return null;

      // Get the board's team_id
      const { data: boardInfo, error: boardInfoError } = await supabase
        .from("boards")
        .select("team_id")
        .eq("id", boardId)
        .single();

      if (boardInfoError) throw boardInfoError;

      // Get user's team role
      const { data, error } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", boardInfo.team_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.role as BoardMember["teamRole"] | null;
    },
    enabled: !!user && !!boardId,
  });
}

// Add member to board (inherits role from team)
export function useAddBoardMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      boardId,
      userId,
      addedBy,
    }: {
      boardId: string;
      userId: string;
      addedBy: string;
    }) => {
      const { data, error } = await supabase
        .from("board_members")
        .insert({
          board_id: boardId,
          user_id: userId,
          added_by: addedBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["board-members", data.board_id] });
      queryClient.invalidateQueries({ queryKey: ["available-team-members"] });
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
      queryClient.invalidateQueries({ queryKey: ["available-team-members"] });
      toast.success("Membro removido do quadro!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover membro");
    },
  });
}

// Get team members not in board (for adding) - includes their team role
export function useAvailableTeamMembers(teamId: string | null, boardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["available-team-members", teamId, boardId],
    queryFn: async () => {
      if (!teamId || !boardId) return [];

      // Get team members with their roles
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select(`
          user_id,
          role,
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

      // Filter out users already in board and include their role
      return teamMembers
        .filter((tm: any) => !boardMemberIds.has(tm.user_id))
        .map((tm: any) => ({
          user_id: tm.user_id,
          teamRole: tm.role,
          ...tm.profiles,
        }));
    },
    enabled: !!user && !!teamId && !!boardId,
  });
}
