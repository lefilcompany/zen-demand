import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Attachment {
  id: string;
  demand_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function useAttachments(demandId: string | null) {
  return useQuery({
    queryKey: ["attachments", demandId],
    queryFn: async () => {
      if (!demandId) return [];
      const { data, error } = await supabase
        .from("demand_attachments")
        .select("*, profiles(full_name, avatar_url)")
        .eq("demand_id", demandId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!demandId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ demandId, file }: { demandId: string; file: File }) => {
      if (!user) throw new Error("User not authenticated");
      
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${demandId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("demand-attachments")
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data, error } = await supabase
        .from("demand_attachments")
        .insert({
          demand_id: demandId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", variables.demandId] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, demandId }: { id: string; filePath: string; demandId: string }) => {
      await supabase.storage.from("demand-attachments").remove([filePath]);
      
      const { error } = await supabase
        .from("demand_attachments")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { demandId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", data.demandId] });
    },
  });
}

export function getAttachmentUrl(filePath: string) {
  const { data } = supabase.storage.from("demand-attachments").getPublicUrl(filePath);
  return data.publicUrl;
}
