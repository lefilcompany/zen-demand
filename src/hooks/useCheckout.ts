import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateCheckoutParams {
  planSlug: string;
  teamId: string;
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({ planSlug, teamId }: CreateCheckoutParams) => {
      console.log("[useCheckout] Starting checkout", { planSlug, teamId });

      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.access_token) {
        throw new Error("Você precisa estar logado para assinar um plano");
      }

      const successUrl = `${window.location.origin}/subscription/success`;
      const cancelUrl = `${window.location.origin}/get-started`;

      console.log("[useCheckout] Invoking create-checkout function");

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          planSlug,
          teamId,
          successUrl,
          cancelUrl,
        },
      });

      console.log("[useCheckout] Response received", { data, error: error?.message });

      if (error) {
        // Try to extract a meaningful error message
        const message = error.message || "Falha ao criar sessão de pagamento";
        console.error("[useCheckout] Function error:", message);
        throw new Error(message);
      }

      // Handle case where data might be a string (edge function returned non-JSON)
      let parsedData = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch {
          console.error("[useCheckout] Failed to parse response as JSON:", data);
          throw new Error("Resposta inválida do servidor");
        }
      }

      const url = parsedData?.url;
      
      if (!url) {
        console.error("[useCheckout] No checkout URL in response:", parsedData);
        throw new Error("URL de pagamento não retornada pelo servidor");
      }

      console.log("[useCheckout] Checkout URL received successfully");
      return url as string;
    },
  });
}
