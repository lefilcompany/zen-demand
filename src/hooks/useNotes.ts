import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { toast } from "sonner";

export interface Note {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  content: string | null;
  icon: string;
  cover_url: string | null;
  is_public: boolean;
  archived: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export function useNotes() {
  const { selectedTeamId } = useSelectedTeam();

  return useQuery({
    queryKey: ["notes", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];

      const { data, error } = await supabase
        .from("notes")
        .select(`
          *,
          profiles:created_by (id, full_name, avatar_url)
        `)
        .eq("team_id", selectedTeamId)
        .eq("archived", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Note[];
    },
    enabled: !!selectedTeamId,
  });
}

export function useNote(noteId: string | null) {
  return useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      if (!noteId) return null;

      const { data, error } = await supabase
        .from("notes")
        .select(`
          *,
          profiles:created_by (id, full_name, avatar_url)
        `)
        .eq("id", noteId)
        .single();

      if (error) throw error;
      return data as Note;
    },
    enabled: !!noteId,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedTeamId } = useSelectedTeam();

  return useMutation({
    mutationFn: async (data: { title?: string; content?: string; icon?: string; parent_id?: string }) => {
      if (!user || !selectedTeamId) throw new Error("Usuário ou equipe não encontrado");

      const { data: note, error } = await supabase
        .from("notes")
        .insert({
          team_id: selectedTeamId,
          created_by: user.id,
          title: data.title || "Sem título",
          content: data.content || "",
          icon: data.icon || "📝",
          parent_id: data.parent_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar nota: " + error.message);
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, ...data }: { 
      noteId: string; 
      title?: string; 
      content?: string; 
      icon?: string;
      cover_url?: string | null;
      archived?: boolean;
    }) => {
      const { data: note, error } = await supabase
        .from("notes")
        .update(data)
        .eq("id", noteId)
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", variables.noteId] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar nota: " + error.message);
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Nota excluída");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir nota: " + error.message);
    },
  });
}
