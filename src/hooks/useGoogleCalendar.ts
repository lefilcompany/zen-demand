import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    if (!user?.id) {
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("google_calendar_tokens")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsConnected(!!data && !error);
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connectGoogleCalendar = async () => {
    if (!user?.id) {
      toast.error("Você precisa estar logado");
      return;
    }

    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/settings/gcal-callback`;

      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: {
          action: "authorize",
          userId: user.id,
          redirectUri,
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Store userId for callback
        sessionStorage.setItem("gcal_user_id", user.id);
        sessionStorage.setItem("gcal_redirect_uri", redirectUri);
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error("Error connecting Google Calendar:", error);
      toast.error("Erro ao conectar Google Calendar");
      setIsLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("google_calendar_tokens")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setIsConnected(false);
      toast.success("Google Calendar desconectado");
    } catch (error: any) {
      console.error("Error disconnecting:", error);
      toast.error("Erro ao desconectar Google Calendar");
    }
  };

  const getValidAccessToken = async (): Promise<string | null> => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from("google_calendar_tokens")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return null;

    // Check if token expires in less than 5 minutes
    const expiresAt = new Date(data.token_expires_at).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt - now > fiveMinutes) {
      return data.access_token;
    }

    // Refresh the token
    try {
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke(
        "google-calendar-auth",
        {
          body: {
            action: "refresh",
            refreshToken: data.refresh_token,
            userId: user.id,
          },
        }
      );

      if (refreshError || !refreshData?.access_token) {
        console.error("Failed to refresh token:", refreshError);
        return null;
      }

      return refreshData.access_token;
    } catch {
      return null;
    }
  };

  const createCalendarEvent = async (params: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    attendeeEmails?: string[];
  }) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      toast.error("Precisa conectar o seu Google Calendar nas configurações antes de agendar uma reunião");
      return null;
    }

    const { data, error } = await supabase.functions.invoke("create-calendar-event", {
      body: {
        ...params,
        googleAccessToken: accessToken,
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
    disconnectGoogleCalendar,
    createCalendarEvent,
    getValidAccessToken,
    checkConnection,
  };
}
