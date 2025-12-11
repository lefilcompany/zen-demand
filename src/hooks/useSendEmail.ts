import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  from?: string;
  // For template-based emails
  template?: 'notification';
  templateData?: {
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    userName?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  };
}

export function useSendEmail() {
  return useMutation({
    mutationFn: async ({ to, subject, html, from, template, templateData }: SendEmailParams) => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { to, subject, html, from, template, templateData },
      });

      if (error) throw error;
      return data;
    },
  });
}
