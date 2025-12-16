import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface Board {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  monthly_demand_limit: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBoardData {
  team_id: string;
  name: string;
  description?: string | null;
  monthly_demand_limit?: number;
}

export interface UpdateBoardData {
  id: string;
  name?: string;
  description?: string | null;
  monthly_demand_limit?: number;
}

// Fetch boards for a team
export function useBoards(teamId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["boards", teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("team_id", teamId)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao buscar quadros:", error);
        throw error;
      }
      return data as Board[];
    },
    enabled: !!user && !!teamId,
  });
}

// Fetch a single board
export function useBoard(boardId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      if (!boardId) return null;

      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar quadro:", error);
        throw error;
      }
      return data as Board | null;
    },
    enabled: !!user && !!boardId,
  });
}

// Create a new board
export function useCreateBoard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBoardData): Promise<Board> => {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      if (!input.team_id) {
        throw new Error("Equipe não selecionada");
      }

      if (!input.name || input.name.trim().length === 0) {
        throw new Error("Nome do quadro é obrigatório");
      }

      const insertData = {
        team_id: input.team_id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        monthly_demand_limit: input.monthly_demand_limit ?? 0,
        created_by: user.id,
      };

      console.log("Criando quadro com dados:", insertData);

      const { data, error } = await supabase
        .from("boards")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Erro Supabase ao criar quadro:", error);
        
        if (error.code === "42501") {
          throw new Error("Você não tem permissão para criar quadros nesta equipe");
        }
        if (error.code === "23505") {
          throw new Error("Já existe um quadro com este nome");
        }
        throw new Error(error.message || "Erro ao criar quadro");
      }

      if (!data) {
        throw new Error("Quadro criado mas dados não retornados");
      }

      return data as Board;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boards", data.team_id] });
      toast.success("Quadro criado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Erro no mutation de criar quadro:", error);
      toast.error(error.message || "Erro ao criar quadro");
    },
  });
}

// Update a board
export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBoardData): Promise<Board> => {
      if (!input.id) {
        throw new Error("ID do quadro é obrigatório");
      }

      const updateData: Record<string, unknown> = {};
      
      if (input.name !== undefined) {
        updateData.name = input.name.trim();
      }
      if (input.description !== undefined) {
        updateData.description = input.description?.trim() || null;
      }
      if (input.monthly_demand_limit !== undefined) {
        updateData.monthly_demand_limit = input.monthly_demand_limit;
      }

      const { data, error } = await supabase
        .from("boards")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar quadro:", error);
        throw new Error(error.message || "Erro ao atualizar quadro");
      }

      return data as Board;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boards", data.team_id] });
      queryClient.invalidateQueries({ queryKey: ["board", data.id] });
      toast.success("Quadro atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar quadro");
    },
  });
}

// Delete a board
export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId, teamId }: { boardId: string; teamId: string }) => {
      const { error } = await supabase
        .from("boards")
        .delete()
        .eq("id", boardId);

      if (error) {
        console.error("Erro ao excluir quadro:", error);
        throw new Error(error.message || "Erro ao excluir quadro");
      }

      return { boardId, teamId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boards", data.teamId] });
      toast.success("Quadro excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao excluir quadro");
    },
  });
}
