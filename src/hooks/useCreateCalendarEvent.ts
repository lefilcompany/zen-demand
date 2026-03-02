import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateCalendarEventInput {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendeeEmails: string[];
  googleAccessToken: string;
}

interface CalendarEventResult {
  eventId: string;
  eventLink: string;
  meetLink: string | null;
}

export function useCreateCalendarEvent() {
  return useMutation({
    mutationFn: async (input: CreateCalendarEventInput): Promise<CalendarEventResult> => {
      const { data, error } = await supabase.functions.invoke("create-calendar-event", {
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as CalendarEventResult;
    },
  });
}
