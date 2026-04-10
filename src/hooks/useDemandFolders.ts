import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DemandFolder {
  id: string;
  name: string;
  color: string;
  team_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export function useDemandFolders(teamId: string | null) {
  return useQuery({
    queryKey: ["demand-folders", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("demand_folders")
        .select("*, demand_folder_items(id)")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((f: any) => ({
        ...f,
        item_count: f.demand_folder_items?.length || 0,
        demand_folder_items: undefined,
      })) as DemandFolder[];
    },
    enabled: !!teamId,
  });
}

export function useFolderDemandIds(folderId: string | null) {
  return useQuery({
    queryKey: ["folder-demand-ids", folderId],
    queryFn: async () => {
      if (!folderId) return [];
      const { data, error } = await supabase
        .from("demand_folder_items")
        .select("demand_id")
        .eq("folder_id", folderId);
      if (error) throw error;
      return (data || []).map((d: any) => d.demand_id as string);
    },
    enabled: !!folderId,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; color: string; team_id: string; created_by: string }) => {
      const { data, error } = await supabase
        .from("demand_folders")
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      toast.success("Pasta criada com sucesso");
    },
    onError: () => toast.error("Erro ao criar pasta"),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; color?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("demand_folders")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      toast.success("Pasta atualizada");
    },
    onError: () => toast.error("Erro ao atualizar pasta"),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from("demand_folders")
        .delete()
        .eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      toast.success("Pasta excluída");
    },
    onError: () => toast.error("Erro ao excluir pasta"),
  });
}

export function useAddDemandToFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folder_id: string; demand_id: string }) => {
      const { error } = await supabase
        .from("demand_folder_items")
        .insert(params);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      qc.invalidateQueries({ queryKey: ["folder-demand-ids", vars.folder_id] });
    },
    onError: () => toast.error("Erro ao adicionar demanda à pasta"),
  });
}

export function useRemoveDemandFromFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folder_id: string; demand_id: string }) => {
      const { error } = await supabase
        .from("demand_folder_items")
        .delete()
        .eq("folder_id", params.folder_id)
        .eq("demand_id", params.demand_id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      qc.invalidateQueries({ queryKey: ["folder-demand-ids", vars.folder_id] });
    },
    onError: () => toast.error("Erro ao remover demanda da pasta"),
  });
}
