import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export function useSendEmail() {
  return useMutation({
    mutationFn: async ({ to, subject, html, from }: SendEmailParams) => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { to, subject, html, from },
      });

      if (error) throw error;
      return data;
    },
  });
}
