import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { toast } from "sonner";

export function useApiKeys() {
  const { selectedTeamId } = useSelectedTeam();

  return useQuery({
    queryKey: ["api-keys", selectedTeamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("team_id", selectedTeamId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });
}

async function generateApiKey(): Promise<{ raw: string; hash: string; prefix: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const raw = "sk_live_" + Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
  const prefix = raw.substring(0, 12);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  return { raw, hash, prefix };
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  const { selectedTeamId } = useSelectedTeam();

  return useMutation({
    mutationFn: async ({ name, permissions }: { name: string; permissions: Record<string, boolean> }) => {
      const { raw, hash, prefix } = await generateApiKey();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("api_keys").insert({
        team_id: selectedTeamId!,
        name,
        key_hash: hash,
        key_prefix: prefix,
        permissions,
        created_by: user!.id,
      });

      if (error) throw error;
      return raw; // Return the raw key to show to user once
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao criar API key: " + err.message);
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", keyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revogada com sucesso");
    },
  });
}

export function useApiLogs(keyId?: string) {
  return useQuery({
    queryKey: ["api-logs", keyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_logs")
        .select("*")
        .eq("api_key_id", keyId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!keyId,
  });
}
