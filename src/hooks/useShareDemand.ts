import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Type for share token
interface ShareToken {
  id: string;
  demand_id: string;
  token: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

// Generate a random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function useShareToken(demandId: string | null) {
  return useQuery({
    queryKey: ["share-token", demandId],
    queryFn: async () => {
      if (!demandId) return null;
      
      const result = await supabase
        .from("demand_share_tokens" as any)
        .select("*")
        .eq("demand_id", demandId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (result.error) throw result.error;
      return result.data as unknown as ShareToken | null;
    },
    enabled: !!demandId,
  });
}

export function useCreateShareToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ demandId, userId, expiresAt }: { demandId: string; userId: string; expiresAt?: string | null }) => {
      const token = generateToken();
      
      const result = await supabase
        .from("demand_share_tokens" as any)
        .insert({
          demand_id: demandId,
          token,
          created_by: userId,
          expires_at: expiresAt || null,
        })
        .select()
        .single();

      if (result.error) throw result.error;
      return result.data as unknown as ShareToken;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["share-token", variables.demandId] });
    },
  });
}

export function useRevokeShareToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      const result = await supabase
        .from("demand_share_tokens" as any)
        .update({ is_active: false })
        .eq("id", tokenId);

      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-token"] });
    },
  });
}

// Hook for public access - gets demand by share token
export function useSharedDemand(token: string | null) {
  return useQuery({
    queryKey: ["shared-demand", token],
    queryFn: async () => {
      if (!token) return null;

      // First verify the token is valid
      const tokenResult = await supabase
        .from("demand_share_tokens" as any)
        .select("demand_id")
        .eq("token", token)
        .eq("is_active", true)
        .maybeSingle();

      const tokenData = tokenResult.data as unknown as { demand_id: string } | null;
      
      if (tokenResult.error || !tokenData) {
        throw new Error("Link de compartilhamento inválido ou expirado");
      }

      // Then fetch the demand with related data
      const { data: demand, error: demandError } = await supabase
        .from("demands")
        .select(`
          *,
          demand_statuses(name, color),
          profiles!demands_created_by_fkey(full_name, avatar_url),
          teams(name),
          services(id, name),
          demand_assignees(
            user_id,
            profile:profiles(full_name, avatar_url)
          )
        `)
        .eq("id", tokenData.demand_id)
        .single();

      if (demandError) throw demandError;
      return demand;
    },
    enabled: !!token,
  });
}

// Hook for public access - gets interactions by share token
export function useSharedDemandInteractions(token: string | null, demandId: string | null) {
  return useQuery({
    queryKey: ["shared-demand-interactions", token, demandId],
    queryFn: async () => {
      if (!token || !demandId) return [];

      const { data, error } = await supabase
        .from("demand_interactions")
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .eq("demand_id", demandId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!token && !!demandId,
  });
}

// Hook for public access - gets attachments by share token
export function useSharedDemandAttachments(token: string | null, demandId: string | null) {
  return useQuery({
    queryKey: ["shared-demand-attachments", token, demandId],
    queryFn: async () => {
      if (!token || !demandId) return [];

      const { data, error } = await supabase
        .from("demand_attachments")
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .eq("demand_id", demandId)
        .is("interaction_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!token && !!demandId,
  });
}
