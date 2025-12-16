import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { z } from "zod";
import { validateData } from "@/lib/validations";

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

// Validation schemas
const BoardCreateSchema = z.object({
  team_id: z.string().uuid("ID da equipe inválido"),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres").optional().nullable(),
  monthly_demand_limit: z.number().int().min(0).optional().default(0),
});

const BoardUpdateSchema = z.object({
  id: z.string().uuid("ID do quadro inválido"),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  monthly_demand_limit: z.number().int().min(0).optional(),
});

export type BoardCreateInput = z.infer<typeof BoardCreateSchema>;
export type BoardUpdateInput = z.infer<typeof BoardUpdateSchema>;

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

      if (error) throw error;
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
        .single();

      if (error) throw error;
      return data as Board;
    },
    enabled: !!user && !!boardId,
  });
}

// Create a new board
export function useCreateBoard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: BoardCreateInput) => {
      if (!user) throw new Error("Usuário não autenticado");

      const validated = validateData(BoardCreateSchema, input);

      const { data, error } = await supabase
        .from("boards")
        .insert({
          team_id: validated.team_id,
          name: validated.name,
          description: validated.description,
          monthly_demand_limit: validated.monthly_demand_limit || 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Board;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boards", data.team_id] });
      toast.success("Quadro criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar quadro");
    },
  });
}

// Update a board
export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BoardUpdateInput) => {
      const validated = validateData(BoardUpdateSchema, input);

      const { data, error } = await supabase
        .from("boards")
        .update({
          name: validated.name,
          description: validated.description,
          monthly_demand_limit: validated.monthly_demand_limit,
        })
        .eq("id", validated.id)
        .select()
        .single();

      if (error) throw error;
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

      if (error) throw error;
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
