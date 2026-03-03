import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkConnection = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsConnected(!!session?.provider_token);
  }, []);

  useEffect(() => {
    checkConnection();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkConnection();
    });
    return () => subscription.unsubscribe();
  }, [checkConnection]);

  const connectGoogleCalendar = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/calendar.events",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          redirectTo: window.location.origin + "/settings",
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Error connecting Google Calendar:", error);
      toast.error("Erro ao conectar Google Calendar");
      setIsLoading(false);
    }
  };

  const getProviderToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_token || null;
  };

  const createCalendarEvent = async (params: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    attendeeEmails?: string[];
  }) => {
    const providerToken = await getProviderToken();
    if (!providerToken) {
      toast.error("Precisa conectar o seu Google Calendar nas configurações antes de agendar uma reunião");
      return null;
    }

    const { data, error } = await supabase.functions.invoke("create-calendar-event", {
      body: {
        ...params,
        googleAccessToken: providerToken,
      },
    });

    if (error) {
      console.error("Error creating calendar event:", error);
      toast.error("Erro ao criar evento no Google Calendar");
      return null;
    }

    return data as { eventId: string; meetLink: string | null; htmlLink: string };
  };

  return {
    isConnected,
    isLoading,
    connectGoogleCalendar,
    createCalendarEvent,
    getProviderToken,
  };
}
