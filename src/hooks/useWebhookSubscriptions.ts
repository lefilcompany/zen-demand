import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedTeam } from "@/contexts/TeamContext";
import { toast } from "sonner";

export const WEBHOOK_EVENTS = [
  { value: "demand.created", label: "Demanda criada" },
  { value: "demand.status_changed", label: "Status alterado" },
  { value: "demand.updated", label: "Demanda atualizada" },
  { value: "demand.archived", label: "Demanda arquivada" },
] as const;

export function useWebhookSubscriptions() {
  const { selectedTeamId } = useSelectedTeam();

  return useQuery({
    queryKey: ["webhook-subscriptions", selectedTeamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_subscriptions")
        .select("*")
        .eq("team_id", selectedTeamId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });
}

function generateSecret(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return "whsec_" + Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { selectedTeamId } = useSelectedTeam();

  return useMutation({
    mutationFn: async ({ url, events }: { url: string; events: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const secret = generateSecret();

      const { data, error } = await supabase
        .from("webhook_subscriptions")
        .insert({
          team_id: selectedTeamId!,
          url,
          events,
          secret,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, secret }; // Return secret to show once
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-subscriptions"] });
      toast.success("Webhook criado com sucesso");
    },
    onError: (err: Error) => {
      toast.error("Erro ao criar webhook: " + err.message);
    },
  });
}

export function useToggleWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("webhook_subscriptions")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-subscriptions"] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_subscriptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-subscriptions"] });
      toast.success("Webhook removido");
    },
  });
}

export function useWebhookLogs(subscriptionId?: string) {
  return useQuery({
    queryKey: ["webhook-logs", subscriptionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .eq("subscription_id", subscriptionId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!subscriptionId,
  });
}
