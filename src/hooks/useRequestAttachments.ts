import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RequestAttachment {
  id: string;
  demand_request_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export function useRequestAttachments(requestId: string | null) {
  return useQuery({
    queryKey: ["request-attachments", requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from("demand_request_attachments")
        .select("*")
        .eq("demand_request_id", requestId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as RequestAttachment[];
    },
    enabled: !!requestId,
  });
}

export function useUploadRequestAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      file,
    }: {
      requestId: string;
      file: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const ext = file.name.split(".").pop();
      const filePath = `request-${requestId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("demand-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error: dbError } = await supabase
        .from("demand_request_attachments")
        .insert({
          demand_request_id: requestId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: ["request-attachments", requestId] });
    },
  });
}

export function useDeleteRequestAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      filePath,
      requestId,
    }: {
      id: string;
      filePath: string;
      requestId: string;
    }) => {
      await supabase.storage.from("demand-attachments").remove([filePath]);
      const { error } = await supabase
        .from("demand_request_attachments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: ["request-attachments", requestId] });
    },
  });
}

export async function getRequestAttachmentUrl(filePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("demand-attachments")
    .createSignedUrl(filePath, 3600);
  return data?.signedUrl || null;
}
