import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateCheckoutParams {
  planSlug: string;
  teamId: string;
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({ planSlug, teamId }: CreateCheckoutParams) => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const successUrl = `${window.location.origin}/subscription/success`;
      const cancelUrl = `${window.location.origin}/pricing`;

      const response = await supabase.functions.invoke("create-checkout", {
        body: {
          planSlug,
          teamId,
          successUrl,
          cancelUrl,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create checkout");
      }

      const { url } = response.data;
      
      if (!url) {
        throw new Error("No checkout URL returned");
      }

      return url as string;
    },
  });
}
