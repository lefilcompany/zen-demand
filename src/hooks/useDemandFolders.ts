import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FolderPermission = "view" | "edit";

export interface DemandFolder {
  id: string;
  name: string;
  color: string;
  team_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
  is_owner?: boolean;
  shared_with?: { user_id: string; shared_at: string; permission: FolderPermission }[];
}

// NOTE: tables were renamed in the DB (demand_folders→projects, demand_folder_items→project_demands,
// demand_folder_shares→project_shares, folder_id→project_id). The hook keeps the legacy public
// API (`folder_id` arg names, "demand-folders" query keys) to avoid touching every caller — it just
// translates to the new schema internally.

export function useDemandFolders(teamId: string | null, userId?: string) {
  return useQuery({
    queryKey: ["demand-folders", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_demands(id), project_shares(user_id, shared_at, permission)")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((f: any) => ({
        ...f,
        item_count: f.project_demands?.length || 0,
        is_owner: f.created_by === userId,
        shared_with: (f.project_shares || []).map((s: any) => ({
          user_id: s.user_id,
          shared_at: s.shared_at,
          permission: (s.permission || "view") as FolderPermission,
        })),
        project_demands: undefined,
        project_shares: undefined,
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
        .from("project_demands")
        .select("demand_id")
        .eq("project_id", folderId);
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
        .from("projects")
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      toast.success("Projeto criado com sucesso");
    },
    onError: () => toast.error("Erro ao criar projeto"),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; color?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      toast.success("Projeto atualizado");
    },
    onError: () => toast.error("Erro ao atualizar projeto"),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      toast.success("Projeto excluído");
    },
    onError: () => toast.error("Erro ao excluir projeto"),
  });
}

export function useAddDemandToFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folder_id: string; demand_id: string }) => {
      const { error } = await supabase
        .from("project_demands")
        .insert({ project_id: params.folder_id, demand_id: params.demand_id });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      qc.invalidateQueries({ queryKey: ["folder-demand-ids", vars.folder_id] });
    },
    onError: () => toast.error("Erro ao adicionar demanda ao projeto"),
  });
}

export function useRemoveDemandFromFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folder_id: string; demand_id: string }) => {
      const { error } = await supabase
        .from("project_demands")
        .delete()
        .eq("project_id", params.folder_id)
        .eq("demand_id", params.demand_id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      qc.invalidateQueries({ queryKey: ["folder-demand-ids", vars.folder_id] });
    },
    onError: () => toast.error("Erro ao remover demanda do projeto"),
  });
}

// Sharing hooks
export function useShareFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folder_id: string; user_id: string; permission?: FolderPermission }) => {
      const { error } = await supabase
        .from("project_shares")
        .insert({
          project_id: params.folder_id,
          user_id: params.user_id,
          permission: params.permission || "view",
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      toast.success("Projeto compartilhado");
    },
    onError: () => toast.error("Erro ao compartilhar projeto"),
  });
}

export function useUpdateFolderSharePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folder_id: string; user_id: string; permission: FolderPermission }) => {
      const { error } = await supabase
        .from("project_shares")
        .update({ permission: params.permission } as any)
        .eq("project_id", params.folder_id)
        .eq("user_id", params.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      toast.success("Permissão atualizada");
    },
    onError: () => toast.error("Erro ao atualizar permissão"),
  });
}

export function useUnshareFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { folder_id: string; user_id: string }) => {
      const { error } = await supabase
        .from("project_shares")
        .delete()
        .eq("project_id", params.folder_id)
        .eq("user_id", params.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-folders"] });
      toast.success("Compartilhamento removido");
    },
    onError: () => toast.error("Erro ao remover compartilhamento"),
  });
}
